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

export function request<T = any>(options: ApiRequestOptions): Promise<T> {
  const baseUrl = getBaseUrl();

  return new Promise((resolve, reject) => {
    wx.request({
      url: `${baseUrl}${options.url}`,
      method: options.method as any,
      data: options.data,
      header: {
        'Content-Type': 'application/json',
        ...(options.header || {}),
      },
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data as T);
        } else {
          const message = (res.data && (res.data as any).message) || `请求失败: ${res.statusCode}`;
          wx.showToast({ title: message, icon: 'none' });
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
