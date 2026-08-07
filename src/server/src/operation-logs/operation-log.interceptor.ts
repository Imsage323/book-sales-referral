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
          const isAdmin = user?.tokenType === 'admin';
          const detail = buildOperationLogDetail(
            request.path,
            user?.tokenType,
            request.body,
          );
          await this.operationLogsService.log(
            isAdmin ? user.userId : undefined,
            `${request.method} ${request.path}`,
            request.params?.id || '-',
            detail,
          );
        } catch {
          // Operation logging is best-effort; do not fail the request.
        }
      }),
    );
  }
}

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordHash',
  'token',
  'accessToken',
  'authorization',
  'code',
  'openid',
  'session_key',
  'sessionKey',
  'phone',
  'recipient',
  'name',
  'address',
  'addressDetail',
  'rawBody',
  'paySign',
]);

export function sanitizeForLog(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeForLog);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
      key,
      SENSITIVE_KEYS.has(key) ? '[REDACTED]' : sanitizeForLog(entry),
    ]),
  );
}

export function buildOperationLogDetail(
  path: string,
  tokenType: string | undefined,
  body: unknown,
): Record<string, unknown> {
  if (tokenType !== 'admin' || path.endsWith('/auth/login')) {
    return { result: 'success' };
  }
  return { body: sanitizeForLog(body) };
}
