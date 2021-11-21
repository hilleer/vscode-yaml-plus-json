import * as vscode from 'vscode';
import { ConvertFromType } from './converter';

import { getJsonFromYaml, getYamlFromJson, showError } from './helpers';

export function onConvertSelection(fromType: ConvertFromType) {
	const converter = getSelectionConverter(fromType);

	return async () => {
		try {
			const editor = vscode.window.activeTextEditor;

			if (!editor) {
				return;
			}

			const { selection, document } = editor;
			const text = document.getText(selection);
			const newText = converter(text);

			const range = getSelectionRange(selection);

			await replaceSelection(document, range, newText);
			const { end } = selection;
			editor.selection = new vscode.Selection(end, end);
		} catch (error) {
			showError(error);
		}
	};
}

function getSelectionConverter(fromType: ConvertFromType) {
	return {
		[ConvertFromType.Json]: getYamlFromJson,
		[ConvertFromType.Yaml]: getJsonFromYaml
	}[fromType];
}

function getSelectionRange(selection: vscode.Selection) {
	const { start, end } = selection;
	const range = new vscode.Range(start, end);

	return range;
}

async function replaceSelection(document: vscode.TextDocument, range: vscode.Range, replacement: string) {
	const { uri } = document;

	const edit = new vscode.WorkspaceEdit();

	try {
		edit.replace(uri, range, replacement);
		await vscode.workspace.applyEdit(edit);
	} catch (error) {
		showError(error);
	}
}