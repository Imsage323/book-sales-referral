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
/**
 * 延迟加载解析模块：顶层 require 失败时会导致 Page 未注册、整页空白。
 * 仅在点击识别时加载，保证表单始终可渲染。
 */
function loadParser() {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('../../../utils/address-parser');
}
Page({
    data: {
        orderId: '',
        groupQrcode: '',
        pasteText: '',
        recipient: '',
        phone: '',
        province: '',
        city: '',
        district: '',
        addressDetail: '',
        remark: '',
        submitting: false,
        privacyAccepted: false,
        showPrivacyPrompt: false,
        privacyContractName: '小程序用户隐私保护指引',
        pendingClipboard: false,
    },
    onLoad(options) {
        const orderId = (options && options.orderId) || '';
        const groupQrcode = (options && options.groupQrcode) || '';
        if (!orderId) {
            wx.showToast({ title: '缺少订单信息', icon: 'none' });
            return;
        }
        this.setData({ orderId: orderId, groupQrcode: groupQrcode });
        this.refreshPrivacyStatus();
    },
    refreshPrivacyStatus() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const status = yield (0, privacy_1.getPrivacyStatus)();
                this.setData({
                    privacyAccepted: !status.needAuthorization,
                    privacyContractName: status.privacyContractName,
                });
            }
            catch (err) {
                console.error('get privacy setting failed', err);
                this.setData({ privacyAccepted: false });
            }
        });
    },
    onPasteInput(e) {
        this.setData({ pasteText: (e.detail && e.detail.value) || '' });
    },
    onFieldInput(e) {
        const field = e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.field;
        if (!field) {
            return;
        }
        const next = {};
        next[field] = (e.detail && e.detail.value) || '';
        this.setData(next);
    },
    onPasteFromClipboard() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const status = yield (0, privacy_1.getPrivacyStatus)();
                if (status.needAuthorization) {
                    this.setData({
                        privacyAccepted: false,
                        pendingClipboard: true,
                        showPrivacyPrompt: true,
                        privacyContractName: status.privacyContractName,
                    });
                    return;
                }
                this.setData({ privacyAccepted: true });
                this.readClipboard();
            }
            catch (err) {
                console.error('get privacy setting failed', err);
                this.setData({ pendingClipboard: true, showPrivacyPrompt: true });
            }
        });
    },
    readClipboard() {
        wx.getClipboardData({
            success: (res) => {
                const text = ((res && res.data) || '').trim();
                if (!text) {
                    wx.showToast({ title: '剪贴板为空', icon: 'none' });
                    return;
                }
                this.setData({ pasteText: text });
                this.applyParse(text);
            },
            fail: () => {
                wx.showToast({ title: '无法读取剪贴板', icon: 'none' });
            },
        });
    },
    onAgreePrivacyAuthorization() {
        const shouldReadClipboard = this.data.pendingClipboard;
        this.setData({
            privacyAccepted: true,
            pendingClipboard: false,
            showPrivacyPrompt: false,
        });
        if (shouldReadClipboard) {
            this.readClipboard();
        }
    },
    onDeclinePrivacy() {
        this.setData({ pendingClipboard: false, showPrivacyPrompt: false });
        wx.showToast({ title: '可继续手工填写地址', icon: 'none' });
    },
    openPrivacyContract() {
        (0, privacy_1.openPrivacyContract)();
    },
    noop() { },
    onRecognize() {
        const text = (this.data.pasteText || '').trim();
        if (!text) {
            wx.showToast({ title: '请先粘贴地址文本', icon: 'none' });
            return;
        }
        this.applyParse(text);
    },
    applyParse(text) {
        let parser;
        try {
            parser = loadParser();
        }
        catch (err) {
            console.error('load address-parser failed', err);
            wx.showToast({ title: '识别模块加载失败', icon: 'none' });
            return;
        }
        let parsed;
        try {
            parsed = parser.parseAddressText(text);
        }
        catch (err) {
            console.error('parse address failed', err);
            wx.showToast({ title: '识别出错，请手动填写', icon: 'none' });
            return;
        }
        if (!parser.hasUsefulParse(parsed)) {
            wx.showToast({ title: '未能识别，请手动填写', icon: 'none' });
            return;
        }
        const next = {
            recipient: parsed.recipient || this.data.recipient,
            phone: parsed.phone || this.data.phone,
            province: parsed.province || this.data.province,
            city: parsed.city || this.data.city,
            district: parsed.district || this.data.district,
            addressDetail: parsed.address || this.data.addressDetail,
        };
        this.setData(next);
        const missing = [];
        if (!next.recipient)
            missing.push('收件人');
        if (!next.phone)
            missing.push('手机');
        if (!next.province)
            missing.push('省');
        if (!next.city)
            missing.push('市');
        if (!next.district)
            missing.push('区');
        if (!next.addressDetail)
            missing.push('详细地址');
        // 详细地址只有「xx街道/镇/乡」时提醒补路名门牌
        const onlyAdminStreet = /^[\u4e00-\u9fa5]{1,12}(?:街道|镇|乡|苏木)$/.test(next.addressDetail || '');
        if (missing.length) {
            wx.showToast({
                title: '已填入，请补全：' + missing.slice(0, 3).join('、'),
                icon: 'none',
                duration: 2500,
            });
        }
        else if (onlyAdminStreet) {
            wx.showToast({
                title: '请补全街道后的路名门牌',
                icon: 'none',
                duration: 2500,
            });
        }
        else {
            wx.showToast({ title: '识别成功，请确认', icon: 'success' });
        }
    },
    onSubmit() {
        return __awaiter(this, void 0, void 0, function* () {
            const orderId = this.data.orderId;
            const groupQrcode = this.data.groupQrcode;
            const payload = {
                recipient: (this.data.recipient || '').trim(),
                phone: (this.data.phone || '').trim(),
                province: (this.data.province || '').trim(),
                city: (this.data.city || '').trim(),
                district: (this.data.district || '').trim(),
                address: (this.data.addressDetail || '').trim(),
                remark: (this.data.remark || '').trim() || undefined,
            };
            if (!payload.recipient ||
                !payload.phone ||
                !payload.province ||
                !payload.city ||
                !payload.district ||
                !payload.address) {
                wx.showToast({ title: '请填写完整地址', icon: 'none' });
                return;
            }
            if (this.data.submitting) {
                return;
            }
            this.setData({ submitting: true });
            try {
                yield (0, api_1.patch)('/buyer/orders/' + orderId + '/address', payload);
                wx.navigateTo({
                    url: '/pages/buyer/result/result?orderId=' +
                        orderId +
                        '&groupQrcode=' +
                        encodeURIComponent(groupQrcode || ''),
                    fail: (navErr) => {
                        console.error('navigate to result failed', navErr);
                        wx.showToast({ title: '结果页打开失败', icon: 'none' });
                    },
                });
            }
            catch (err) {
                console.error('submit address failed', err);
            }
            finally {
                this.setData({ submitting: false });
            }
        });
    },
});
