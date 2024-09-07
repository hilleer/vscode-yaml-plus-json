import * as vscode from 'vscode';

export enum ConfigId {
	ConvertOnRename = 'convertOnRename',
	YamlSchema = 'yamlSchema',
	YamlIndent = 'yamlIndent',
	FileExtensionsYaml = 'fileExtensions.yaml',
	FileExtensionsJson = 'fileExtensions.json',
	KeepOriginalFiles = 'keepOriginalFiles',
	OverwriteExistentFiles = 'overwriteExistentFiles'
}

export type Configs = {
	keepOriginalFiles: 'ask' | 'always';
	overwriteExistentFiles: 'ask' | 'always';
	YamlSchema: 'core' | 'failsafe' | 'json' | 'yaml-1.1';
	YamlIndent: number;
};

enum ConfigIdLegacy {
	// Same key as new - only here for convenience
	ConvertOnRename = 'convertOnRename',
	Indent = 'yaml-indent'
}

const EXTENSION_CONFIG_ID = 'yaml-plus-json';

// TODO set extended type of generic
export function getConfig<T = unknown>(configId: ConfigId): T | undefined {
	const config = vscode.workspace.getConfiguration(EXTENSION_CONFIG_ID);

	const legacyConfigKey = getLegacyConfigKey(configId);

	return config.get<T>(legacyConfigKey) || config.get<T>(configId);
}

/**
 * @deprecated do not add new configs here
 */
const LEGACY_CONFIGS = Object.freeze({
	[ConfigId.ConvertOnRename]: ConfigIdLegacy.ConvertOnRename,
	[ConfigId.YamlIndent]: ConfigIdLegacy.Indent
});

function getLegacyConfigKey(configId: ConfigId) {
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-expect-error
	return LEGACY_CONFIGS[configId];
}
