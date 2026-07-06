import { generateSellerCode } from './seller-code.generator';

describe('generateSellerCode', () => {
  it('should generate a code starting with S followed by 6 characters', () => {
    const code = generateSellerCode();
    expect(code).toMatch(/^S[A-Z0-9]{6}$/);
  });

  it('should generate different codes on multiple calls', () => {
    const codes = new Set(Array.from({ length: 10 }, generateSellerCode));
    expect(codes.size).toBe(10);
  });
});
