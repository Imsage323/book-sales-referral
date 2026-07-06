import { Injectable, OnModuleInit, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';

@Injectable()
export class ProductsService implements OnModuleInit {
  constructor(
    @InjectRepository(Product)
    private readonly repo: Repository<Product>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureDefaultProduct();
  }

  async create(dto: CreateProductDto): Promise<Product> {
    const product = this.repo.create(dto);
    return this.repo.save(product);
  }

  async findAll(query: QueryProductDto): Promise<{ items: Product[]; total: number }> {
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
