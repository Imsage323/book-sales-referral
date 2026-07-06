import { get, post } from '../../../utils/api';

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
    product: null as Product | null,
    seller: null as Seller | null,
    quantity: 1,
  },

  onLoad(options: Record<string, string | undefined>) {
    const scene = options.scene || '';
    if (!scene) {
      wx.showToast({ title: '缺少二维码参数', icon: 'none' });
      return;
    }
    this.setData({ scene });
    this.loadProduct(scene);
  },

  async loadProduct(scene: string) {
    this.setData({ loading: true });
    try {
      const resolveResult = await get<QrcodeResolveResult>(`/qrcodes/${scene}/resolve`);
      if (!resolveResult.product) {
        wx.showToast({ title: '未关联产品', icon: 'none' });
        return;
      }

      const product = await get<Product>(`/products/${resolveResult.product.id}/public`);
      this.setData({
        product,
        seller: resolveResult.seller,
        quantity: product.defaultQuantity || 1,
      });

      await this.recordScanLog(resolveResult.seller.sellerCode, scene, product.id);
    } catch (err) {
      console.error('load product failed', err);
    } finally {
      this.setData({ loading: false });
    }
  },

  async recordScanLog(sellerCode: string, scene: string, productId: string) {
    try {
      await post('/scan-logs', {
        sellerCode,
        openid: 'mp-openid-placeholder',
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
    const { product, seller, quantity } = this.data;
    if (!product || !seller) {
      wx.showToast({ title: '产品信息未加载', icon: 'none' });
      return;
    }
    try {
      const order = await post<Order>('/orders', {
        productId: product.id,
        sellerId: seller.id,
        openid: 'mp-openid-placeholder',
        quantity,
      });
      const groupQrcode = product.groupQrcode || '';
      wx.navigateTo({
        url: `/pages/buyer/address/address?orderId=${order.id}&groupQrcode=${encodeURIComponent(groupQrcode)}`,
      });
    } catch (err) {
      console.error('create order failed', err);
    }
  },
});
