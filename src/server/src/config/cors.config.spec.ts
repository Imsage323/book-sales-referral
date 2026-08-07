import { getCorsOrigins } from './cors.config';

describe('getCorsOrigins', () => {
  it('denies unspecified cross-origin requests in production', () => {
    expect(getCorsOrigins({ NODE_ENV: 'production' })).toEqual([]);
  });

  it('uses only explicitly configured origins', () => {
    expect(
      getCorsOrigins({
        NODE_ENV: 'production',
        CORS_ORIGINS: 'https://admin.example.com, https://ops.example.com ',
      }),
    ).toEqual(['https://admin.example.com', 'https://ops.example.com']);
  });
});
