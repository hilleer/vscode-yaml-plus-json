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
	const indent = getConfig().get<number>(ConfigId.Indent);

	try {
		return YAML.stringify(JSON.parse(json), { indent });
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

export enum ConfigId {
	ConvertOnRename = 'yaml-plus-json.convertOnRename',
	Indent = 'yaml-plus-json.yaml-indent'
}

export function getConfig() {
	return vscode.workspace.getConfiguration();
}