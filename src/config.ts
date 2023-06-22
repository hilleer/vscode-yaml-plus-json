import * as vscode from 'vscode';

export enum ConfigId {
	ConvertOnRename = 'convertOnRename',
	YamlSchema = 'yamlSchema',
	YamlIndent = 'yamlIndent',
	FileExtensionsYaml = 'fileExtensions.yaml',
	FileExtensionsJson = 'fileExtensions.json',
	EnforceNamingConventionYaml = 'enforceNamingConvention.yaml',
	EnforceNamingConventionJson = 'enforceNamingConvention.json',
	KeepOriginalFiles = 'keepOriginalFiles',
	OverwriteExistentFiles = 'overwriteExistentFiles'
}

export type Configs = {
	keepOriginalFiles: 'ask' | 'always';
	overwriteExistentFiles: 'ask' | 'always';
	YamlSchema: 'core' | 'failsafe' | 'json' | 'yaml-1.1';
	YamlIndent: number;
	EnforceNamingConvention: NamingConvention;
};

export enum NamingConvention {
	None = 'none',	
	Pascal = 'PascalCase',
	Camel = 'camelCase',
	Snake = 'snake_case',
	Kebab = 'kebab-case'
}

enum ConfigIdLegacy {
	// Same key as new - only here for convenience
	ConvertOnRename = 'convertOnRename',
	Indent = 'yaml-indent'
}

const EXTENSION_CONFIG_ID = 'yaml-plus-json';

// TODO set extended type of generic
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
