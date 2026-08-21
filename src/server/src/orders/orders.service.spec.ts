import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrdersService } from './orders.service';
import { Order, OrderStatus } from './entities/order.entity';
import { OrderAddress } from './entities/order-address.entity';
import { Product } from '../products/entities/product.entity';
import { Seller } from '../sellers/entities/seller.entity';
import { PaymentEvent } from '../payments/entities/payment-event.entity';
import { WxPayService } from '../payments/wx-pay.service';
import { SettlementService } from '../rewards/settlement.service';

const WX_ENV_KEYS = [
  'NODE_ENV',
  'WX_PAY_MODE',
  'WX_APPID',
  'WX_MCHID',
  'WX_PAY_SERIAL_NO',
  'WX_PAY_APIV3_KEY',
  'WX_PAY_PRIVATE_KEY',
  'WX_PAY_PUBLIC_KEY_ID',
  'WX_PAY_PUBLIC_KEY',
  'WX_PAY_NOTIFY_URL',
  'REWARD_ESTIMATE_ON_PAID_ENABLED',
] as const;

describe('OrdersService', () => {
  let service: OrdersService;
  let orderRepo: Repository<Order>;
  let paymentEventRepo: Repository<PaymentEvent>;
  let wxPayService: {
    createJsapiOrder: jest.Mock;
    queryByOutTradeNo: jest.Mock;
  };
  let envBackup: Record<string, string | undefined>;
  let settlementService: { estimatePaidOrder: jest.Mock };

  beforeEach(async () => {
    envBackup = Object.fromEntries(WX_ENV_KEYS.map((k) => [k, process.env[k]]));
    WX_ENV_KEYS.forEach((k) => delete process.env[k]);
    process.env.NODE_ENV = 'test';
    process.env.WX_PAY_MODE = 'mock';

    wxPayService = {
      createJsapiOrder: jest.fn(),
      queryByOutTradeNo: jest.fn(),
    };
    settlementService = {
      estimatePaidOrder: jest.fn().mockResolvedValue({
        estimatedCount: 0,
        skipped: true,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: getRepositoryToken(Order),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(OrderAddress),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(Product),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(Seller),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(PaymentEvent),
          useClass: Repository,
        },
        {
          provide: WxPayService,
          useValue: wxPayService,
        },
        {
          provide: SettlementService,
          useValue: settlementService,
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    orderRepo = module.get<Repository<Order>>(getRepositoryToken(Order));
    paymentEventRepo = module.get<Repository<PaymentEvent>>(
      getRepositoryToken(PaymentEvent),
    );
  });

  afterEach(() => {
    WX_ENV_KEYS.forEach((k) => {
      if (envBackup[k] === undefined) {
        delete process.env[k];
      } else {
        process.env[k] = envBackup[k];
      }
    });
  });

  it('should mark order as paid, set paidAt and wxTransactionId, and record payment event', async () => {
    const order = {
      id: 'order-id',
      orderNo: 'O-20260706-1234',
      status: OrderStatus.PENDING_PAYMENT,
      totalAmount: 200,
      paidAt: undefined,
      wxTransactionId: undefined,
    } as Order;

    jest.spyOn(orderRepo, 'findOne').mockResolvedValue(order);
    jest.spyOn(orderRepo, 'save').mockImplementation(async (o: any) => o);
    jest
      .spyOn(paymentEventRepo, 'create')
      .mockImplementation((dto: any) => dto as PaymentEvent);
    jest
      .spyOn(paymentEventRepo, 'save')
      .mockImplementation(async (dto: any) => dto);

    const result = (await service.payOrder('order-id')) as Order;

    expect(result.status).toBe(OrderStatus.PAID);
    expect(result.paidAt).toBeInstanceOf(Date);
    expect(result.wxTransactionId).toMatch(/^MOCK-O-20260706-1234-\d+$/);
    expect(orderRepo.save).toHaveBeenCalled();
    expect(paymentEventRepo.save).toHaveBeenCalled();
    expect(settlementService.estimatePaidOrder).toHaveBeenCalledWith(order.id);
  });

  it('should reject payment when order is not pending_payment', async () => {
    const order = {
      id: 'order-id',
      orderNo: 'O-20260706-1234',
      status: OrderStatus.PAID,
      totalAmount: 200,
    } as Order;

    jest.spyOn(orderRepo, 'findOne').mockResolvedValue(order);

    await expect(service.payOrder('order-id')).rejects.toThrow(
      '订单当前状态不允许支付',
    );
  });

  it('should reject payment when order does not exist', async () => {
    jest.spyOn(orderRepo, 'findOne').mockResolvedValue(null);

    await expect(service.payOrder('missing-id')).rejects.toThrow('订单不存在');
  });

  it('should return wx payment params without marking paid in complete real mode', async () => {
    process.env.WX_PAY_MODE = 'real';
    process.env.WX_APPID = 'wx-appid';
    process.env.WX_MCHID = 'mchid';
    process.env.WX_PAY_SERIAL_NO = 'serial';
    process.env.WX_PAY_APIV3_KEY = 'a'.repeat(32);
    process.env.WX_PAY_PRIVATE_KEY = 'pem';
    process.env.WX_PAY_PUBLIC_KEY_ID = 'pub-key-id';
    process.env.WX_PAY_PUBLIC_KEY = 'pem';
    process.env.WX_PAY_NOTIFY_URL = 'https://example.com/api/wx/notify';

    const order = {
      id: 'order-id',
      orderNo: 'O-20260706-1234',
      status: OrderStatus.PENDING_PAYMENT,
      totalAmount: 200,
    } as Order;

    jest.spyOn(orderRepo, 'findOne').mockResolvedValue(order);
    jest.spyOn(orderRepo, 'save');
    const paymentParams = {
      appId: 'wx-appid',
      timeStamp: '1720000000',
      nonceStr: 'nonce',
      package: 'prepay_id=wx-prepay',
      signType: 'RSA' as const,
      paySign: 'sign',
    };
    wxPayService.createJsapiOrder.mockResolvedValue(paymentParams);

    const result = await service.payOrder('order-id');

    expect(result).toEqual(paymentParams);
    expect(order.status).toBe(OrderStatus.PENDING_PAYMENT);
    expect(orderRepo.save).not.toHaveBeenCalled();
    expect(wxPayService.createJsapiOrder).toHaveBeenCalledWith(
      order,
      expect.any(String),
    );
  });

  it('should fail closed without explicit real or mock payment mode', async () => {
    delete process.env.WX_PAY_MODE;
    const order = {
      id: 'order-id',
      orderNo: 'O-20260706-1234',
      status: OrderStatus.PENDING_PAYMENT,
      totalAmount: 200,
    } as Order;

    jest.spyOn(orderRepo, 'findOne').mockResolvedValue(order);
    jest.spyOn(orderRepo, 'save');

    await expect(service.payOrder('order-id')).rejects.toThrow(
      '微信支付暂不可用',
    );
    expect(orderRepo.save).not.toHaveBeenCalled();
  });

  it('should reject mock payment in production without changing the order', async () => {
    process.env.NODE_ENV = 'production';
    process.env.WX_PAY_MODE = 'mock';
    const order = {
      id: 'order-id',
      orderNo: 'O-20260706-1234',
      status: OrderStatus.PENDING_PAYMENT,
      totalAmount: 200,
    } as Order;

    jest.spyOn(orderRepo, 'findOne').mockResolvedValue(order);
    jest.spyOn(orderRepo, 'save');

    await expect(service.payOrder('order-id')).rejects.toThrow(
      '微信支付暂不可用',
    );
    expect(order.status).toBe(OrderStatus.PENDING_PAYMENT);
    expect(orderRepo.save).not.toHaveBeenCalled();
  });

  it('should mark paid via syncPayment when wx side reports SUCCESS', async () => {
    process.env.WX_PAY_MODE = 'real';
    process.env.WX_APPID = 'wx-appid';
    process.env.WX_MCHID = 'mchid';
    process.env.WX_PAY_SERIAL_NO = 'serial';
    process.env.WX_PAY_APIV3_KEY = 'a'.repeat(32);
    process.env.WX_PAY_PRIVATE_KEY = 'pem';
    process.env.WX_PAY_PUBLIC_KEY_ID = 'pub-key-id';
    process.env.WX_PAY_PUBLIC_KEY = 'pem';
    process.env.WX_PAY_NOTIFY_URL = 'https://example.com/api/wx/notify';

    const order = {
      id: 'order-id',
      orderNo: 'O-20260706-1234',
      status: OrderStatus.PENDING_PAYMENT,
      totalAmount: 200,
    } as Order;

    jest.spyOn(orderRepo, 'findOne').mockResolvedValue(order);
    jest.spyOn(orderRepo, 'save').mockImplementation(async (o: any) => o);
    jest
      .spyOn(paymentEventRepo, 'create')
      .mockImplementation((dto: any) => dto as PaymentEvent);
    jest
      .spyOn(paymentEventRepo, 'save')
      .mockImplementation(async (dto: any) => dto);
    wxPayService.queryByOutTradeNo.mockResolvedValue({
      out_trade_no: order.orderNo,
      transaction_id: 'wx-tx-1',
      trade_state: 'SUCCESS',
      amount: { total: 200 },
    });

    const result = await service.syncPayment('order-id');

    expect(result.status).toBe(OrderStatus.PAID);
    expect(result.wxTransactionId).toBe('wx-tx-1');
    expect(wxPayService.queryByOutTradeNo).toHaveBeenCalledWith(order.orderNo);
  });

  it('should preserve address_pending when late payment sync confirms payment', async () => {
    process.env.WX_PAY_MODE = 'real';
    process.env.WX_APPID = 'wx-appid';
    process.env.WX_MCHID = 'mchid';
    process.env.WX_PAY_SERIAL_NO = 'serial';
    process.env.WX_PAY_APIV3_KEY = 'a'.repeat(32);
    process.env.WX_PAY_PRIVATE_KEY = 'pem';
    process.env.WX_PAY_PUBLIC_KEY_ID = 'pub-key-id';
    process.env.WX_PAY_PUBLIC_KEY = 'pem';
    process.env.WX_PAY_NOTIFY_URL = 'https://example.com/api/wx/notify';

    const order = {
      id: 'order-id',
      orderNo: 'O-20260706-1234',
      status: OrderStatus.ADDRESS_PENDING,
      totalAmount: 200,
      paidAt: undefined,
      wxTransactionId: undefined,
    } as Order;

    jest.spyOn(orderRepo, 'findOne').mockResolvedValue(order);
    jest.spyOn(orderRepo, 'save').mockImplementation(async (o: any) => o);
    jest
      .spyOn(paymentEventRepo, 'create')
      .mockImplementation((dto: any) => dto as PaymentEvent);
    jest
      .spyOn(paymentEventRepo, 'save')
      .mockImplementation(async (dto: any) => dto);
    wxPayService.queryByOutTradeNo.mockResolvedValue({
      out_trade_no: order.orderNo,
      transaction_id: 'wx-tx-late-sync',
      trade_state: 'SUCCESS',
      amount: { total: 200 },
    });

    const result = await service.syncPayment('order-id');

    expect(result.status).toBe(OrderStatus.ADDRESS_PENDING);
    expect(result.paidAt).toBeInstanceOf(Date);
    expect(result.wxTransactionId).toBe('wx-tx-late-sync');
    expect(paymentEventRepo.save).toHaveBeenCalledTimes(1);
  });

  it('should preserve address_pending when a late payment callback arrives', async () => {
    const order = {
      id: 'order-id',
      orderNo: 'O-20260706-1234',
      status: OrderStatus.ADDRESS_PENDING,
      totalAmount: 200,
      paidAt: undefined,
      wxTransactionId: undefined,
    } as Order;

    jest.spyOn(orderRepo, 'findOne').mockResolvedValue(order);
    jest.spyOn(orderRepo, 'save').mockImplementation(async (o: any) => o);
    jest
      .spyOn(paymentEventRepo, 'create')
      .mockImplementation((dto: any) => dto as PaymentEvent);
    jest
      .spyOn(paymentEventRepo, 'save')
      .mockImplementation(async (dto: any) => dto);

    await service.handleWxNotify(
      {
        out_trade_no: order.orderNo,
        transaction_id: 'wx-tx-late-notify',
        trade_state: 'SUCCESS',
        amount: { total: 200 },
      },
      '{"type":"late_notify"}',
    );

    expect(order.status).toBe(OrderStatus.ADDRESS_PENDING);
    expect(order.paidAt).toBeInstanceOf(Date);
    expect(order.wxTransactionId).toBe('wx-tx-late-notify');
    expect(paymentEventRepo.save).toHaveBeenCalledTimes(1);
  });

  it('should not write a duplicate payment event for an already confirmed order', async () => {
    const order = {
      id: 'order-id',
      orderNo: 'O-20260706-1234',
      status: OrderStatus.PAID,
      totalAmount: 200,
      paidAt: new Date(),
      wxTransactionId: 'wx-tx-existing',
    } as Order;

    jest.spyOn(orderRepo, 'findOne').mockResolvedValue(order);
    jest.spyOn(orderRepo, 'save');
    jest.spyOn(paymentEventRepo, 'save');

    await service.handleWxNotify(
      {
        out_trade_no: order.orderNo,
        transaction_id: 'wx-tx-existing',
        trade_state: 'SUCCESS',
        amount: { total: 200 },
      },
      '{"type":"duplicate_notify"}',
    );

    expect(orderRepo.save).not.toHaveBeenCalled();
    expect(paymentEventRepo.save).not.toHaveBeenCalled();
    expect(settlementService.estimatePaidOrder).toHaveBeenCalledWith(order.id);
  });

  it('should reject address submission while payment is unconfirmed', async () => {
    const order = {
      id: 'order-id',
      orderNo: 'O-20260706-1234',
      status: OrderStatus.PENDING_PAYMENT,
    } as Order;
    jest.spyOn(service, 'findOne').mockResolvedValue({ order, address: null });

    await expect(
      service.updateAddress('order-id', {
        recipient: '张三',
        phone: '13800138000',
        province: '北京',
        city: '北京市',
        district: '朝阳区',
        address: '测试地址',
      }),
    ).rejects.toThrow('支付结果尚未确认');
  });

  it('should find buyer order by orderNo (微信订单中心入口)', async () => {
    const order = {
      id: '1c03b880-95fc-4fc2-ae8f-2351ba1f9efd',
      orderNo: 'O-20260812-0001',
    } as Order;
    const findOneSpy = jest
      .spyOn(orderRepo, 'findOne')
      .mockResolvedValue(order);
    jest.spyOn(service, 'findOne').mockResolvedValue({ order, address: null });

    const result = await service.findOneForBuyer('O-20260812-0001', 'openid-1');

    expect(findOneSpy).toHaveBeenCalledWith({
      where: { orderNo: 'O-20260812-0001', openid: 'openid-1' },
    });
    expect(result.order).toBe(order);
  });

  it('should find buyer order by internal id', async () => {
    const order = {
      id: '1c03b880-95fc-4fc2-ae8f-2351ba1f9efd',
      orderNo: 'O-20260812-0001',
    } as Order;
    const findOneSpy = jest
      .spyOn(orderRepo, 'findOne')
      .mockResolvedValue(order);
    jest.spyOn(service, 'findOne').mockResolvedValue({ order, address: null });

    await service.findOneForBuyer(
      '1c03b880-95fc-4fc2-ae8f-2351ba1f9efd',
      'openid-1',
    );

    expect(findOneSpy).toHaveBeenCalledWith({
      where: {
        id: '1c03b880-95fc-4fc2-ae8f-2351ba1f9efd',
        openid: 'openid-1',
      },
    });
  });

  it('should reject buyer order lookup by orderNo when not owned', async () => {
    jest.spyOn(orderRepo, 'findOne').mockResolvedValue(null);

    await expect(
      service.findOneForBuyer('O-20260812-0001', 'openid-1'),
    ).rejects.toThrow('订单不存在');
  });
});
