import { workspace } from 'vscode';

export enum ConfigId {
  ConvertOnRename = 'convertOnRename',
  ConvertOnSave = 'convertOnSave',
  FileExtensionsJson = 'fileExtensions.json',
  FileExtensionsYaml = 'fileExtensions.yaml',
  KeepOriginalFiles = 'keepOriginalFiles',
  OverwriteExistentFiles = 'overwriteExistentFiles',
  YamlIndent = 'yamlIndent',
  YamlSchema = 'yamlSchema',
  YamlLineWidth = 'yamlLineWidth',
  YamlMerge = 'yamlMerge',
  YamlOptions = 'yamlOptions',
  JsonOptions = 'jsonOptions',
  DirectoryConversion = 'directoryConversion',
}

export type Configs = {
  [ConfigId.ConvertOnRename]?: boolean;
  [ConfigId.ConvertOnSave]?: boolean;
  [ConfigId.FileExtensionsJson]?: string;
  [ConfigId.FileExtensionsYaml]?: string;
  [ConfigId.KeepOriginalFiles]?: 'ask' | 'always';
  [ConfigId.OverwriteExistentFiles]?: 'ask' | 'always';
  [ConfigId.YamlIndent]?: number;
  [ConfigId.YamlLineWidth]?: number;
  [ConfigId.YamlMerge]?: boolean;
  [ConfigId.YamlOptions]?: object;
  [ConfigId.YamlSchema]?: 'core' | 'failsafe' | 'json' | 'yaml-1.1';
  [ConfigId.JsonOptions]?: object;
  [ConfigId.DirectoryConversion]?: boolean;
};

enum ConfigIdLegacy {
  // Same key as new - only here for convenience/transparency
  ConvertOnRename = 'convertOnRename',
  Indent = 'yaml-indent',
}

const EXTENSION_CONFIG_ID = 'yaml-plus-json';

// TODO set extended type of generic
export function getConfig<T = unknown>(configId: ConfigId | `${ConfigId}`): T | undefined {
  const config = workspace.getConfiguration(EXTENSION_CONFIG_ID);

  const legacyConfigKey = getLegacyConfigKey(configId as ConfigId);

  if (legacyConfigKey) {
    const legacyValue = config.get<T | undefined>(legacyConfigKey);
    if (legacyValue !== undefined) {
      return legacyValue;
    }
  }

  return config.get<T>(configId);
}

/**
 * @deprecated do not add new configs here
 */
const LEGACY_CONFIGS = Object.freeze({
  [ConfigId.ConvertOnRename]: ConfigIdLegacy.ConvertOnRename,
  [ConfigId.YamlIndent]: ConfigIdLegacy.Indent,
});

function getLegacyConfigKey(configId: ConfigId): string | undefined {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  const value: unknown = LEGACY_CONFIGS[configId];
  return typeof value === 'string' ? value : undefined;
}
