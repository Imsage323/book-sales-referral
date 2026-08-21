"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.patch = exports.post = exports.get = exports.request = void 0;
function getBaseUrl() {
    const app = getApp();
    return (app && app.globalData && app.globalData.apiBaseUrl) || '';
}
function getBuyerToken() {
    const app = getApp();
    return (app && app.globalData && app.globalData.buyerToken) || wx.getStorageSync('buyerToken') || '';
}
function request(options) {
    const baseUrl = getBaseUrl();
    const buyerToken = getBuyerToken();
    return new Promise((resolve, reject) => {
        wx.request({
            url: `${baseUrl}${options.url}`,
            method: options.method,
            data: options.data,
            header: Object.assign(Object.assign({ 'Content-Type': 'application/json' }, (buyerToken ? { Authorization: `Bearer ${buyerToken}` } : {})), (options.header || {})),
            success: (res) => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(res.data);
                }
                else {
                    if (res.statusCode === 401 && buyerToken) {
                        wx.removeStorageSync('buyerToken');
                        const app = getApp();
                        if (app && app.globalData)
                            app.globalData.buyerToken = '';
                    }
                    const data = res.data;
                    let message = data && data.message;
                    if (Array.isArray(message)) {
                        message = message.join('; ');
                    }
                    if (typeof message !== 'string' || !message) {
                        message = `请求失败: ${res.statusCode}`;
                    }
                    // 控制台看完整错误；toast 最长约 14 字会截断，长文案以控制台为准
                    console.error('[api]', options.method || 'GET', options.url, res.statusCode, data);
                    wx.showToast({ title: String(message).slice(0, 40), icon: 'none', duration: 3500 });
                    reject(new Error(message));
                }
            },
            fail: (err) => {
                wx.showToast({ title: '网络错误', icon: 'none' });
                reject(err);
            },
        });
    });
}
exports.request = request;
function get(url) {
    return request({ url, method: 'GET' });
}
exports.get = get;
function post(url, data) {
    return request({ url, method: 'POST', data });
}
exports.post = post;
function patch(url, data) {
    return request({ url, method: 'PATCH', data });
}
exports.patch = patch;
