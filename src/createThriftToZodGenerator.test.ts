import {
  afterAll,
  afterEach,
  beforeAll,
  expect,
  it,
  describe,
  assert,
} from 'vitest';
import { createThriftToZodGenerator } from './createThriftToZodGenerator';

describe('createThriftToZodGenerator', () => {
  it('should parse file', () => {
    const path = `${__dirname}/fixtures/service.thrift`;
    const body = createThriftToZodGenerator({
      rootThriftPath: path,
      disableOptionalFields: true,
    });

    const corgi = body[0];
    expect(corgi.get('name')?.field?._def.typeName).toEqual('ZodString');
    expect(corgi.get('age')?.field?._def.typeName).toEqual('ZodNumber');
    expect(corgi.get('weight')?.field?._def.typeName).toEqual('ZodNumber');
    expect(corgi.get('color')?.field?._def.typeName).toEqual('ZodString');
    expect(corgi.get('is_cute')?.field?._def.typeName).toEqual('ZodDefault');
    expect(corgi.get('is_cute')?.field?._def.defaultValue()).toEqual(true);
  });
});
