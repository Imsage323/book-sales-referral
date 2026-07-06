import { get, post } from '../../../utils/api';

interface OrderInfo {
  id: string;
  orderNo: string;
  status: string;
  totalAmount: number;
  quantity: number;
}

interface OrderDetail {
  order: OrderInfo;
}

Page({
  data: {
    orderId: '',
    groupQrcode: '',
    order: null as OrderInfo | null,
    loading: false,
    paying: false,
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
      this.setData({ order: detail.order });
    } catch (err) {
      console.error('load order failed', err);
    } finally {
      this.setData({ loading: false });
    }
  },

  async onPay() {
    const { orderId, groupQrcode } = this.data;
    if (!orderId) {
      wx.showToast({ title: '缺少订单信息', icon: 'none' });
      return;
    }
    this.setData({ paying: true });
    try {
      await post(`/orders/${orderId}/pay`, {});
      wx.showToast({ title: '支付成功', icon: 'success' });
      wx.navigateTo({
        url: `/pages/buyer/address/address?orderId=${orderId}&groupQrcode=${encodeURIComponent(groupQrcode)}`,
      });
    } catch (err) {
      console.error('pay failed', err);
      wx.showToast({ title: '支付失败，请重试', icon: 'none' });
    } finally {
      this.setData({ paying: false });
    }
  },

  onCancel() {
    wx.navigateBack();
  },
});
