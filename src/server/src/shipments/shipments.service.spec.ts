import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ShipmentsService } from './shipments.service';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { Shipment } from '../orders/entities/shipment.entity';
import { Product } from '../products/entities/product.entity';

const ENV_KEYS = ['NODE_ENV', 'WX_TRADE_MODE', 'WX_MCHID'] as const;

function buildRepos(order: Order | null, product: Product | null) {
  const shipmentRepo = {
    findOne: jest.fn(),
    create: jest.fn((x: Partial<Shipment>) => x as Shipment),
    save: jest.fn(async (x: Shipment) => x),
    findAndCount: jest.fn(),
  };
  const orderRepo = {
    findOne: jest.fn(async () => order),
    save: jest.fn(async (x: Order) => x),
  };
  const productRepo = {
    findOne: jest.fn(async () => product),
  };
  return { shipmentRepo, orderRepo, productRepo };
}

const makeOrder = () =>
  ({
    id: 'order-id',
    orderNo: 'O-20260813-0001',
    productId: 'product-id',
    openid: 'openid-1',
    status: OrderStatus.ADDRESS_PENDING,
  }) as Order;

const makeProduct = () =>
  ({ id: 'product-id', name: '测试图书', aftersaleDays: 7 }) as Product;

describe('ShipmentsService', () => {
  let envBackup: Record<string, string | undefined>;
  let wxTradeService: { getMode: jest.Mock; uploadShippingInfo: jest.Mock };

  beforeEach(() => {
    envBackup = Object.fromEntries(
      ENV_KEYS.map((key) => [key, process.env[key]]),
    );
    ENV_KEYS.forEach((key) => delete process.env[key]);
    process.env.NODE_ENV = 'test';
    process.env.WX_MCHID = 'mchid';
    wxTradeService = {
      getMode: jest.fn().mockReturnValue('mock'),
      uploadShippingInfo: jest.fn().mockResolvedValue(undefined),
    };
  });

  afterEach(() => {
    ENV_KEYS.forEach((key) => {
      if (envBackup[key] === undefined) delete process.env[key];
      else process.env[key] = envBackup[key];
    });
  });

  function buildService(orderValue: Order | null, productValue: Product | null) {
    const repos = buildRepos(orderValue, productValue);
    const service = new ShipmentsService(
      repos.shipmentRepo as any,
      repos.orderRepo as any,
      repos.productRepo as any,
      wxTradeService as any,
    );
    return { service, ...repos };
  }

  it('creates shipment, moves order to aftersale_waiting and syncs to wx', async () => {
    const order = makeOrder();
    const { service } = buildService(order, makeProduct());

    const result = await service.create({
      orderId: 'order-id',
      company: '顺丰速运',
      companyId: 'SF',
      trackingNo: 'SF1234567890',
    });

    expect(order.status).toBe(OrderStatus.AFTERSALE_WAITING);
    expect(wxTradeService.uploadShippingInfo).toHaveBeenCalledWith(
      expect.objectContaining({
        outTradeNo: 'O-20260813-0001',
        openid: 'openid-1',
        trackingNo: 'SF1234567890',
        expressCompanyId: 'SF',
        itemDesc: '测试图书',
      }),
    );
    expect(result.wxSyncStatus).toBe('success');
    expect(result.wxSyncedAt).toBeInstanceOf(Date);
  });

  it('marks failed but does not throw when wx upload fails', async () => {
    wxTradeService.uploadShippingInfo.mockRejectedValue(
      new Error('微信交易接口返回 errcode=47001'),
    );
    const { service } = buildService(makeOrder(), makeProduct());

    const result = await service.create({
      orderId: 'order-id',
      company: '顺丰速运',
      companyId: 'SF',
      trackingNo: 'SF1234567890',
    });

    expect(result.wxSyncStatus).toBe('failed');
    expect(result.wxSyncError).toContain('errcode=47001');
  });

  it('skips wx sync when trade mode is disabled', async () => {
    wxTradeService.getMode.mockReturnValue('disabled');
    const { service } = buildService(makeOrder(), makeProduct());

    const result = await service.create({
      orderId: 'order-id',
      company: '顺丰速运',
      trackingNo: 'SF1234567890',
    });

    expect(result.wxSyncStatus).toBe('skipped');
    expect(wxTradeService.uploadShippingInfo).not.toHaveBeenCalled();
  });

  it('marks failed with clear message when companyId missing in real mode', async () => {
    wxTradeService.getMode.mockReturnValue('real');
    const { service } = buildService(makeOrder(), makeProduct());

    const result = await service.create({
      orderId: 'order-id',
      company: '自定义快递',
      trackingNo: 'ABC123',
    });

    expect(result.wxSyncStatus).toBe('failed');
    expect(result.wxSyncError).toContain('快递公司编码');
    expect(wxTradeService.uploadShippingInfo).not.toHaveBeenCalled();
  });

  it('retryWxSync uploads and marks success', async () => {
    const shipment = {
      id: 'shipment-id',
      orderId: 'order-id',
      trackingNo: 'SF1234567890',
      companyId: 'SF',
      wxSyncStatus: 'failed',
    } as Shipment;
    const { service, shipmentRepo } = buildService(makeOrder(), makeProduct());
    shipmentRepo.findOne.mockResolvedValue(shipment);

    const result = await service.retryWxSync('shipment-id');

    expect(wxTradeService.uploadShippingInfo).toHaveBeenCalled();
    expect(result.wxSyncStatus).toBe('success');
    expect(result.wxSyncError).toBeNull();
  });

  it('retryWxSync rejects already-synced shipment', async () => {
    const shipment = { id: 's1', wxSyncStatus: 'success' } as Shipment;
    const { service, shipmentRepo } = buildService(makeOrder(), makeProduct());
    shipmentRepo.findOne.mockResolvedValue(shipment);

    await expect(service.retryWxSync('s1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('retryWxSync reports failure and keeps failed status', async () => {
    wxTradeService.uploadShippingInfo.mockRejectedValue(new Error('网络超时'));
    const shipment = {
      id: 's1',
      orderId: 'order-id',
      trackingNo: 'SF1',
      companyId: 'SF',
      wxSyncStatus: 'failed',
    } as Shipment;
    const { service, shipmentRepo } = buildService(makeOrder(), makeProduct());
    shipmentRepo.findOne.mockResolvedValue(shipment);

    await expect(service.retryWxSync('s1')).rejects.toThrow('网络超时');
    expect(shipment.wxSyncStatus).toBe('failed');
    expect(shipment.wxSyncError).toContain('网络超时');
  });

  it('retryWxSync throws when shipment not found', async () => {
    const { service, shipmentRepo } = buildService(makeOrder(), makeProduct());
    shipmentRepo.findOne.mockResolvedValue(null);

    await expect(service.retryWxSync('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
