import { post } from './utils/api';

export interface AppOption {
  globalData: {
    apiBaseUrl: string;
    buyerToken: string;
  };
  ensureBuyerToken(): Promise<string>;
}

App<AppOption>({
  globalData: {
    apiBaseUrl: 'https://xn--4oqx7jk6ghq7b.com/api',
    buyerToken: '',
  },
  onLaunch() {
    console.log('小程序启动');
  },
  async ensureBuyerToken(): Promise<string> {
    const cached = this.globalData.buyerToken || wx.getStorageSync('buyerToken');
    if (cached) {
      this.globalData.buyerToken = cached;
      return cached;
    }
    const code = await new Promise<string>((resolve, reject) => {
      wx.login({
        success: (res) => (res.code ? resolve(res.code) : reject(new Error('wx.login 未返回 code'))),
        fail: reject,
      });
    });
    const { accessToken } = await post<{ accessToken: string }>('/wx/login', { code });
    this.globalData.buyerToken = accessToken;
    wx.setStorageSync('buyerToken', accessToken);
    return accessToken;
  },
});
