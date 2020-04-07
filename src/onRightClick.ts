import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

import { showError, getJsonFromYaml, getYamlFromJson } from './helpers';

export async function onRightclickJson(oldUri: vscode.Uri) {
	if (!oldUri) {
		oldUri = getActiveTextEditorUri();
	}

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
		showError(error.message);
	}
}

export async function onRightClickYaml(oldUri: vscode.Uri) {
	if (!oldUri) {
		oldUri = getActiveTextEditorUri();
	}

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
		showError(error.message);
		throw error;
	}
}

export async function onConvertFolderToYaml(uri: vscode.Uri) {
	const { fsPath, scheme } = uri;

	if (scheme !== 'file') {
		return vscode.window.showErrorMessage('Unexpected file scheme');
	}

	const stats = fs.lstatSync(fsPath);
	const isDirectory = stats.isDirectory();

	if (!isDirectory) {
		return vscode.window.showInformationMessage('The selection was not recognised as a directory');
	}

	const files = await vscode.workspace.fs.readDirectory(uri);

	const isJsonFile = ([filePath, fileType]: [string, vscode.FileType]) => fileType === vscode.FileType.File && filePath.endsWith('.json');
	const getFilePath = ([filePath]: [string, vscode.FileType]) => filePath;

	const jsonFiles = files
		.filter(isJsonFile)
		.map(getFilePath);

	const getFileUri = (file: string) => vscode.Uri.parse(path.join(fsPath, file));
	const fileUris = jsonFiles.map(getFileUri);

	if (fileUris.length === 0) {
		return vscode.window.showInformationMessage('No JSON files found in directory');
	}

	const convertFiles = async (oldFileUri: vscode.Uri) => {
		const newFilePath = oldFileUri.fsPath.replace('.json', '.yml');
		const newFileUri = vscode.Uri.parse(newFilePath);

		const fileContent = await vscode.workspace.fs.readFile(oldFileUri);
		const json = Buffer.from(fileContent).toString();
		const yaml = getYamlFromJson(json);

		await changeFile(oldFileUri, newFileUri, yaml);
	};
	const promises = fileUris.map(convertFiles);

	await Promise.all(promises);
}

export async function onConvertFolderToJson(uri: vscode.Uri) {
	const { fsPath, scheme } = uri;

	if (scheme !== 'file') {
		return vscode.window.showErrorMessage('Unexpected file scheme');
	}

	const stats = fs.lstatSync(fsPath);
	const isDirectory = stats.isDirectory();

	if (!isDirectory) {
		return vscode.window.showInformationMessage('The selection was not recognised as a directory');
	}

	const files = await vscode.workspace.fs.readDirectory(uri);

	const isYamlFile = ([filePath, fileType]: [string, vscode.FileType]) => fileType === vscode.FileType.File && /ya?ml/.test(filePath);
	const getFilePath = ([filePath]: [string, vscode.FileType]) => filePath;

	const jsonFiles = files
		.filter(isYamlFile)
		.map(getFilePath);

	const getFileUri = (file: string) => vscode.Uri.parse(path.join(fsPath, file));
	const fileUris = jsonFiles.map(getFileUri);

	if (fileUris.length === 0) {
		return vscode.window.showInformationMessage('No YAML files found in directory');
	}

	const convertFiles = async (oldFileUri: vscode.Uri) => {
		const newFilePath = oldFileUri.fsPath
			.replace('.yml', '.json')
			.replace('.yaml', '.json');

		const newFileUri = vscode.Uri.parse(newFilePath);

		const fileContent = await vscode.workspace.fs.readFile(oldFileUri);
		const yaml = Buffer.from(fileContent).toString();
		const json = getJsonFromYaml(yaml);

		await changeFile(oldFileUri, newFileUri, json);
	};
	const promises = fileUris.map(convertFiles);

	await Promise.all(promises);
}

async function changeFile(oldUri: vscode.Uri, newUri: vscode.Uri, newText: string) {

	try {
		await vscode.workspace.fs.writeFile(oldUri, Buffer.from(newText));
		await vscode.workspace.fs.rename(oldUri, newUri);
	} catch (error) {
		showError(error.message);
	}
}

function getActiveTextEditorUri() {
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		throw new Error('Failed to get active text editor');
	}
	return editor.document.uri;
}