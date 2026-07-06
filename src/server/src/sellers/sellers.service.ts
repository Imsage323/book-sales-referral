import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Seller, SellerStatus } from './entities/seller.entity';
import { CreateSellerDto } from './dto/create-seller.dto';
import { UpdateSellerDto } from './dto/update-seller.dto';
import { QuerySellerDto } from './dto/query-seller.dto';
import { generateSellerCode } from './seller-code.generator';

@Injectable()
export class SellersService {
  constructor(
    @InjectRepository(Seller)
    private readonly repo: Repository<Seller>,
  ) {}

  async create(dto: CreateSellerDto): Promise<Seller> {
    if (dto.parentId) {
      await this.validateParentExists(dto.parentId);
    }

    const sellerCode = dto.sellerCode || (await this.generateUniqueCode());
    const seller = this.repo.create({ ...dto, sellerCode });
    return this.repo.save(seller);
  }

  async findAll(query: QuerySellerDto): Promise<{ items: Seller[]; total: number }> {
    const { keyword, status, page = 1, pageSize = 20 } = query;

    let where: any = {};
    if (status) {
      where.status = status;
    }
    if (keyword) {
      where = [
        { ...where, name: Like(`%${keyword}%`) },
        { ...where, sellerCode: Like(`%${keyword}%`) },
      ];
    }

    const [items, total] = await this.repo.findAndCount({
      where,
      relations: { parent: true },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return { items, total };
  }

  async findOne(id: string): Promise<Seller> {
    const seller = await this.repo.findOne({
      where: { id },
      relations: { parent: true, children: true },
    });
    if (!seller) {
      throw new NotFoundException('销售方不存在');
    }
    return seller;
  }

  async update(id: string, dto: UpdateSellerDto): Promise<Seller> {
    const seller = await this.findOne(id);

    if (dto.parentId) {
      if (dto.parentId === id) {
        throw new BadRequestException('不能将自己设为上级');
      }
      await this.validateParentExists(dto.parentId);
      await this.validateNoCycle(id, dto.parentId);
    }

    Object.assign(seller, dto);
    return this.repo.save(seller);
  }

  async remove(id: string): Promise<void> {
    const seller = await this.findOne(id);
    if (seller.children && seller.children.length > 0) {
      throw new BadRequestException('存在下级销售方，无法删除');
    }
    await this.repo.delete(id);
  }

  async findByCode(sellerCode: string): Promise<Seller | null> {
    return this.repo.findOne({ where: { sellerCode } });
  }

  private async validateParentExists(parentId: string): Promise<void> {
    const parent = await this.repo.findOne({ where: { id: parentId } });
    if (!parent) {
      throw new NotFoundException('上级销售方不存在');
    }
  }

  private async validateNoCycle(sellerId: string, parentId: string): Promise<void> {
    let currentId: string | undefined = parentId;
    const visited = new Set<string>();
    while (currentId) {
      if (currentId === sellerId) {
        throw new BadRequestException('不能形成循环推荐关系');
      }
      if (visited.has(currentId)) {
        break;
      }
      visited.add(currentId);
      const current = await this.repo.findOne({
        where: { id: currentId },
        relations: { parent: true },
      });
      if (!current) {
        break;
      }
      currentId = current.parent?.id;
    }
  }

  private async generateUniqueCode(): Promise<string> {
    let attempts = 0;
    while (attempts < 10) {
      const code = generateSellerCode();
      const existing = await this.repo.findOne({ where: { sellerCode: code } });
      if (!existing) {
        return code;
      }
      attempts++;
    }
    throw new Error('无法生成唯一销售方编码');
  }
}
