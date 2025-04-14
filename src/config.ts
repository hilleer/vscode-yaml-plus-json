import * as vscode from 'vscode';

export enum ConfigId {
  ConvertOnRename = 'convertOnRename',
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
}

export type Configs = {
  [ConfigId.ConvertOnRename]?: boolean;
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
};

enum ConfigIdLegacy {
  // Same key as new - only here for convenience
  ConvertOnRename = 'convertOnRename',
  Indent = 'yaml-indent',
}

const EXTENSION_CONFIG_ID = 'yaml-plus-json';

// TODO set extended type of generic
export function getConfig<T = unknown>(configId: ConfigId | `${ConfigId}`): T | undefined {
  const config = vscode.workspace.getConfiguration(EXTENSION_CONFIG_ID);

  const legacyConfigKey = getLegacyConfigKey(configId as ConfigId);

  return config.get<T>(legacyConfigKey) || config.get<T>(configId);
}

/**
 * @deprecated do not add new configs here
 */
const LEGACY_CONFIGS = Object.freeze({
  [ConfigId.ConvertOnRename]: ConfigIdLegacy.ConvertOnRename,
  [ConfigId.YamlIndent]: ConfigIdLegacy.Indent,
});

function getLegacyConfigKey(configId: ConfigId) {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  return LEGACY_CONFIGS[configId];
}
