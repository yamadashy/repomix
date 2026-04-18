import fs from 'node:fs/promises';
import path from 'node:path';
import { toJsonSchema } from '@valibot/to-json-schema';
import { repomixConfigFileSchema } from '../../../src/config/configSchema.js';

const getPackageVersion = async (): Promise<string> => {
  const packageJsonPath = path.resolve('./package.json');
  const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
  const packageJson = JSON.parse(packageJsonContent);
  return packageJson.version;
};

// @valibot/to-json-schema quirks:
// - Does not emit `additionalProperties: false` for `v.object`, even though
//   Valibot strips unknown keys at runtime. We add it so editors flag typos.
// - Emits an empty `required: []` on every object node, which is valid but noisy.
//   We strip empty arrays to match the previous zod-generated output.
// Mutates the tree in place — the caller passes the root schema and discards
// the return value.
const normalizeObjectNode = (node: unknown): void => {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const item of node) normalizeObjectNode(item);
    return;
  }
  const obj = node as Record<string, unknown>;
  if (obj.type === 'object' && obj.properties && typeof obj.properties === 'object') {
    if (!('additionalProperties' in obj)) {
      obj.additionalProperties = false;
    }
    if (Array.isArray(obj.required) && obj.required.length === 0) {
      delete obj.required;
    }
  }
  for (const value of Object.values(obj)) normalizeObjectNode(value);
};

const generateSchema = async () => {
  const version = await getPackageVersion();
  const versionParts = version.split('.');
  const majorMinorVersion = `${versionParts[0]}.${versionParts[1]}.${versionParts[2]}`;

  const jsonSchema = toJsonSchema(repomixConfigFileSchema, {
    target: 'draft-07',
  });
  normalizeObjectNode(jsonSchema);

  const schemaWithMeta = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    ...jsonSchema,
    title: 'Repomix Configuration',
    description: 'Schema for repomix.config.json configuration file',
  };

  const baseOutputDir = path.resolve('./website/client/src/public/schemas');
  await fs.mkdir(baseOutputDir, { recursive: true });

  const versionedOutputDir = path.resolve(baseOutputDir, majorMinorVersion);
  await fs.mkdir(versionedOutputDir, { recursive: true });

  const versionedOutputPath = path.resolve(versionedOutputDir, 'schema.json');
  await fs.writeFile(versionedOutputPath, JSON.stringify(schemaWithMeta, null, 2), 'utf-8');

  const latestOutputDir = path.resolve(baseOutputDir, 'latest');
  await fs.mkdir(latestOutputDir, { recursive: true });
  const latestOutputPath = path.resolve(latestOutputDir, 'schema.json');
  await fs.writeFile(latestOutputPath, JSON.stringify(schemaWithMeta, null, 2), 'utf-8');

  console.log(`Schema generated at ${versionedOutputPath}`);
  console.log(`Schema also generated at ${latestOutputPath}`);
};

generateSchema().catch(console.error);
