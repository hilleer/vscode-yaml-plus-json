import * as vscode from 'vscode';

export enum ConfigId {
	ConvertOnRename = 'convertOnRename',
	YamlSchema = 'yamlSchema',
	YamlIndent = 'yamlIndent',
	FileExtensionsYaml = 'fileExtensions.yaml',
	FileExtensionsJson = 'fileExtensions.json',
	KeepOriginalFiles = 'keepOriginalFiles',
	ShowSuccessMessages = 'showSuccessMessages'
}

export type Configs = {
	[ConfigId.KeepOriginalFiles]: 'ask' | 'always' | 'off';
	[ConfigId.ShowSuccessMessages]: boolean;
};

enum ConfigIdLegacy {
	// Same key as new - only here for convenience
	ConvertOnRename = 'convertOnRename',
	Indent = 'yaml-indent'
}

const EXTENSION_CONFIG_ID = 'yaml-plus-json';

export function getConfig<T = any>(configId: ConfigId): T | undefined {
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
	// @ts-ignore
	return LEGACY_CONFIGS[configId];
}