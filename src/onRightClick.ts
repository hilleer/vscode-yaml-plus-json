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

type FileConverter = (fileContent: string) => string;
type FileFilter = ([filePath, fileType]: [string, vscode.FileType]) => boolean;
type FilePathCreator = (oldPath: string) => string;
type DirectoryFilesConverter = {
	fileConverter: FileConverter;
	fileFilter: FileFilter;
	filePathCreator: FilePathCreator;
	uri: vscode.Uri
};

export async function onConvertJsonFilestoYaml(uri: vscode.Uri) {
	const fileConverter: FileConverter = (json) => getYamlFromJson(json);
	const fileFilter: FileFilter = ([filePath, fileType]) => fileType === vscode.FileType.File && filePath.endsWith('.json');
	const filePathCreator: FilePathCreator = (oldPath) => oldPath
		.replace('.json', '.yml');

	await directoryFilesConverter({ uri, fileConverter, fileFilter, filePathCreator });
}

export async function onConvertYamlFilesToJson(uri: vscode.Uri) {
	const fileConverter: FileConverter = (yaml) => getJsonFromYaml(yaml);
	const fileFilter: FileFilter = ([filePath, fileType]) => fileType === vscode.FileType.File && /ya?ml/.test(filePath);
	const filePathCreator: FilePathCreator = (oldPath) => oldPath
		.replace('.yml', '.json')
		.replace('.yaml', '.json');

	await directoryFilesConverter({ uri, fileConverter, fileFilter, filePathCreator });
}

async function directoryFilesConverter({ fileConverter, uri, fileFilter, filePathCreator }: DirectoryFilesConverter) {
	const { fsPath, scheme } = uri;

	if (scheme !== 'file') {
		return vscode.window.showErrorMessage('Unexpected file scheme');
	}

	const stats = fs.lstatSync(fsPath);
	const isDirectory = stats.isDirectory();

	if (!isDirectory) {
		return vscode.window.showInformationMessage('The selection was not recognised as a directory');
	}

	const directoryFiles = await vscode.workspace.fs.readDirectory(uri);

	const getFileUri = ([filePath]: [string, vscode.FileType]) => vscode.Uri.parse(path.join(fsPath, filePath));

	const files = directoryFiles
		.filter(fileFilter)
		.map(getFileUri);

	if (files.length === 0) {
		return vscode.window.showInformationMessage('No files to be converted found in the selected directory');
	}

	const convertFile = async (fileUri: vscode.Uri) => {
		const fileContent = await vscode.workspace.fs.readFile(fileUri);

		const newFilePath = filePathCreator(fileUri.fsPath);
		const newFileUri = vscode.Uri.parse(newFilePath);

		const fileString = Buffer.from(fileContent).toString();
		const convertedFile = fileConverter(fileString);

		await changeFile(fileUri, newFileUri, convertedFile);
	};

	const promises = files.map(convertFile);
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