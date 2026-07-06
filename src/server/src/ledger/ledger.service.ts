import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import * as XLSX from 'xlsx';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { OrderAddress } from '../orders/entities/order-address.entity';
import { Shipment } from '../orders/entities/shipment.entity';
import { Product } from '../products/entities/product.entity';
import { Seller } from '../sellers/entities/seller.entity';
import { LedgerExportDto } from './dto/ledger-export.dto';

export interface LedgerOrderRow {
  orderNo: string;
  status: OrderStatus;
  sellerName: string;
  productName: string;
  quantity: number;
  totalAmount: number;
  unitPrice: number;
  recipient: string;
  phone: string;
  fullAddress: string;
  paidAt: string;
  shippedAt: string;
  company: string;
  trackingNo: string;
  aftersaleEnd: string;
  remark: string;
}

export interface LedgerSummaryRow {
  sellerName: string;
  orderCount: number;
  totalAmount: number;
  shippedCount: number;
}

@Injectable()
export class LedgerService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
  ) {}

  async exportOrders(query: LedgerExportDto): Promise<LedgerOrderRow[]> {
    const qb = this.orderRepo
      .createQueryBuilder('order')
      .leftJoinAndMapOne(
        'order.address',
        OrderAddress,
        'address',
        'address.orderId = order.id',
      )
      .leftJoinAndMapOne(
        'order.shipment',
        Shipment,
        'shipment',
        'shipment.orderId = order.id',
      )
      .leftJoinAndMapOne(
        'order.product',
        Product,
        'product',
        'product.id = order.productId',
      )
      .leftJoinAndMapOne(
        'order.seller',
        Seller,
        'seller',
        'seller.id = order.sellerId',
      )
      .orderBy('order.createdAt', 'DESC');

    if (query.sellerId) {
      qb.andWhere('order.sellerId = :sellerId', { sellerId: query.sellerId });
    }
    if (query.status) {
      qb.andWhere('order.status = :status', { status: query.status });
    }
    if (query.startDate && query.endDate) {
      qb.andWhere('order.createdAt BETWEEN :startDate AND :endDate', {
        startDate: this.toStartOfDay(query.startDate),
        endDate: this.toEndOfDay(query.endDate),
      });
    } else if (query.startDate) {
      qb.andWhere('order.createdAt >= :startDate', {
        startDate: this.toStartOfDay(query.startDate),
      });
    } else if (query.endDate) {
      qb.andWhere('order.createdAt <= :endDate', {
        endDate: this.toEndOfDay(query.endDate),
      });
    }

    const orders = await qb.getMany();

    return orders.map((order: any): LedgerOrderRow => {
      const address: OrderAddress | undefined = order.address;
      const shipment: Shipment | undefined = order.shipment;
      const product: Product | undefined = order.product;
      const seller: Seller | undefined = order.seller;
      return {
        orderNo: order.orderNo,
        status: order.status,
        sellerName: seller?.name || '',
        productName: product?.name || '',
        quantity: order.quantity,
        totalAmount: this.toYuan(order.totalAmount),
        unitPrice: this.toYuan(order.unitPrice),
        recipient: address?.recipient || '',
        phone: address?.phone || '',
        fullAddress: this.formatAddress(address),
        paidAt: order.paidAt ? new Date(order.paidAt).toLocaleString('zh-CN') : '',
        shippedAt: shipment?.shippedAt
          ? new Date(shipment.shippedAt).toLocaleString('zh-CN')
          : '',
        company: shipment?.company || '',
        trackingNo: shipment?.trackingNo || '',
        aftersaleEnd: shipment?.aftersaleEnd
          ? new Date(shipment.aftersaleEnd).toLocaleString('zh-CN')
          : '',
        remark: order.remark || '',
      };
    });
  }

  async exportSummary(query: LedgerExportDto): Promise<LedgerSummaryRow[]> {
    const subQb = this.orderRepo
      .createQueryBuilder('order')
      .select('order.sellerId', 'sellerId')
      .addSelect('COUNT(order.id)', 'orderCount')
      .addSelect('SUM(order.totalAmount)', 'totalAmount')
      .addSelect(
        'SUM(CASE WHEN shipment.id IS NOT NULL THEN 1 ELSE 0 END)',
        'shippedCount',
      )
      .leftJoin(
        Shipment,
        'shipment',
        'shipment.orderId = order.id',
      )
      .groupBy('order.sellerId');

    if (query.sellerId) {
      subQb.andWhere('order.sellerId = :sellerId', { sellerId: query.sellerId });
    }
    if (query.status) {
      subQb.andWhere('order.status = :status', { status: query.status });
    }
    if (query.startDate && query.endDate) {
      subQb.andWhere('order.createdAt BETWEEN :startDate AND :endDate', {
        startDate: this.toStartOfDay(query.startDate),
        endDate: this.toEndOfDay(query.endDate),
      });
    } else if (query.startDate) {
      subQb.andWhere('order.createdAt >= :startDate', {
        startDate: this.toStartOfDay(query.startDate),
      });
    } else if (query.endDate) {
      subQb.andWhere('order.createdAt <= :endDate', {
        endDate: this.toEndOfDay(query.endDate),
      });
    }

    const raw = await subQb.getRawMany();

    const sellerIds = raw.map((r) => r.sellerId).filter(Boolean);
    const sellers = await this.orderRepo.manager.find(Seller, {
      where: sellerIds.map((id) => ({ id })),
    });
    const sellerMap = new Map(sellers.map((s) => [s.id, s.name]));

    return raw.map((r) => ({
      sellerName: sellerMap.get(r.sellerId) || r.sellerId || '未知',
      orderCount: Number(r.orderCount || 0),
      totalAmount: this.toYuan(Number(r.totalAmount || 0)),
      shippedCount: Number(r.shippedCount || 0),
    }));
  }

  generateExcel(orderRows: LedgerOrderRow[], summaryRows: LedgerSummaryRow[]): Buffer {
    const orderSheet = XLSX.utils.json_to_sheet(orderRows, {
      header: [
        'orderNo',
        'status',
        'sellerName',
        'productName',
        'quantity',
        'unitPrice',
        'totalAmount',
        'recipient',
        'phone',
        'fullAddress',
        'paidAt',
        'shippedAt',
        'company',
        'trackingNo',
        'aftersaleEnd',
        'remark',
      ],
    });
    this.translateHeader(orderSheet, {
      orderNo: '订单号',
      status: '状态',
      sellerName: '销售方',
      productName: '产品',
      quantity: '数量',
      unitPrice: '单价（元）',
      totalAmount: '金额（元）',
      recipient: '收件人',
      phone: '手机号',
      fullAddress: '地址',
      paidAt: '支付时间',
      shippedAt: '发货时间',
      company: '快递公司',
      trackingNo: '快递单号',
      aftersaleEnd: '售后期结束',
      remark: '备注',
    });

    const summarySheet = XLSX.utils.json_to_sheet(summaryRows, {
      header: ['sellerName', 'orderCount', 'totalAmount', 'shippedCount'],
    });
    this.translateHeader(summarySheet, {
      sellerName: '销售方',
      orderCount: '订单数',
      totalAmount: '订单金额（元）',
      shippedCount: '发货数',
    });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, orderSheet, '订单明细');
    XLSX.utils.book_append_sheet(workbook, summarySheet, '销售汇总');

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  private translateHeader(
    sheet: XLSX.WorkSheet,
    translations: Record<string, string>,
  ): void {
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c: col });
      const cell = sheet[cellAddress];
      if (cell && typeof cell.v === 'string' && translations[cell.v]) {
        cell.v = translations[cell.v];
      }
    }
  }

  private formatAddress(address?: OrderAddress): string {
    if (!address) return '';
    return `${address.province}${address.city}${address.district}${address.address}`;
  }

  private toYuan(fen: number): number {
    return fen / 100;
  }

  private toStartOfDay(dateStr: string): Date {
    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  private toEndOfDay(dateStr: string): Date {
    const date = new Date(dateStr);
    date.setHours(23, 59, 59, 999);
    return date;
  }
}
