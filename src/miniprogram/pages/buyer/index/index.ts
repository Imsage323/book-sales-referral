import { get, post } from '../../../utils/api';
import type { AppOption } from '../../../app';
import { getPrivacyStatus, openPrivacyContract } from '../../../utils/privacy';

interface Seller {
  id: string;
  name: string;
  sellerCode: string;
  school: string;
  region: string;
}

interface Product {
  id: string;
  name: string;
  cover?: string;
  price: number;
  intro?: string;
  defaultQuantity: number;
  groupQrcode?: string;
}

interface QrcodeResolveResult {
  seller: Seller;
  product: Product | null;
  scene: string;
}

interface StorefrontResult {
  seller: Seller;
  product: Product;
  source: 'default';
}

interface Order {
  id: string;
  orderNo: string;
  status: string;
  totalAmount: number;
  quantity: number;
}

Page({
  data: {
    scene: '',
    loading: false,
    loadError: '',
    product: null as Product | null,
    seller: null as Seller | null,
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

  async onLoad(options: Record<string, string | undefined>) {
    const scene = options.scene || '';
    this.setData({ scene });
    await this.refreshPrivacyStatus();
    if (scene) {
      await this.loadProduct(scene);
    } else {
      await this.loadDefaultStorefront();
    }
  },

  async refreshPrivacyStatus() {
    try {
      const status = await getPrivacyStatus();
      this.setData({
        privacyAccepted: !status.needAuthorization,
        showPrivacyPrompt: status.needAuthorization,
        privacyContractName: status.privacyContractName,
      });
    } catch (err) {
      console.error('get privacy setting failed', err);
      this.setData({ privacyAccepted: false, showPrivacyPrompt: true });
    }
  },

  async loadProduct(scene: string) {
    this.setData({ loading: true, loadError: '', isDirect: false });
    try {
      const resolveResult = await get<QrcodeResolveResult>(`/qrcodes/${scene}/resolve`);
      if (!resolveResult.product) {
        wx.showToast({ title: '未关联产品', icon: 'none' });
        return;
      }

      const product = await get<Product>(`/products/public/${resolveResult.product.id}`);
      this.setData({
        product,
        seller: resolveResult.seller,
        quantity: product.defaultQuantity || 1,
      });

      if (this.data.privacyAccepted) {
        await this.recordScanLog(resolveResult.seller.sellerCode, scene, product.id);
      }
    } catch (err) {
      console.error('load product failed', err);
      this.setData({ loadError: '销售专属入口暂时无法打开，请稍后重试' });
    } finally {
      this.setData({ loading: false });
    }
  },

  async loadDefaultStorefront() {
    this.setData({ loading: true, loadError: '', isDirect: true });
    try {
      const result = await get<StorefrontResult>('/products/storefront');
      this.setData({
        product: result.product,
        seller: result.seller,
        quantity: result.product.defaultQuantity || 1,
      });
    } catch (err) {
      console.error('load default storefront failed', err);
      this.setData({ loadError: '普通购买入口尚未开放，请通过销售专属码进入' });
    } finally {
      this.setData({ loading: false });
    }
  },

  retryLoad() {
    if (this.data.scene) {
      this.loadProduct(this.data.scene);
    } else {
      this.loadDefaultStorefront();
    }
  },

  async recordScanLog(sellerCode: string, scene: string, productId: string) {
    try {
      await getApp<AppOption>().ensureBuyerToken();
      await post('/scan-logs', {
        sellerCode,
        scene,
        productId,
      });
    } catch (err) {
      console.error('record scan log failed', err);
    }
  },

  onQuantityInput(e: any) {
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

  async onBuy() {
    if (!this.data.privacyAccepted) {
      this.setData({ showPrivacyPrompt: true, pendingBuy: true });
      return;
    }
    await this.createOrder();
  },

  async onAgreePrivacyAuthorization() {
    this.setData({ privacyAccepted: true, showPrivacyPrompt: false });
    const { seller, product, scene, pendingBuy } = this.data;
    if (scene && seller && product) {
      await this.recordScanLog(seller.sellerCode, scene, product.id);
    }
    if (pendingBuy) {
      this.setData({ pendingBuy: false });
      await this.createOrder();
    }
  },

  onDeclinePrivacy() {
    this.setData({ showPrivacyPrompt: false, pendingBuy: false });
    wx.showToast({ title: '可继续浏览，购买前需同意隐私指引', icon: 'none' });
  },

  openPrivacyContract() {
    openPrivacyContract();
  },

  noop() {},

  async createOrder() {
    const { product, seller, quantity } = this.data;
    if (!product || !seller) {
      wx.showToast({ title: '产品信息未加载', icon: 'none' });
      return;
    }
    try {
      await getApp<AppOption>().ensureBuyerToken();
      const order = await post<Order>('/buyer/orders', {
        productId: product.id,
        sellerId: seller.id,
        quantity,
      });
      const groupQrcode = product.groupQrcode || '';
      wx.navigateTo({
        url: `/pages/buyer/pay/pay?orderId=${order.id}&groupQrcode=${encodeURIComponent(groupQrcode)}`,
      });
    } catch (err) {
      console.error('create order failed', err);
    }
  },
});
