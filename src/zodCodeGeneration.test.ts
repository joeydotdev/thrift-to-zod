import {
  expect,
  it,
  describe,
} from 'vitest';
import fs from 'fs';
import { z } from 'zod';
import { createThriftToZodGenerator } from './createThriftToZodGenerator';
import { codegenZodSchema, extractZodFieldType } from './zodCodeGeneration';

describe('extractZodFieldType', () => {
  it('should be able to handle nested zod string default types', () => {
    const defaultSchemaField = z.string().default('nestedFieldDefaultValue');
    const response = extractZodFieldType(defaultSchemaField);
    const expected = `z.string().default('nestedFieldDefaultValue')`;
    expect(response).toEqual(expected);
  });

  it('should be able to handle nested zod number default types', () => {
    const defaultSchemaField = z.number().default(123);
    const response = extractZodFieldType(defaultSchemaField);
    const expected = `z.number().default(123)`;
    expect(response).toEqual(expected);
  });

  it('should be able to handle nested zod boolean default types', () => {
    const defaultSchemaField = z.boolean().default(true);
    const response = extractZodFieldType(defaultSchemaField);
    const expected = `z.boolean().default(true)`;
    expect(response).toEqual(expected);
  });

  it('should be able to handle zod array with inner string type defined', () => {
    const defaultSchemaField = z.array(z.string());
    const response = extractZodFieldType(defaultSchemaField);
    const expected = `z.array(z.string())`;
    expect(response).toEqual(expected);
  });

  it('should be able to handle zod array with inner number type defined', () => {
    const defaultSchemaField = z.array(z.number());
    const response = extractZodFieldType(defaultSchemaField);
    const expected = `z.array(z.number())`;
    expect(response).toEqual(expected);
  });

  it('should be able to handle zod array with z.any type defined', () => {
    const defaultSchemaField = z.array(z.any());
    const response = extractZodFieldType(defaultSchemaField);
    const expected = `z.array(z.any())`;
    expect(response).toEqual(expected);
  });

  it('should be able to handle zod array with z.unknown type defined', () => {
    const defaultSchemaField = z.array(z.unknown());
    const response = extractZodFieldType(defaultSchemaField);
    const expected = `z.array(z.unknown())`;
    expect(response).toEqual(expected);
  })

  it('should be able to handle zod array with multiple inner zod types defined', () => {
    const defaultSchemaField = z.array(z.union([z.string(), z.number()]));
    const response = extractZodFieldType(defaultSchemaField);
    const expected = `z.array(z.union([z.string(), z.number()]))`;
    expect(response).toEqual(expected);
  });

  it('should be able to handle zod array with multiple duplicate inner types', () => {
    const defaultSchemaField = z.array(z.union([z.string(), z.number(), z.boolean(), z.string()]));
    const response = extractZodFieldType(defaultSchemaField);
    const expected = `z.array(z.union([z.string(), z.number(), z.boolean()]))`;
    expect(response).toEqual(expected);
  })
 
  it('should be able to handle a zod array with a custom zod object type', () => {
    const defaultSchemaField = z.array(z.object({
      name: z.string(),
      age: z.number(),
    }));
    const response = extractZodFieldType(defaultSchemaField);
    const expected = `z.array(z.object({ name: z.string(), age: z.number() }))`;
    expect(response).toEqual(expected);
  })

  it('should be able to handle a zod array with a custom zod object type with a default value', () => {
    const defaultSchemaField = z.array(z.object({
      name: z.string(),
      age: z.number(),
    }).default({ name: 'defaultName', age: 123 }));
    const response = extractZodFieldType(defaultSchemaField);
    const expected = `z.array(z.object({ name: z.string(), age: z.number() }).default({ name: 'defaultName', age: 123 }))`;
    expect(response).toEqual(expected);
  });
})

describe.skip('createThriftToZodGenerator2', () => {
  it('should parse file', () => {
    const path = `${__dirname}/fixtures/service.thrift`;
    const body = createThriftToZodGenerator({
      rootThriftPath: path,
      disableOptionalFields: true,
    });
    const template = codegenZodSchema(body);
    if (!fs.existsSync(`${__dirname}/generated`)) {
      fs.mkdirSync(`${__dirname}/generated`);
    }
    fs.writeFileSync(`${__dirname}/generated/service.ts`, template);
    expect(true).toEqual(true);
  });
});
