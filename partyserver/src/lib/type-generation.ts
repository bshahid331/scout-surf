/**
 * Type Generation Utilities
 *
 * Converts Zod schemas to TypeScript type strings for SDK generation
 */

import { z } from 'zod';

/**
 * Convert a Zod schema to a TypeScript type string
 * This is a simplified converter for common schema types
 */
export function zodSchemaToTypeScript(
  schema: z.ZodType<any> | undefined,
  typeName: string = 'any',
): string {
  if (!schema) {
    return 'any';
  }

  // Handle ZodType instances
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape;
    const properties: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      const zodValue = value as z.ZodType<any>;
      const optional = zodValue.isOptional() ? '?' : '';
      const type = getZodTypeString(zodValue);
      properties.push(`  ${key}${optional}: ${type};`);
    }

    return `{\n${properties.join('\n')}\n}`;
  }

  return getZodTypeString(schema);
}

/**
 * Get TypeScript type string for a Zod type
 */
function getZodTypeString(zodType: z.ZodType<any>): string {
  // Handle optional types
  if (zodType instanceof z.ZodOptional) {
    return `${getZodTypeString(zodType.unwrap() as any)} | undefined`;
  }

  // Handle nullable types
  if (zodType instanceof z.ZodNullable) {
    return `${getZodTypeString(zodType.unwrap() as any)} | null`;
  }

  // Handle basic types
  if (zodType instanceof z.ZodString) {
    return 'string';
  }

  if (zodType instanceof z.ZodNumber) {
    return 'number';
  }

  if (zodType instanceof z.ZodBoolean) {
    return 'boolean';
  }

  if (zodType instanceof z.ZodArray) {
    const elementType = getZodTypeString(zodType.element as any);
    return `${elementType}[]`;
  }

  if (zodType instanceof z.ZodEnum) {
    const values = zodType.options.map((v: any) => `'${v}'`).join(' | ');
    return values;
  }

  if (zodType instanceof z.ZodObject) {
    return zodSchemaToTypeScript(zodType);
  }

  // Default fallback
  return 'any';
}

/**
 * Extract example value from a Zod schema for documentation
 */
export function getSchemaExample(schema: z.ZodType<any> | undefined): any {
  if (!schema) {
    return undefined;
  }

  if (schema instanceof z.ZodObject) {
    const shape = schema.shape;
    const example: any = {};

    for (const [key, value] of Object.entries(shape)) {
      const zodValue = value as z.ZodType<any>;
      example[key] = getTypeExample(zodValue);
    }

    return example;
  }

  return getTypeExample(schema);
}

/**
 * Generate example value for a Zod type
 */
function getTypeExample(zodType: z.ZodType<any>): any {
  if (zodType instanceof z.ZodOptional) {
    return getTypeExample(zodType.unwrap() as any);
  }

  if (zodType instanceof z.ZodNullable) {
    return getTypeExample(zodType.unwrap() as any);
  }

  if (zodType instanceof z.ZodString) {
    return 'string';
  }

  if (zodType instanceof z.ZodNumber) {
    return 123;
  }

  if (zodType instanceof z.ZodBoolean) {
    return true;
  }

  if (zodType instanceof z.ZodArray) {
    return [getTypeExample(zodType.element as any)];
  }

  if (zodType instanceof z.ZodEnum) {
    return zodType.options[0];
  }

  if (zodType instanceof z.ZodObject) {
    return getSchemaExample(zodType);
  }

  return undefined;
}
