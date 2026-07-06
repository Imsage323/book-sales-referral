import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { OperationLogsService } from './operation-logs.service';

@Injectable()
export class OperationLogInterceptor implements NestInterceptor {
  constructor(private readonly operationLogsService: OperationLogsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    return next.handle().pipe(
      tap(async () => {
        try {
          await this.operationLogsService.log(
            user?.userId,
            `${request.method} ${request.path}`,
            request.params?.id || '-',
            { body: request.body },
          );
        } catch {
          // Operation logging is best-effort; do not fail the request.
        }
      }),
    );
  }
}
