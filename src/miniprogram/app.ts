import { post } from './utils/api';

export interface AppOption {
  globalData: {
    apiBaseUrl: string;
    openid: string;
  };
  ensureOpenid(): Promise<string>;
}

App<AppOption>({
  globalData: {
    apiBaseUrl: 'https://server-278630-6-1450945147.sh.run.tcloudbase.com/api',
    openid: '',
  },
  onLaunch() {
    console.log('小程序启动');
    // 启动时静默登录，缓存 openid 供下单/扫码日志使用
    this.ensureOpenid().catch((err) => console.error('silent login failed', err));
  },
  async ensureOpenid(): Promise<string> {
    if (this.globalData.openid) {
      return this.globalData.openid;
    }
    const code = await new Promise<string>((resolve, reject) => {
      wx.login({
        success: (res) => (res.code ? resolve(res.code) : reject(new Error('wx.login 未返回 code'))),
        fail: reject,
      });
    });
    const { openid } = await post<{ openid: string }>('/wx/login', { code });
    this.globalData.openid = openid;
    return openid;
  },
});
