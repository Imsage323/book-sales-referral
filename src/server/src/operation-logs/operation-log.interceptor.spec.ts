import {
  buildOperationLogDetail,
  sanitizeForLog,
} from './operation-log.interceptor';

describe('sanitizeForLog', () => {
  it('redacts sensitive values recursively while preserving safe fields', () => {
    expect(
      sanitizeForLog({
        status: 'paid',
        password: 'secret',
        nested: {
          phone: '13800138000',
          remark: 'safe',
        },
      }),
    ).toEqual({
      status: 'paid',
      password: '[REDACTED]',
      nested: {
        phone: '[REDACTED]',
        remark: 'safe',
      },
    });
  });

  it('does not record request bodies for login or buyer actions', () => {
    expect(
      buildOperationLogDetail('/api/auth/login', undefined, {
        password: 'secret',
      }),
    ).toEqual({ result: 'success' });
    expect(
      buildOperationLogDetail('/api/buyer/orders', 'buyer', {
        address: 'private',
      }),
    ).toEqual({ result: 'success' });
  });
});
