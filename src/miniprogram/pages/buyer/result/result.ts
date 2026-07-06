import { get } from '../../../utils/api';

interface OrderInfo {
  id: string;
  orderNo: string;
  status: string;
  totalAmount: number;
  quantity: number;
}

interface OrderDetail {
  order: OrderInfo;
  address?: any;
}

const LATER_STATUSES = [
  'address_pending',
  'shipping_pending',
  'shipped',
  'aftersale_waiting',
  'settlement_ready',
];

Page({
  data: {
    orderId: '',
    groupQrcode: '',
    order: null as OrderInfo | null,
    loading: false,
    showGroupButton: false,
  },

  onLoad(options: Record<string, string | undefined>) {
    const orderId = options.orderId || '';
    const groupQrcode = options.groupQrcode || '';
    if (!orderId) {
      wx.showToast({ title: '缺少订单信息', icon: 'none' });
      return;
    }
    this.setData({ orderId, groupQrcode });
    this.loadOrder(orderId);
  },

  async loadOrder(orderId: string) {
    this.setData({ loading: true });
    try {
      const detail = await get<OrderDetail>(`/orders/${orderId}`);
      const order = detail.order;
      const showGroupButton = LATER_STATUSES.includes(order.status);
      this.setData({ order, showGroupButton });
    } catch (err) {
      console.error('load order failed', err);
    } finally {
      this.setData({ loading: false });
    }
  },

  onJoinGroup() {
    const { groupQrcode } = this.data;
    if (!groupQrcode) {
      wx.showToast({ title: '暂无群二维码', icon: 'none' });
      return;
    }
    wx.navigateTo({
      url: `/pages/buyer/group/group?groupQrcode=${encodeURIComponent(groupQrcode)}`,
    });
  },
});
