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
Page({
    data: {
        scene: '',
        loading: false,
        loadError: '',
        product: null,
        seller: null,
        isDirect: false,
        quantity: 1,
        privacyAccepted: false,
        showPrivacyPrompt: false,
        privacyContractName: '小程序用户隐私保护指引',
        pendingBuy: false,
        points: [
            '每日高考倒计时，关键节点不遗漏',
            '每天一页升学路径与行动指南',
            '每周 KISS 复盘，稳住复习节奏',
            '锦鲤相伴，跃过龙门',
        ],
    },
    onLoad(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const scene = options.scene || '';
            this.setData({ scene });
            yield this.refreshPrivacyStatus();
            if (scene) {
                yield this.loadProduct(scene);
            }
            else {
                yield this.loadDefaultStorefront();
            }
        });
    },
    refreshPrivacyStatus() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const status = yield (0, privacy_1.getPrivacyStatus)();
                this.setData({
                    privacyAccepted: !status.needAuthorization,
                    showPrivacyPrompt: status.needAuthorization,
                    privacyContractName: status.privacyContractName,
                });
            }
            catch (err) {
                console.error('get privacy setting failed', err);
                this.setData({ privacyAccepted: false, showPrivacyPrompt: true });
            }
        });
    },
    loadProduct(scene) {
        return __awaiter(this, void 0, void 0, function* () {
            this.setData({ loading: true, loadError: '', isDirect: false });
            try {
                const resolveResult = yield (0, api_1.get)(`/qrcodes/${scene}/resolve`);
                if (!resolveResult.product) {
                    wx.showToast({ title: '未关联产品', icon: 'none' });
                    return;
                }
                const product = yield (0, api_1.get)(`/products/public/${resolveResult.product.id}`);
                this.setData({
                    product,
                    seller: resolveResult.seller,
                    quantity: product.defaultQuantity || 1,
                });
                if (this.data.privacyAccepted) {
                    yield this.recordScanLog(resolveResult.seller.sellerCode, scene, product.id);
                }
            }
            catch (err) {
                console.error('load product failed', err);
                this.setData({ loadError: '销售专属入口暂时无法打开，请稍后重试' });
            }
            finally {
                this.setData({ loading: false });
            }
        });
    },
    loadDefaultStorefront() {
        return __awaiter(this, void 0, void 0, function* () {
            this.setData({ loading: true, loadError: '', isDirect: true });
            try {
                const result = yield (0, api_1.get)('/products/storefront');
                this.setData({
                    product: result.product,
                    seller: result.seller,
                    quantity: result.product.defaultQuantity || 1,
                });
            }
            catch (err) {
                console.error('load default storefront failed', err);
                this.setData({ loadError: '普通购买入口尚未开放，请通过销售专属码进入' });
            }
            finally {
                this.setData({ loading: false });
            }
        });
    },
    retryLoad() {
        if (this.data.scene) {
            this.loadProduct(this.data.scene);
        }
        else {
            this.loadDefaultStorefront();
        }
    },
    recordScanLog(sellerCode, scene, productId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield getApp().ensureBuyerToken();
                yield (0, api_1.post)('/scan-logs', {
                    sellerCode,
                    scene,
                    productId,
                });
            }
            catch (err) {
                console.error('record scan log failed', err);
            }
        });
    },
    onQuantityInput(e) {
        const value = parseInt(e.detail.value, 10);
        if (!isNaN(value) && value >= 1) {
            this.setData({ quantity: value });
        }
    },
    increaseQuantity() {
        this.setData({ quantity: this.data.quantity + 1 });
    },
    decreaseQuantity() {
        if (this.data.quantity > 1) {
            this.setData({ quantity: this.data.quantity - 1 });
        }
    },
    onBuy() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.data.privacyAccepted) {
                this.setData({ showPrivacyPrompt: true, pendingBuy: true });
                return;
            }
            yield this.createOrder();
        });
    },
    onAgreePrivacyAuthorization() {
        return __awaiter(this, void 0, void 0, function* () {
            this.setData({ privacyAccepted: true, showPrivacyPrompt: false });
            const { seller, product, scene, pendingBuy } = this.data;
            if (scene && seller && product) {
                yield this.recordScanLog(seller.sellerCode, scene, product.id);
            }
            if (pendingBuy) {
                this.setData({ pendingBuy: false });
                yield this.createOrder();
            }
        });
    },
    onDeclinePrivacy() {
        this.setData({ showPrivacyPrompt: false, pendingBuy: false });
        wx.showToast({ title: '可继续浏览，购买前需同意隐私指引', icon: 'none' });
    },
    openPrivacyContract() {
        (0, privacy_1.openPrivacyContract)();
    },
    noop() { },
    createOrder() {
        return __awaiter(this, void 0, void 0, function* () {
            const { product, seller, quantity } = this.data;
            if (!product || !seller) {
                wx.showToast({ title: '产品信息未加载', icon: 'none' });
                return;
            }
            try {
                yield getApp().ensureBuyerToken();
                const order = yield (0, api_1.post)('/buyer/orders', {
                    productId: product.id,
                    sellerId: seller.id,
                    quantity,
                });
                const groupQrcode = product.groupQrcode || '';
                wx.navigateTo({
                    url: `/pages/buyer/pay/pay?orderId=${order.id}&groupQrcode=${encodeURIComponent(groupQrcode)}`,
                });
            }
            catch (err) {
                console.error('create order failed', err);
            }
        });
    },
});
