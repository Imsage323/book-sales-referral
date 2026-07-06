import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScanLogsService } from './scan-logs.service';
import { ScanLogsController } from './scan-logs.controller';
import { ScanLog } from './entities/scan-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ScanLog])],
  controllers: [ScanLogsController],
  providers: [ScanLogsService],
  exports: [ScanLogsService],
})
export class ScanLogsModule {}
