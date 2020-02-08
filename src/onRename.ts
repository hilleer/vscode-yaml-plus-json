import * as vscode from 'vscode';

import { showError, getJsonFromYaml, getYamlFromJson } from './helpers';

export function onRename(e: vscode.FileRenameEvent) {
	e.files.forEach(async (change) => {
		const { oldUri, newUri } = change;

		const oldPath = oldUri.path;
		const newPath = newUri.path;

		const shouldConvert = oldPath.endsWith('.json') || oldPath.endsWith('.yaml') || oldPath.endsWith('.yml');

		if (!shouldConvert) {
			return;
		}

		const document = await vscode.workspace.openTextDocument(newUri);

		const shouldConvertToYaml = newPath.endsWith('.yml') || newPath.endsWith('.yaml');

		if (shouldConvertToYaml) {
			convertJsonToYaml(document);
		}

		const shouldConvertToJson = newPath.endsWith('json');
		if (shouldConvertToJson) {
			convertYamlToJson(document);
		}

	});
}

async function convertJsonToYaml(document: vscode.TextDocument) {
	try {
		const json = document.getText();
		const yaml = getYamlFromJson(json);

		await replaceFileContent(document, yaml);
	} catch (error) {
		showError(error);
	}
}

async function convertYamlToJson(document: vscode.TextDocument) {
	try {
		const yaml = document.getText();
		const json = getJsonFromYaml(yaml);

		await replaceFileContent(document, json);
	} catch (error) {
		showError(error);
	}
}

async function replaceFileContent(document: vscode.TextDocument, newText: string) {
	const { lineCount, isDirty, uri } = document;

	const edit = new vscode.WorkspaceEdit();
	const range = new vscode.Range(
		new vscode.Position(0, 0),
		new vscode.Position(lineCount, Number.MAX_VALUE)
	);

	try {

		if (isDirty) {
			await document.save();
		}

		edit.replace(uri, range, newText);
		await vscode.workspace.applyEdit(edit);
		await document.save();
	} catch (error) {
		showError(error);
	}
}