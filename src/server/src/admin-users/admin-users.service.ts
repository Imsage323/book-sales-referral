import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminUser, AdminRole } from './entities/admin-user.entity';

@Injectable()
export class AdminUsersService {
  constructor(
    @InjectRepository(AdminUser)
    private readonly repo: Repository<AdminUser>,
  ) {}

  async findByUsername(username: string): Promise<AdminUser | null> {
    return this.repo.findOne({ where: { username } });
  }

  async create(data: {
    username: string;
    passwordHash: string;
    role: AdminRole;
  }): Promise<AdminUser> {
    return this.repo.save(data);
  }
}
