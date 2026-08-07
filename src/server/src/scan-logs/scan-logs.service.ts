import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScanLog } from './entities/scan-log.entity';
import { CreateScanLogDto } from './dto/create-scan-log.dto';

@Injectable()
export class ScanLogsService {
  constructor(
    @InjectRepository(ScanLog)
    private readonly repo: Repository<ScanLog>,
  ) {}

  async create(dto: CreateScanLogDto, openid: string): Promise<ScanLog> {
    const log = this.repo.create({ ...dto, openid });
    return this.repo.save(log);
  }
}
