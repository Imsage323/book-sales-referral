import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OperationLog } from './entities/operation-log.entity';

@Injectable()
export class OperationLogsService {
  constructor(
    @InjectRepository(OperationLog)
    private readonly repo: Repository<OperationLog>,
  ) {}

  async log(
    adminId: string | undefined,
    action: string,
    target: string,
    detail: Record<string, unknown>,
  ): Promise<void> {
    await this.repo.save({ adminId, action, target, detail });
  }
}
