Page({
  data: {
    groupQrcode: '',
  },

  onLoad(options: Record<string, string | undefined>) {
    const groupQrcode = options.groupQrcode || '';
    if (!groupQrcode) {
      wx.showToast({ title: '缺少群二维码', icon: 'none' });
      return;
    }
    this.setData({ groupQrcode });
  },
});
