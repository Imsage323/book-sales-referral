"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const api_1 = require("../../../utils/api");
const STATUS_TEXT = {
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
function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function isPaymentConfirmed(order) {
    return Boolean(order && order.paidAt && order.wxTransactionId);
}
function paymentSubmittedKey(orderId) {
    return `paymentSubmitted:${orderId}`;
}
Page({
    data: {
        orderId: '',
        groupQrcode: '',
        order: null,
        statusText: '',
        loading: false,
        paying: false,
        paymentSubmitted: false,
        paymentConfirmed: false,
    },
    onLoad(options) {
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
    loadOrder(orderId) {
        return __awaiter(this, void 0, void 0, function* () {
            this.setData({ loading: true });
            try {
                const detail = yield (0, api_1.get)(`/buyer/orders/${orderId}`);
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
            }
            catch (err) {
                console.error('load order failed', err);
            }
            finally {
                this.setData({ loading: false });
            }
        });
    },
    onPay() {
        return __awaiter(this, void 0, void 0, function* () {
            const { orderId, groupQrcode, paymentSubmitted, paymentConfirmed, } = this.data;
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
                    const confirmedOrder = yield this.confirmPayment(orderId);
                    if (!confirmedOrder) {
                        this.showPaymentPending();
                        return;
                    }
                    this.completePayment(orderId, groupQrcode);
                    return;
                }
                // mock 模式后端直接返回订单（无 paySign）；真实模式返回 wx.requestPayment 参数
                const result = yield (0, api_1.post)(`/buyer/orders/${orderId}/pay`, {});
                if (result && result.paySign) {
                    const params = result;
                    yield new Promise((resolve, reject) => {
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
                    const confirmedOrder = yield this.confirmPayment(orderId);
                    if (!confirmedOrder) {
                        this.showPaymentPending();
                        return;
                    }
                }
                else {
                    const order = result;
                    if (isPaymentConfirmed(order)) {
                        this.setConfirmedOrder(order);
                    }
                    else {
                        const confirmedOrder = yield this.confirmPayment(orderId);
                        if (!confirmedOrder) {
                            this.showPaymentPending();
                            return;
                        }
                    }
                }
                this.completePayment(orderId, groupQrcode);
            }
            catch (err) {
                if (err && typeof err.errMsg === 'string' && err.errMsg.indexOf('cancel') >= 0) {
                    // 用户取消支付，停留当前页可重试
                    wx.showToast({ title: '已取消支付', icon: 'none' });
                }
                else if (this.data.paymentSubmitted) {
                    console.error('payment confirmation failed', err);
                    this.showPaymentPending();
                }
                else {
                    console.error('pay failed', err);
                    wx.showToast({ title: '支付失败，请重试', icon: 'none' });
                }
            }
            finally {
                this.setData({ paying: false });
            }
        });
    },
    confirmPayment(orderId) {
        return __awaiter(this, void 0, void 0, function* () {
            let latestOrder = null;
            for (let attempt = 0; attempt < PAYMENT_CONFIRM_ATTEMPTS; attempt++) {
                latestOrder = yield (0, api_1.post)(`/buyer/orders/${orderId}/pay-sync`, {});
                this.setData({
                    order: latestOrder,
                    statusText: STATUS_TEXT[latestOrder.status] || latestOrder.status,
                });
                if (isPaymentConfirmed(latestOrder)) {
                    this.setConfirmedOrder(latestOrder);
                    return latestOrder;
                }
                if (attempt < PAYMENT_CONFIRM_ATTEMPTS - 1) {
                    yield wait(PAYMENT_CONFIRM_INTERVAL_MS);
                }
            }
            return null;
        });
    },
    setConfirmedOrder(order) {
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
    completePayment(orderId, groupQrcode) {
        wx.showToast({ title: '支付已确认', icon: 'success' });
        this.continueToAddress(orderId, groupQrcode);
    },
    continueToAddress(orderId, groupQrcode) {
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
                    if (result.confirm)
                        wx.navigateBack();
                },
            });
            return;
        }
        wx.navigateBack();
    },
});
