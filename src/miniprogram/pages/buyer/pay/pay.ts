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

interface WxPaymentParams {
  appId: string;
  timeStamp: string;
  nonceStr: string;
  package: string;
  signType: 'RSA';
  paySign: string;
}

const STATUS_TEXT: Record<string, string> = {
  pending_payment: '待支付',
  paid: '已支付',
  address_pending: '待完善地址',
  shipping_pending: '待发货',
  shipped: '已发货',
  aftersale_waiting: '售后观察期',
  settlement_ready: '已结算',
  closed: '已关闭',
  refunded: '已退款',
  cancelled: '已取消',
};

Page({
  data: {
    orderId: '',
    groupQrcode: '',
    order: null as OrderInfo | null,
    statusText: '',
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
      const detail = await get<OrderDetail>(`/buyer/orders/${orderId}`);
      const order = detail.order;
      this.setData({ order, statusText: STATUS_TEXT[order.status] || order.status });
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
      // mock 模式后端直接返回订单（无 paySign）；真实模式返回 wx.requestPayment 参数
      const result = await post<WxPaymentParams | Record<string, never>>(
        `/buyer/orders/${orderId}/pay`,
        {},
      );
      if (result && (result as WxPaymentParams).paySign) {
        const params = result as WxPaymentParams;
        await new Promise<void>((resolve, reject) => {
          wx.requestPayment({
            timeStamp: params.timeStamp,
            nonceStr: params.nonceStr,
            package: params.package,
            signType: 'RSA',
            paySign: params.paySign,
            success: () => resolve(),
            fail: (err) => reject(err),
          });
        });
        // 主动对账，防止支付回调延迟/丢失导致订单卡住
        await post(`/buyer/orders/${orderId}/pay-sync`, {});
      }
      wx.showToast({ title: '支付成功', icon: 'success' });
      wx.navigateTo({
        url: `/pages/buyer/address/address?orderId=${orderId}&groupQrcode=${encodeURIComponent(groupQrcode)}`,
      });
    } catch (err: any) {
      if (err && typeof err.errMsg === 'string' && err.errMsg.indexOf('cancel') >= 0) {
        // 用户取消支付，停留当前页可重试
        wx.showToast({ title: '已取消支付', icon: 'none' });
      } else {
        console.error('pay failed', err);
        wx.showToast({ title: '支付失败，请重试', icon: 'none' });
      }
    } finally {
      this.setData({ paying: false });
    }
  },

  onCancel() {
    wx.navigateBack();
  },
});
