import { generateOrderNo } from './order-number.generator';

describe('generateOrderNo', () => {
  it('should generate an order number in O-YYYYMMDD-XXXX format', () => {
    const orderNo = generateOrderNo();
    expect(orderNo).toMatch(/^O-\d{8}-\d{4}$/);
  });

  it('should generate different order numbers on multiple calls', () => {
    const orderNos = new Set(Array.from({ length: 10 }, generateOrderNo));
    expect(orderNos.size).toBe(10);
  });
});
