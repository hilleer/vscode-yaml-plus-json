import * as vscode from 'vscode';
import { ConfigId, getConfig } from './config';

import { showError, getJsonFromYaml, getYamlFromJson } from './helpers';

export function onRename(e: vscode.FileRenameEvent) {
	const shouldConvertOnRename = getConfig<boolean>(ConfigId.ConvertOnRename);

	if (!shouldConvertOnRename) {
		return;
	}

	e.files.forEach(async (change) => {
		const { oldUri, newUri } = change;

		const oldPath = oldUri.path;
		const newPath = newUri.path;

		const shouldConvertJson = oldPath.endsWith('.json') && (newPath.endsWith('.yaml') || newPath.endsWith('.yml'));
		const shouldConvertYaml = (oldPath.endsWith('.yaml') || oldPath.endsWith('.yml')) && newPath.endsWith('.json');

		if (!shouldConvertJson && !shouldConvertYaml) {
			return;
		}

		const document = await vscode.workspace.openTextDocument(newUri);

		// language id of NEW file
		switch (document.languageId) {
			case 'json':
				convertYamlToJson(document);
				break;
			case 'yaml':
				convertJsonToYaml(document);
				break;
		}
	});
}

async function convertJsonToYaml(document: vscode.TextDocument) {
	try {
		const json = document.getText();
		const yaml = getYamlFromJson(json);

		await replaceFileContent(document, yaml);
	} catch (error: unknown) {
		showError(error);
	}
}

async function convertYamlToJson(document: vscode.TextDocument) {
	try {
		const yaml = document.getText();
		const json = getJsonFromYaml(yaml);

		await replaceFileContent(document, json);
	} catch (error: unknown) {
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
	} catch (error: unknown) {
		showError(error);
	}
}
