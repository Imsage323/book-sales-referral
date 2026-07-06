import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LedgerService, LedgerOrderRow, LedgerSummaryRow } from './ledger.service';
import { Order } from '../orders/entities/order.entity';

describe('LedgerService', () => {
  let service: LedgerService;
  let orderRepo: Repository<Order>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LedgerService,
        {
          provide: getRepositoryToken(Order),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<LedgerService>(LedgerService);
    orderRepo = module.get<Repository<Order>>(getRepositoryToken(Order));
  });

  it('should generate a non-empty xlsx buffer', () => {
    const orderRows: LedgerOrderRow[] = [
      {
        orderNo: 'O-20260706-0001',
        status: 'paid' as any,
        sellerName: '测试卖家',
        productName: '测试书',
        quantity: 2,
        totalAmount: 2,
        unitPrice: 1,
        recipient: '张三',
        phone: '13800138000',
        fullAddress: '北京市朝阳区测试地址',
        paidAt: '2026-07-06 10:00:00',
        shippedAt: '',
        company: '',
        trackingNo: '',
        aftersaleEnd: '',
        remark: '',
      },
    ];
    const summaryRows: LedgerSummaryRow[] = [
      {
        sellerName: '测试卖家',
        orderCount: 1,
        totalAmount: 2,
        shippedCount: 0,
      },
    ];

    const buffer = service.generateExcel(orderRows, summaryRows);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });
});
