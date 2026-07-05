import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OperationLog } from './entities/operation-log.entity';
import { OperationLogsService } from './operation-logs.service';
import { OperationLogInterceptor } from './operation-log.interceptor';

@Module({
  imports: [TypeOrmModule.forFeature([OperationLog])],
  providers: [OperationLogsService, OperationLogInterceptor],
  exports: [OperationLogsService, OperationLogInterceptor],
})
export class OperationLogsModule {}
