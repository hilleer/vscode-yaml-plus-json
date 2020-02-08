import * as vscode from 'vscode';
import * as YAML from 'yaml';

export function showError(error: any) {
	console.error(error);
	vscode.window.showErrorMessage('Something went wrong, please validate your file and try again or create an issue if the problem persist');
}

export async function doAutoSave(document: vscode.TextDocument) {
	vscode.window.showInformationMessage('Your file included unsaved that was automatically saved');
	await document.save();
}

export function getFullDocumentRange(lineCount: number) {
	return new vscode.Range(
		new vscode.Position(0, 0),
		new vscode.Position(lineCount, Number.MAX_VALUE)
	);
}

export function getYamlFromJson(json: string) {
	try {
		return YAML.stringify(JSON.parse(json));
	} catch (error) {
		showError(error);
		throw error;
	}
}

export function getJsonFromYaml(yaml: string) {
	try {
		const json = YAML.parse(yaml);
		return JSON.stringify(json, undefined, 2);
	} catch (error) {
		showError(error);
		throw error;
	}
}