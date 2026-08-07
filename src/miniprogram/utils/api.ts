type RequestMethod = 'OPTIONS' | 'GET' | 'HEAD' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'TRACE' | 'CONNECT';

interface ApiRequestOptions {
  url: string;
  method?: RequestMethod;
  data?: any;
  header?: Record<string, string>;
}

function getBaseUrl(): string {
  const app = getApp();
  return (app && app.globalData && app.globalData.apiBaseUrl) || '';
}

function getBuyerToken(): string {
  const app = getApp();
  return (app && app.globalData && app.globalData.buyerToken) || wx.getStorageSync('buyerToken') || '';
}

export function request<T = any>(options: ApiRequestOptions): Promise<T> {
  const baseUrl = getBaseUrl();
  const buyerToken = getBuyerToken();

  return new Promise((resolve, reject) => {
    wx.request({
      url: `${baseUrl}${options.url}`,
      method: options.method as any,
      data: options.data,
      header: {
        'Content-Type': 'application/json',
        ...(buyerToken ? { Authorization: `Bearer ${buyerToken}` } : {}),
        ...(options.header || {}),
      },
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data as T);
        } else {
          if (res.statusCode === 401 && buyerToken) {
            wx.removeStorageSync('buyerToken');
            const app = getApp();
            if (app && app.globalData) app.globalData.buyerToken = '';
          }
          const data = res.data as any;
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

export function get<T = any>(url: string): Promise<T> {
  return request<T>({ url, method: 'GET' });
}

export function post<T = any>(url: string, data?: any): Promise<T> {
  return request<T>({ url, method: 'POST', data });
}

export function patch<T = any>(url: string, data?: any): Promise<T> {
  return request<T>({ url, method: 'PATCH', data });
}
