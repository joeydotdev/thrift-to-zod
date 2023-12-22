import {
  FieldDefinition as ThriftFieldDefinition,
  FunctionType as ThriftFunctionType,
  StructDefinition as ThriftStructDefinition,
  SyntaxType as ThriftSyntaxType,
  ThriftStatement as ThriftStatement,
  ConstValue as ThriftConstValue,
  parse as thriftParse,
} from '@creditkarma/thrift-parser';
import { z } from 'zod';
import fs from 'fs';

type ThriftToZodGeneratorOpts = {
  rootThriftPath: string;
  disableOptionalFields?: boolean;
};

type ZodStatement<T extends z.ZodTypeAny = z.ZodTypeAny> = {
  field: T;
  annotations: Map<any, any>;
};

let globalOpts: ThriftToZodGeneratorOpts;

function thriftStatementToZodStatement(statement: ThriftStatement) {
  switch (statement.type) {
    case ThriftSyntaxType.StructDefinition:
      return thriftStructToZodStruct(statement);
    default:
      return null;
  }
}

function thriftConstValueToConst(
  thriftConstValue: ThriftConstValue
): Number | String | Boolean | Map<any, any> | Array<any> | null {
  switch (thriftConstValue.type) {
    case ThriftSyntaxType.BooleanLiteral:
      return Boolean(thriftConstValue.value);
    case ThriftSyntaxType.StringLiteral:
    case ThriftSyntaxType.IntConstant:
    case ThriftSyntaxType.DoubleConstant:
      return Number(thriftConstValue.value);
    case ThriftSyntaxType.ConstMap: {
      const map = new Map();
      for (const property of thriftConstValue.properties) {
        const key = thriftConstValueToConst(property.name);
        const value = thriftConstValueToConst(property.initializer);
        map.set(key, value);
      }
      return map;
    }
    case ThriftSyntaxType.ConstList: {
      return thriftConstValue.elements.map((element: ThriftConstValue) => {
        return thriftConstValueToConst(element);
      });
    }
    case ThriftSyntaxType.Identifier:
      return thriftConstValue.value;
    default:
      return null;
  }
}

function thriftFunctionTypeToZodFunctionType(
  thriftFunction: ThriftFunctionType
): z.ZodTypeAny {
  switch (thriftFunction.type) {
    case ThriftSyntaxType.ByteKeyword:
    case ThriftSyntaxType.I16Keyword:
    case ThriftSyntaxType.I32Keyword:
    case ThriftSyntaxType.I64Keyword:
    case ThriftSyntaxType.DoubleKeyword:
      return z.number();
    case ThriftSyntaxType.StringKeyword:
    case ThriftSyntaxType.BinaryKeyword:
      return z.string();
    case ThriftSyntaxType.VoidKeyword:
      return z.void();
    case ThriftSyntaxType.BoolKeyword:
      return z.boolean();
    case ThriftSyntaxType.ListType: {
      const value = thriftFunctionTypeToZodFunctionType(
        thriftFunction.valueType
      );
      return z.array(value);
    }
    case ThriftSyntaxType.SetType: {
      const value = thriftFunctionTypeToZodFunctionType(
        thriftFunction.valueType
      );
      return z.set(value);
    }
    case ThriftSyntaxType.MapType: {
      const key = thriftFunctionTypeToZodFunctionType(thriftFunction.keyType);
      const value = thriftFunctionTypeToZodFunctionType(
        thriftFunction.valueType
      );
      return z.record(key, value);
    }
    case ThriftSyntaxType.Identifier:
      return z.unknown();
    default:
      return z.unknown();
  }
}

function thriftFieldToZodField(thriftField: ThriftFieldDefinition) {
  let zodFunctionType = thriftFunctionTypeToZodFunctionType(
    thriftField.fieldType
  );

  if (thriftField.defaultValue != null) {
    const defaultValue = thriftConstValueToConst(thriftField.defaultValue);
    zodFunctionType = zodFunctionType.default(defaultValue);
  }

  if (
    globalOpts.disableOptionalFields !== true &&
    thriftField.requiredness === 'optional'
  ) {
    zodFunctionType = zodFunctionType.optional();
  }

  return zodFunctionType;
}

function thriftStructToZodStruct(thriftStruct: ThriftStructDefinition) {
  const zodFields = new Map<string, ZodStatement>();

  for (const thriftField of thriftStruct.fields) {
    const thriftAnnotations = Array.from(
      thriftField.annotations?.annotations ?? []
    );
    const zodField = thriftFieldToZodField(thriftField);
    const zodAnnotations = new Map<any, any>();

    for (const thriftAnnotation of thriftAnnotations) {
      if (!thriftAnnotation.value) {
        console.warn(`Annotation ${thriftAnnotation.name.value} has no value`);
        continue;
      }

      zodAnnotations.set(
        thriftAnnotation.name.value,
        thriftAnnotation.value.value
      );
    }

    zodFields.set(thriftField.name.value, {
      field: zodField,
      annotations: zodAnnotations,
    });
  }

  return zodFields;
}

export function createThriftToZodGenerator(opts: ThriftToZodGeneratorOpts) {
  globalOpts = opts;

  const thriftFile = fs.readFileSync(opts.rootThriftPath, 'utf-8');
  if (!thriftFile) {
    throw new Error(`No thrift file found at ${opts.rootThriftPath}`);
  }

  const thriftAst = thriftParse(thriftFile);
  if (thriftAst.type === ThriftSyntaxType.ThriftErrors) {
    throw new Error(`Thrift parse errors: ${thriftAst.errors}`);
  }

  const zodBody: Array<Map<string, ZodStatement>> = [];
  for (const thriftStatement of thriftAst.body) {
    const zodStatement = thriftStatementToZodStatement(thriftStatement);
    if (zodStatement == null) {
      console.warn(`Unsupported thrift statement: ${thriftStatement.type}`);
      continue;
    }

    zodBody.push(zodStatement);
  }

  return zodBody;
}
