export interface PrivacyStatus {
  needAuthorization: boolean;
  privacyContractName: string;
}

export function getPrivacyStatus(): Promise<PrivacyStatus> {
  return new Promise((resolve, reject) => {
    wx.getPrivacySetting({
      success: (res) =>
        resolve({
          needAuthorization: Boolean(res.needAuthorization),
          privacyContractName: res.privacyContractName || '小程序用户隐私保护指引',
        }),
      fail: reject,
    });
  });
}

export function openPrivacyContract(): void {
  wx.openPrivacyContract({
    fail: (err) => {
      console.error('open privacy contract failed', err);
      wx.showToast({ title: '隐私指引暂时无法打开', icon: 'none' });
    },
  });
}
