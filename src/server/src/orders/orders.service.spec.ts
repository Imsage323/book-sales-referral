import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrdersService } from './orders.service';
import { Order, OrderStatus } from './entities/order.entity';
import { OrderAddress } from './entities/order-address.entity';
import { Product } from '../products/entities/product.entity';
import { Seller, SellerStatus } from '../sellers/entities/seller.entity';
import { PaymentEvent } from '../payments/entities/payment-event.entity';

describe('OrdersService', () => {
  let service: OrdersService;
  let orderRepo: Repository<Order>;
  let paymentEventRepo: Repository<PaymentEvent>;

  beforeEach(async () => {
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
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    orderRepo = module.get<Repository<Order>>(getRepositoryToken(Order));
    paymentEventRepo = module.get<Repository<PaymentEvent>>(getRepositoryToken(PaymentEvent));
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
    jest.spyOn(paymentEventRepo, 'create').mockImplementation((dto: any) => dto as PaymentEvent);
    jest.spyOn(paymentEventRepo, 'save').mockImplementation(async (dto: any) => dto);

    const result = await service.payOrder('order-id');

    expect(result.status).toBe(OrderStatus.PAID);
    expect(result.paidAt).toBeInstanceOf(Date);
    expect(result.wxTransactionId).toMatch(/^MOCK-O-20260706-1234-\d+$/);
    expect(orderRepo.save).toHaveBeenCalled();
    expect(paymentEventRepo.save).toHaveBeenCalled();
  });

  it('should reject payment when order is not pending_payment', async () => {
    const order = {
      id: 'order-id',
      orderNo: 'O-20260706-1234',
      status: OrderStatus.PAID,
      totalAmount: 200,
    } as Order;

    jest.spyOn(orderRepo, 'findOne').mockResolvedValue(order);

    await expect(service.payOrder('order-id')).rejects.toThrow('订单当前状态不允许支付');
  });

  it('should reject payment when order does not exist', async () => {
    jest.spyOn(orderRepo, 'findOne').mockResolvedValue(null);

    await expect(service.payOrder('missing-id')).rejects.toThrow('订单不存在');
  });
});
