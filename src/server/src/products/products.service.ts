import {
  Injectable,
  OnModuleInit,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { SellersService } from '../sellers/sellers.service';
import { SellerStatus } from '../sellers/entities/seller.entity';

@Injectable()
export class ProductsService implements OnModuleInit {
  constructor(
    @InjectRepository(Product)
    private readonly repo: Repository<Product>,
    private readonly sellersService: SellersService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureDefaultProduct();
  }

  async create(dto: CreateProductDto): Promise<Product> {
    const product = this.repo.create(dto);
    return this.repo.save(product);
  }

  async findAll(
    query: QueryProductDto,
  ): Promise<{ items: Product[]; total: number }> {
    const { keyword, isOnSale, page = 1, pageSize = 20 } = query;
    const where: any = {};
    if (isOnSale !== undefined) {
      where.isOnSale = isOnSale;
    }
    if (keyword) {
      where.name = Like(`%${keyword}%`);
    }

    const [items, total] = await this.repo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return { items, total };
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.repo.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException('产品不存在');
    }
    return product;
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id);
    Object.assign(product, dto);
    return this.repo.save(product);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.repo.delete(id);
  }

  async findPublic(
    id: string,
  ): Promise<{
    id: string;
    name: string;
    cover?: string;
    price: number;
    intro?: string;
    defaultQuantity: number;
    groupQrcode?: string;
    isOnSale: boolean;
  }> {
    const product = await this.findOne(id);
    if (!product.isOnSale) {
      throw new NotFoundException('产品已下架');
    }
    return {
      id: product.id,
      name: product.name,
      cover: product.cover,
      price: product.price,
      intro: product.intro,
      defaultQuantity: product.defaultQuantity,
      groupQrcode: product.groupQrcode,
      isOnSale: product.isOnSale,
    };
  }

  async findStorefront() {
    const sellerCode = this.configService
      .get<string>('DEFAULT_SELLER_CODE')
      ?.trim();
    const productId = this.configService
      .get<string>('DEFAULT_PRODUCT_ID')
      ?.trim();
    if (!sellerCode || !productId) {
      throw new ServiceUnavailableException('普通购买入口尚未配置');
    }

    const seller = await this.sellersService.findByCode(sellerCode);
    if (!seller || seller.status !== SellerStatus.ACTIVE) {
      throw new ServiceUnavailableException('默认销售方不可用');
    }

    const product = await this.repo.findOne({ where: { id: productId } });
    if (!product || !product.isOnSale) {
      throw new ServiceUnavailableException('默认商品不可用');
    }

    return {
      seller: {
        id: seller.id,
        name: seller.name,
        sellerCode: seller.sellerCode,
        school: seller.school,
        region: seller.region,
      },
      product: this.toPublicProduct(product),
      source: 'default' as const,
    };
  }

  private toPublicProduct(product: Product) {
    return {
      id: product.id,
      name: product.name,
      cover: product.cover,
      price: product.price,
      intro: product.intro,
      defaultQuantity: product.defaultQuantity,
      groupQrcode: product.groupQrcode,
      isOnSale: product.isOnSale,
    };
  }

  private async ensureDefaultProduct(): Promise<void> {
    const count = await this.repo.count();
    if (count === 0) {
      const defaultProduct = this.repo.create({
        name: '《高三学业生涯导航日历》',
        price: 1, // 分，占位价格 0.01 元
        isOnSale: true,
        defaultQuantity: 1,
        aftersaleDays: 7,
      });
      await this.repo.save(defaultProduct);
    }
  }
}
