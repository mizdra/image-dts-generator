import type * as ts from 'typescript/lib/tsserverlibrary.js';
import { AppOptionValidationError } from './error.js';
import { unreachable } from './util.js';

export const EXPORTED_NAME_CASES = ['constantCase', 'camelCase', 'pascalCase', 'snakeCase'] as const;
export type ExportedNameCase = (typeof EXPORTED_NAME_CASES)[number];

export type RawAssetPluginOptions = {
  extensions: string[];
  exportedNameCase?: ExportedNameCase | undefined;
  exportedNamePrefix?: string | undefined;
};

export type SuggestionRule = {
  exportedNameCase: ExportedNameCase;
  exportedNamePrefix: string;
};

export type AssetPluginOptions = SuggestionRule & {
  tsConfigPath: string;
  allowArbitraryExtensions: boolean;
  extensions: string[];
};

export const DEFAULT_EXPORTED_NAME_CASE = 'constantCase' as const satisfies AssetPluginOptions['exportedNameCase'];
export const DEFAULT_EXPORTED_NAME_PREFIX = 'I_' as const satisfies AssetPluginOptions['exportedNamePrefix'];
export const DEFAULT_ALLOW_ARBITRARY_EXTENSIONS =
  false as const satisfies AssetPluginOptions['allowArbitraryExtensions'];

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'string');
}

// eslint-disable-next-line complexity
export function assertOptions(config: unknown): asserts config is RawAssetPluginOptions {
  if (typeof config !== 'object' || config === null) return unreachable('`config` is not object.');

  if (!('name' in config) || config.name !== '@mizdra/typescript-plugin-asset')
    return unreachable("`name` must be '@mizdra/typescript-plugin-asset'");

  if (!('extensions' in config)) throw new AppOptionValidationError('`extensions` is required.');
  if (!isStringArray(config.extensions)) throw new AppOptionValidationError('`extensions` must be string array.');
  if (config.extensions.length === 0) throw new AppOptionValidationError('`extensions` must not be empty.');
  if (config.extensions.some((ext) => !ext.startsWith('.')))
    throw new AppOptionValidationError("`extensions` must start with '.'.");

  if ('exportedNameCase' in config) {
    if (typeof config.exportedNameCase !== 'string')
      throw new AppOptionValidationError('`exportedNameCase` must be string.');
    if (!(EXPORTED_NAME_CASES as readonly string[]).includes(config.exportedNameCase))
      throw new AppOptionValidationError(`\`exportedNameCase\` must be one of ${EXPORTED_NAME_CASES.join(', ')}`);
  }

  if ('exportedNamePrefix' in config) {
    if (typeof config.exportedNamePrefix !== 'string')
      throw new AppOptionValidationError('`exportedNamePrefix` must be string.');
    if (!/^\p{ID_Start}/u.test(config.exportedNamePrefix))
      throw new AppOptionValidationError(
        '`exportedNamePrefix` must begin with a character that is a valid JavaScript identifier.',
      );
  }
}

export function getAssetPluginOptions(info: ts.server.PluginCreateInfo): AssetPluginOptions {
  const tsConfigPath = info.project.getProjectName();
  // MEMO: `info.project.getCompilationSettings` is the alias of `info.project.getCompilerOptions`.
  // ref: https://github.com/microsoft/TypeScript/issues/19218
  const allowArbitraryExtensions =
    info.project.getCompilationSettings().allowArbitraryExtensions ?? DEFAULT_ALLOW_ARBITRARY_EXTENSIONS;

  const assetPluginConfig = info.config;
  assertOptions(assetPluginConfig);

  return {
    tsConfigPath,
    allowArbitraryExtensions,
    extensions: assetPluginConfig.extensions,
    exportedNameCase: assetPluginConfig.exportedNameCase ?? DEFAULT_EXPORTED_NAME_CASE,
    exportedNamePrefix: assetPluginConfig.exportedNamePrefix ?? DEFAULT_EXPORTED_NAME_PREFIX,
  };
}
