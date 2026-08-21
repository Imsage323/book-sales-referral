import { get, post } from '../../../utils/api';

interface OrderInfo {
  id: string;
  orderNo: string;
  status: string;
  totalAmount: number;
  quantity: number;
  paidAt?: string;
  wxTransactionId?: string;
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

const PAYMENT_CONFIRM_ATTEMPTS = 4;
const PAYMENT_CONFIRM_INTERVAL_MS = 1000;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isPaymentConfirmed(order: OrderInfo | null): boolean {
  return Boolean(order && order.paidAt && order.wxTransactionId);
}

function paymentSubmittedKey(orderId: string): string {
  return `paymentSubmitted:${orderId}`;
}

Page({
  data: {
    orderId: '',
    groupQrcode: '',
    order: null as OrderInfo | null,
    statusText: '',
    loading: false,
    paying: false,
    paymentSubmitted: false,
    paymentConfirmed: false,
  },

  onLoad(options: Record<string, string | undefined>) {
    const orderId = options.orderId || '';
    const groupQrcode = options.groupQrcode || '';
    if (!orderId) {
      wx.showToast({ title: '缺少订单信息', icon: 'none' });
      return;
    }
    this.setData({
      orderId,
      groupQrcode,
      paymentSubmitted: wx.getStorageSync(paymentSubmittedKey(orderId)) === true,
    });
    this.loadOrder(orderId);
  },

  async loadOrder(orderId: string) {
    this.setData({ loading: true });
    try {
      const detail = await get<OrderDetail>(`/buyer/orders/${orderId}`);
      const order = detail.order;
      const paymentConfirmed = isPaymentConfirmed(order);
      if (paymentConfirmed) {
        wx.removeStorageSync(paymentSubmittedKey(orderId));
      }
      this.setData({
        order,
        statusText: STATUS_TEXT[order.status] || order.status,
        paymentConfirmed,
        paymentSubmitted: paymentConfirmed ? false : this.data.paymentSubmitted,
      });
    } catch (err) {
      console.error('load order failed', err);
    } finally {
      this.setData({ loading: false });
    }
  },

  async onPay() {
    const {
      orderId,
      groupQrcode,
      paymentSubmitted,
      paymentConfirmed,
    } = this.data;
    if (!orderId) {
      wx.showToast({ title: '缺少订单信息', icon: 'none' });
      return;
    }
    if (paymentConfirmed) {
      this.continueToAddress(orderId, groupQrcode);
      return;
    }
    this.setData({ paying: true });
    try {
      if (paymentSubmitted) {
        const confirmedOrder = await this.confirmPayment(orderId);
        if (!confirmedOrder) {
          this.showPaymentPending();
          return;
        }
        this.completePayment(orderId, groupQrcode);
        return;
      }

      // mock 模式后端直接返回订单（无 paySign）；真实模式返回 wx.requestPayment 参数
      const result = await post<WxPaymentParams | OrderInfo>(
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
        wx.setStorageSync(paymentSubmittedKey(orderId), true);
        this.setData({ paymentSubmitted: true });

        const confirmedOrder = await this.confirmPayment(orderId);
        if (!confirmedOrder) {
          this.showPaymentPending();
          return;
        }
      } else {
        const order = result as OrderInfo;
        if (isPaymentConfirmed(order)) {
          this.setConfirmedOrder(order);
        } else {
          const confirmedOrder = await this.confirmPayment(orderId);
          if (!confirmedOrder) {
            this.showPaymentPending();
            return;
          }
        }
      }
      this.completePayment(orderId, groupQrcode);
    } catch (err: any) {
      if (err && typeof err.errMsg === 'string' && err.errMsg.indexOf('cancel') >= 0) {
        // 用户取消支付，停留当前页可重试
        wx.showToast({ title: '已取消支付', icon: 'none' });
      } else if (this.data.paymentSubmitted) {
        console.error('payment confirmation failed', err);
        this.showPaymentPending();
      } else {
        console.error('pay failed', err);
        wx.showToast({ title: '支付失败，请重试', icon: 'none' });
      }
    } finally {
      this.setData({ paying: false });
    }
  },

  async confirmPayment(orderId: string): Promise<OrderInfo | null> {
    let latestOrder: OrderInfo | null = null;
    for (let attempt = 0; attempt < PAYMENT_CONFIRM_ATTEMPTS; attempt++) {
      latestOrder = await post<OrderInfo>(
        `/buyer/orders/${orderId}/pay-sync`,
        {},
      );
      this.setData({
        order: latestOrder,
        statusText: STATUS_TEXT[latestOrder.status] || latestOrder.status,
      });
      if (isPaymentConfirmed(latestOrder)) {
        this.setConfirmedOrder(latestOrder);
        return latestOrder;
      }
      if (attempt < PAYMENT_CONFIRM_ATTEMPTS - 1) {
        await wait(PAYMENT_CONFIRM_INTERVAL_MS);
      }
    }
    return null;
  },

  setConfirmedOrder(order: OrderInfo) {
    wx.removeStorageSync(paymentSubmittedKey(order.id));
    this.setData({
      order,
      statusText: STATUS_TEXT[order.status] || order.status,
      paymentSubmitted: false,
      paymentConfirmed: true,
    });
  },

  showPaymentPending() {
    wx.showModal({
      title: '支付结果确认中',
      content: '请勿再次支付。请稍后点击“重新确认支付结果”。',
      showCancel: false,
    });
  },

  completePayment(orderId: string, groupQrcode: string) {
    wx.showToast({ title: '支付已确认', icon: 'success' });
    this.continueToAddress(orderId, groupQrcode);
  },

  continueToAddress(orderId: string, groupQrcode: string) {
    wx.navigateTo({
      url: `/pages/buyer/address/address?orderId=${orderId}&groupQrcode=${encodeURIComponent(groupQrcode)}`,
    });
  },

  onCancel() {
    if (this.data.paymentSubmitted && !this.data.paymentConfirmed) {
      wx.showModal({
        title: '支付结果仍在确认',
        content: '离开后请勿重新下单或再次支付，可稍后返回本页确认结果。',
        confirmText: '仍要离开',
        success: (result) => {
          if (result.confirm) wx.navigateBack();
        },
      });
      return;
    }
    wx.navigateBack();
  },
});
