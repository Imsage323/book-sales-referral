import { patch } from '../../../utils/api';

Page({
  data: {
    orderId: '',
    groupQrcode: '',
  },

  onLoad(options: Record<string, string | undefined>) {
    const orderId = options.orderId || '';
    const groupQrcode = options.groupQrcode || '';
    if (!orderId) {
      wx.showToast({ title: '缺少订单信息', icon: 'none' });
      return;
    }
    this.setData({ orderId, groupQrcode });
  },

  async onSubmit(e: any) {
    const { orderId, groupQrcode } = this.data;
    const form = e.detail.value;
    if (!form.recipient || !form.phone || !form.province || !form.city || !form.district || !form.address) {
      wx.showToast({ title: '请填写完整地址', icon: 'none' });
      return;
    }
    try {
      await patch(`/orders/${orderId}/address`, form);
      wx.navigateTo({
        url: `/pages/buyer/result/result?orderId=${orderId}&groupQrcode=${encodeURIComponent(groupQrcode)}`,
      });
    } catch (err) {
      console.error('submit address failed', err);
    }
  },
});
