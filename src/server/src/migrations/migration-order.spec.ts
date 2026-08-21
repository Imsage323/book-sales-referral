import { QueryRunner } from 'typeorm';
import { IncreaseQrcodeImageUrlLength1752080000000 } from './1752080000000-IncreaseQrcodeImageUrlLength';
import { InitialSchema1783305843637 } from './1783305843637-InitialSchema';

describe('migration order compatibility', () => {
  it('skips the historical resize migration before the table exists', async () => {
    const queryRunner = {
      hasTable: jest.fn().mockResolvedValue(false),
      query: jest.fn(),
    } as unknown as QueryRunner;

    await new IncreaseQrcodeImageUrlLength1752080000000().up(queryRunner);

    expect(queryRunner.hasTable).toHaveBeenCalledWith('seller_qrcodes');
    expect(queryRunner.query).not.toHaveBeenCalled();
  });

  it('keeps resizing an existing table for an upgrading database', async () => {
    const queryRunner = {
      hasTable: jest.fn().mockResolvedValue(true),
      query: jest.fn().mockResolvedValue(undefined),
    } as unknown as QueryRunner;

    await new IncreaseQrcodeImageUrlLength1752080000000().up(queryRunner);

    expect(queryRunner.query).toHaveBeenCalledWith(
      expect.stringContaining('varchar(2000)'),
    );
  });

  it('creates the correct imageUrl length in a fresh database', async () => {
    const queries: string[] = [];
    const queryRunner = {
      query: jest.fn().mockImplementation(async (sql: string) => {
        queries.push(sql);
      }),
    } as unknown as QueryRunner;

    await new InitialSchema1783305843637().up(queryRunner);

    const createQrcodeTable = queries.find((sql) =>
      sql.includes('CREATE TABLE `seller_qrcodes`'),
    );
    expect(createQrcodeTable).toContain('`imageUrl` varchar(2000) NOT NULL');
  });
});
