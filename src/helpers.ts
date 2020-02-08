import * as vscode from 'vscode';
import * as YAML from 'yaml';

export function showError(error: any) {
	console.error(error);
	vscode.window.showErrorMessage('Something went wrong, please validate your file and try again or create an issue if the problem persist');
}

export function getYamlFromJson(json: string): string {
	try {
		return YAML.stringify(JSON.parse(json));
	} catch (error) {
		showError(error);
		throw error;
	}
}

export function getJsonFromYaml(yaml: string): string {
	try {
		const json = YAML.parse(yaml);
		return JSON.stringify(json, undefined, 2);
	} catch (error) {
		showError(error);
		throw error;
	}
}