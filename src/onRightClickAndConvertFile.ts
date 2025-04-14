import * as vscode from 'vscode';

import { FileConverter, ConvertFromType } from './converter';

const jsonFileConverter = new FileConverter(ConvertFromType.Json);
const yamlFileConverter = new FileConverter(ConvertFromType.Yaml);

export async function onRightClickAndConvertJsonFile(oldUri: vscode.Uri) {
	if (!oldUri) {
		oldUri = getActiveTextEditorUri();
	}

	await jsonFileConverter.convertFiles([oldUri]);
}

export async function onRightClickAndConvertYamlFile(oldUri: vscode.Uri) {
	if (!oldUri) {
		oldUri = getActiveTextEditorUri();
	}

	await yamlFileConverter.convertFiles([oldUri]);
}

function getActiveTextEditorUri() {
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		throw new Error('Failed to get active text editor');
	}
	return editor.document.uri;
}
