import { ZodFirstPartyTypeKind, z } from 'zod';
import { ZodStatement, ZodStruct } from './createThriftToZodGenerator';
import { uniq } from './utils';

function constructSchemaName(structName: string) {
  if (structName.toLowerCase().endsWith('schema')) {
    return structName;
  }

  return `${structName}Schema`;
}

function constructDefaultValueString(
  defaultValue: any,
  dataType: ZodFirstPartyTypeKind
): string {
  switch (dataType) {
    case ZodFirstPartyTypeKind.ZodString:
      return `'${defaultValue}'`;
    case ZodFirstPartyTypeKind.ZodNumber:
      return `${defaultValue}`;
    case ZodFirstPartyTypeKind.ZodBoolean:
      return `${defaultValue}`;
    case ZodFirstPartyTypeKind.ZodArray:
      return `${defaultValue}`;
    default:
      return `${defaultValue}`;
  }
}

function extractZodDefaultValue(defaultValue?: Function): string {
  if (defaultValue == null) {
    return '';
  }
  if (typeof defaultValue === 'function') {
    return String(defaultValue());
  }

  return String(defaultValue);
}

function extractZodShape(shape: z.ZodRawShape): string {
  const serializedZodFields = Object.entries(shape).map(([key, value]) => {
    const manualZodStatement: ZodStatement = {
      name: key,
      field: value,
    };
    return serializedZodField(manualZodStatement);
  });

  return serializedZodFields.join(', ');
}

function extractRootZodFieldType(field: ZodStatement['field']): string {
  switch (field._def.typeName) {
    case ZodFirstPartyTypeKind.ZodString:
      return 'string';
    case ZodFirstPartyTypeKind.ZodNumber:
      return 'number';
    case ZodFirstPartyTypeKind.ZodBoolean:
      return 'boolean';
    case ZodFirstPartyTypeKind.ZodArray:
      return 'array';
    case ZodFirstPartyTypeKind.ZodDefault:
      return extractRootZodFieldType(field._def.innerType);
    case ZodFirstPartyTypeKind.ZodAny:
      return 'any';
    case ZodFirstPartyTypeKind.ZodUnknown:
      return 'unknown';
    case ZodFirstPartyTypeKind.ZodUnion: {
      const uniqueUnionTypes = uniq<string>(
        field._def.options
          .map((option: ZodStatement['field']) => {
            return extractRootZodFieldType(option);
          })
          .map((option: string) => {
            return `z.${option}()`;
          })
      );
      return `union([${uniqueUnionTypes.join(', ')}])`;
    }
    case ZodFirstPartyTypeKind.ZodObject: {
      const zodObject = field as z.ZodObject<any>;
      if (typeof zodObject._def.shape === 'function') {
        const shape = zodObject._def.shape();
        const innerShape = extractZodShape(shape);
        return `object({ ${innerShape} })`;
      }
      return 'object';
    }
    default: {
      return 'unknown';
    }
  }
}

export function extractZodFieldType(field: ZodStatement['field']): string {
  switch (field._def.typeName) {
    case ZodFirstPartyTypeKind.ZodString: {
      const type = extractRootZodFieldType(field);
      return `z.string()`;
    }
    case ZodFirstPartyTypeKind.ZodNumber:
      return 'z.number()';
    case ZodFirstPartyTypeKind.ZodBoolean:
      return 'z.boolean()';
    case ZodFirstPartyTypeKind.ZodArray: {
      const rawArrayType = extractRootZodFieldType(field._def.type);
      const hasMultipleArrayTypes =
        field._def.type._def.typeName === ZodFirstPartyTypeKind.ZodUnion &&
        Array.from(field._def.type._def.options || []).length > 1;

      if (hasMultipleArrayTypes) {
        return `z.array(z.${rawArrayType})`;
      }

      if (!rawArrayType.startsWith('object')) {
        return `z.array(z.${rawArrayType}())`;
      }

      return `z.array(z.${rawArrayType})`;
    }
    case ZodFirstPartyTypeKind.ZodDefault: {
      const innerType = extractRootZodFieldType(field._def.innerType);
      const defaultValue = extractZodDefaultValue(field._def.defaultValue);
      const formattedDefaultValue = constructDefaultValueString(
        defaultValue,
        field._def.innerType._def.typeName
      );
      return `z.${innerType}().default(${formattedDefaultValue})`;
    }
    default:
      return 'z.unknown()';
  }
}

function serializedZodField(fieldStatement: ZodStruct['fields'][0]): string {
  const field = fieldStatement.field;
  const serializedVariableName = fieldStatement.name;
  let serializedVariableValue = extractZodFieldType(field);

  return `${serializedVariableName}: ${serializedVariableValue}`;
}

function zodStructToZodSchemaCode(zodStruct: ZodStruct): string {
  // TODO: convert zodStruct to array?!
  // NO but maybe...
  const fieldValues = Array.from(zodStruct.fields.values());
  const serializedFieldValues = fieldValues.map((fieldValue) => {
    return serializedZodField(fieldValue);
  });

  return `
export const ${constructSchemaName(zodStruct.name)} = z.object({
  ${serializedFieldValues.join(',\n')}
});
  `;
}

export function codegenZodSchema(body: Array<ZodStruct>): string {
  if (body.length === 0) {
    throw new Error('Invalid body');
  }

  const code: string[] = [
    `// GENERATED CODE - DO NOT MANUALLY MODIFY`,
    `import { z } from 'zod';`,
  ];

  for (const schema of body) {
    const serializedSchema = zodStructToZodSchemaCode(schema);
    code.push(serializedSchema);
  }

  return code.join('\n');
}
