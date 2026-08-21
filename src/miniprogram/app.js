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
const api_1 = require("./utils/api");
App({
    globalData: {
        apiBaseUrl: 'https://xn--4oqx7jk6ghq7b.com/api',
        buyerToken: '',
    },
    onLaunch() {
        console.log('小程序启动');
    },
    ensureBuyerToken() {
        return __awaiter(this, void 0, void 0, function* () {
            const cached = this.globalData.buyerToken || wx.getStorageSync('buyerToken');
            if (cached) {
                this.globalData.buyerToken = cached;
                return cached;
            }
            const code = yield new Promise((resolve, reject) => {
                wx.login({
                    success: (res) => (res.code ? resolve(res.code) : reject(new Error('wx.login 未返回 code'))),
                    fail: reject,
                });
            });
            const { accessToken } = yield (0, api_1.post)('/wx/login', { code });
            this.globalData.buyerToken = accessToken;
            wx.setStorageSync('buyerToken', accessToken);
            return accessToken;
        });
    },
});
