import * as vscode from 'vscode';
import * as YAML from 'yaml';

export function showError(message?: string) {
	const defaultMessage = 'Something went wrong, please validate your file and try again or create an issue if the problem persist';
	if (!message) {
		message = defaultMessage;
	}
	vscode.window.showErrorMessage(message);
}

export function getYamlFromJson(json: string): string {
	const indent = getConfig<number>(ConfigId.YamlIndent);
	const schema = getConfig<YamlSchema>(ConfigId.YamlSchema);

	const options: YAML.Options = {
		...(indent && { indent }),
		...(schema && { schema })
	};

	try {
		return YAML.stringify(JSON.parse(json), options);
	} catch (error) {
		console.error(error);
		throw new Error('Failed to parse YAML. Please make sure it has a valid format and try again.');
	}
}

export function getJsonFromYaml(yaml: string): string {
	try {
		const json = YAML.parse(yaml, {});
		return JSON.stringify(json, undefined, 2);
	} catch (error) {
		console.error(error);
		throw new Error('Failed to parse JSON. Please make sure it has a valid format and try again.');
	}
}

enum ConfigIdLegacy {
	// Same key as new - only here for convenience
	ConvertOnRename = 'convertOnRename',
	Indent = 'yaml-indent'
}

export enum ConfigId {
	ConvertOnRename = 'convertOnRename',
	YamlSchema = 'yamlSchema',
	YamlIndent = 'yamlIndent',
	FileExtensionsYaml = 'fileExtensions.yaml',
	FileExtensionsJson = 'fileExtensions.json'
}

type YamlSchema = YAML.Options['schema'];

const CONFIG_ID = 'yaml-plus-json';

const LEGACY_CONFIGS = Object.freeze({
	[ConfigId.ConvertOnRename]: ConfigIdLegacy.ConvertOnRename,
	[ConfigId.YamlIndent]: ConfigIdLegacy.Indent
});

export function getConfig<T = any>(configId: ConfigId): T | undefined {
	console.log('all config', vscode.workspace.getConfiguration('yaml-plus-json'));
	const config = vscode.workspace.getConfiguration(CONFIG_ID);

	const legacyConfigKey = getLegacyConfigKey(configId);

	return config.get<T>(legacyConfigKey) || config.get<T>(configId);
}

function getLegacyConfigKey(configId: ConfigId) {
	// @ts-ignore
	return LEGACY_CONFIGS[configId];
}