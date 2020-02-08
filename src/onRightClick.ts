import * as vscode from 'vscode';

import { showError, getJsonFromYaml, getYamlFromJson } from './helpers';

export async function onRightclickJson(oldUri: vscode.Uri) {
	const { path } = oldUri;
	const newFilePath = path.replace('.json', '.yml');
	const newUri = vscode.Uri.parse(newFilePath);
	try {
		const document = await vscode.workspace.openTextDocument(oldUri);

		if (document.isDirty) {
			await document.save();
		}

		const json = document.getText();
		const yaml = getYamlFromJson(json);

		await changeFile(oldUri, newUri, yaml);
	} catch (error) {
		showError(error);
	}
}

export async function onRightClickYaml(oldUri: vscode.Uri) {
	const { path } = oldUri;

	try {
		const document = await vscode.workspace.openTextDocument(oldUri);

		if (document.isDirty) {
			await document.save();
		}

		const yaml = document.getText();
		const json = getJsonFromYaml(yaml);

		const newFilePath = path
			.replace('.yml', '.json')
			.replace('.yaml', '.json');
		const newUri = vscode.Uri.parse(newFilePath);

		await changeFile(oldUri, newUri, json);
	} catch (error) {
		showError(error);
		throw error;
	}
}

async function changeFile(oldUri: vscode.Uri, newUri: vscode.Uri, newText: string) {

	try {
		await vscode.workspace.fs.writeFile(oldUri, Buffer.from(newText));
		await vscode.workspace.fs.rename(oldUri, newUri);
	} catch (error) {
		showError(error);
	}
}