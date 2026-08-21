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
const privacy_1 = require("../../../utils/privacy");
const LATER_STATUSES = [
    'address_pending',
    'shipping_pending',
    'shipped',
    'aftersale_waiting',
    'settlement_ready',
];
const STATUS_TEXT = {
    paid: '已支付',
    address_pending: '地址已提交',
    shipping_pending: '等待发货',
    shipped: '已发货',
    aftersale_waiting: '售后观察期',
    settlement_ready: '订单已完成',
    refunded: '已退款',
    cancelled: '已取消',
};
function getShippingText(status) {
    if (status === 'shipping_pending' || status === 'address_pending') {
        return '商家正在核对收货信息并安排发货。';
    }
    if (['shipped', 'aftersale_waiting', 'settlement_ready'].includes(status)) {
        return '订单已经发货，如需物流单号可联系微信客服。';
    }
    if (status === 'refunded' || status === 'cancelled') {
        return '当前订单无需继续发货。';
    }
    return '提交收货地址后，我们会尽快安排发货。';
}
Page({
    data: {
        orderId: '',
        groupQrcode: '',
        order: null,
        address: null,
        loading: false,
        showGroupButton: false,
        statusText: '',
        shippingText: '',
    },
    onLoad(options) {
        const orderId = options.orderId || '';
        const groupQrcode = options.groupQrcode || '';
        if (!orderId) {
            wx.showToast({ title: '缺少订单信息', icon: 'none' });
            return;
        }
        this.setData({ orderId, groupQrcode });
        this.loadOrder(orderId);
    },
    loadOrder(orderId) {
        return __awaiter(this, void 0, void 0, function* () {
            this.setData({ loading: true });
            try {
                const detail = yield (0, api_1.get)(`/buyer/orders/${orderId}`);
                const order = detail.order;
                const showGroupButton = LATER_STATUSES.includes(order.status);
                this.setData({
                    order,
                    address: detail.address || null,
                    showGroupButton,
                    statusText: STATUS_TEXT[order.status] || order.status,
                    shippingText: getShippingText(order.status),
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
    openPrivacyContract() {
        (0, privacy_1.openPrivacyContract)();
    },
});
