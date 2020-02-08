import * as vscode from 'vscode';

import { doAutoSave, showError, getFullDocumentRange, getJsonFromYaml, getYamlFromJson } from './helpers';

export async function onRightclickJson(oldUri: vscode.Uri) {
	const { path } = oldUri;
	const newFilePath = path.replace('.json', '.yml');
	const newUri = vscode.Uri.parse(newFilePath);
	try {
		const document = await vscode.workspace.openTextDocument(oldUri);
		const { isDirty, lineCount } = document;

		isDirty && await doAutoSave(document);
		const json = document.getText();
		const yaml = getYamlFromJson(json);

		await changeFile(oldUri, newUri, lineCount, yaml);
	} catch (error) {
		showError(error);
	}
}

export async function onRightClickYaml(oldUri: vscode.Uri) {
	const { path } = oldUri;

	try {
		const document = await vscode.workspace.openTextDocument(oldUri);
		const { isDirty, lineCount } = document;

		isDirty && await doAutoSave(document);
		const yaml = document.getText();
		const json = getJsonFromYaml(yaml);

		const newFilePath = path
			.replace('.yml', '.json')
			.replace('.yaml', '.json');
		const newUri = vscode.Uri.parse(newFilePath);

		await changeFile(oldUri, newUri, lineCount, json);
	} catch (error) {
		showError(error);
		throw error;
	}
}

async function changeFile(oldUri: vscode.Uri, newUri: vscode.Uri, documentLineCount: number, newText: string) {
	const edit = new vscode.WorkspaceEdit();
	const range = getFullDocumentRange(documentLineCount);

	try {
		await vscode.workspace.fs.rename(oldUri, newUri);
		const newDocument = await vscode.workspace.openTextDocument(newUri);
		const { isDirty } = newDocument;

		isDirty && doAutoSave(newDocument);
		// const lala = await vscode.window.showTextDocument(newDocument);
		// vscode.window.
		// console.log('lala', lala);
		edit.replace(newUri, range, newText);
		console.log('doing edit', edit);
		await vscode.workspace.applyEdit(edit);
	} catch (error) {
		showError(error);
	}
}