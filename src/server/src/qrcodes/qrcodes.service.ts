import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SellerQrcode } from '../sellers/entities/seller-qrcode.entity';
import { SellersService } from '../sellers/sellers.service';
import { ProductsService } from '../products/products.service';
import { CreateQrcodeDto } from './dto/create-qrcode.dto';
import { QueryQrcodeDto } from './dto/query-qrcode.dto';
import { generatePlaceholderQrcode } from './qrcode-image.generator';
import { SellerStatus } from '../sellers/entities/seller.entity';

@Injectable()
export class QrcodesService {
  constructor(
    @InjectRepository(SellerQrcode)
    private readonly repo: Repository<SellerQrcode>,
    private readonly sellersService: SellersService,
    private readonly productsService: ProductsService,
  ) {}

  async create(dto: CreateQrcodeDto): Promise<SellerQrcode> {
    await this.sellersService.findOne(dto.sellerId);
    if (dto.productId) {
      await this.productsService.findOne(dto.productId);
    }

    const qrcode = this.repo.create({
      sellerId: dto.sellerId,
      productId: dto.productId,
      imageUrl: '',
    });
    const saved = await this.repo.save(qrcode);
    const scene = this.buildScene(saved.id);
    saved.imageUrl = generatePlaceholderQrcode(scene);
    return this.repo.save(saved);
  }

  async findAll(
    query: QueryQrcodeDto,
  ): Promise<{ items: SellerQrcode[]; total: number }> {
    const { sellerId, productId, page = 1, pageSize = 20 } = query;
    const where: any = {};
    if (sellerId) where.sellerId = sellerId;
    if (productId) where.productId = productId;

    const [items, total] = await this.repo.findAndCount({
      where,
      relations: { seller: true },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return { items, total };
  }

  async findOne(id: string): Promise<SellerQrcode> {
    const qrcode = await this.repo.findOne({
      where: { id },
      relations: { seller: true },
    });
    if (!qrcode) {
      throw new NotFoundException('二维码不存在');
    }
    return qrcode;
  }

  async getImageData(id: string): Promise<{ buffer: Buffer; contentType: string }> {
    const qrcode = await this.findOne(id);
    const dataUrl = qrcode.imageUrl;
    if (!dataUrl || !dataUrl.startsWith('data:image/svg+xml;base64,')) {
      throw new NotFoundException('二维码图片不存在');
    }
    const base64 = dataUrl.replace('data:image/svg+xml;base64,', '');
    const buffer = Buffer.from(base64, 'base64');
    return { buffer, contentType: 'image/svg+xml' };
  }

  async resolve(
    id: string,
  ): Promise<{ seller: any; product: any | null; scene: string }> {
    const qrcode = await this.findOne(id);
    const seller = await this.sellersService.findOne(qrcode.sellerId);
    if (seller.status !== SellerStatus.ACTIVE) {
      throw new BadRequestException('销售方已停用');
    }

    let product = null;
    if (qrcode.productId) {
      product = await this.productsService.findOne(qrcode.productId);
      if (!product.isOnSale) {
        throw new BadRequestException('产品已下架');
      }
    }

    const scene = this.buildScene(qrcode.id);
    return {
      seller: {
        id: seller.id,
        name: seller.name,
        sellerCode: seller.sellerCode,
        school: seller.school,
        region: seller.region,
      },
      product: product
        ? {
            id: product.id,
            name: product.name,
            cover: product.cover,
            price: product.price,
            intro: product.intro,
            defaultQuantity: product.defaultQuantity,
            groupQrcode: product.groupQrcode,
          }
        : null,
      scene,
    };
  }

  private buildScene(id: string): string {
    return id.replace(/-/g, '');
  }
}
