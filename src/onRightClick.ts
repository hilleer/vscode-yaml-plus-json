import * as vscode from 'vscode';
import * as path from 'path';

import { showError, getJsonFromYaml, getYamlFromJson } from './helpers';
import { FileConverter, ConvertFromType } from './converter';
import { isEmptyArray } from './array';

export async function onRightclickJson(oldUri: vscode.Uri) {
	if (!oldUri) {
		oldUri = getActiveTextEditorUri();
	}

	const fileConverter = new FileConverter(ConvertFromType.Json);
	await fileConverter.convertFiles([oldUri]);
}

export async function onRightClickYaml(oldUri: vscode.Uri) {
	if (!oldUri) {
		oldUri = getActiveTextEditorUri();
	}

	const fileConverter = new FileConverter(ConvertFromType.Yaml);
	await fileConverter.convertFiles([oldUri]);
}

export async function onConvertJsonFilestoYaml(uri: vscode.Uri): Promise<void> {
	const fileConverter = new FileConverter(ConvertFromType.Json);
	const files = await getFilesInDirectory(uri, ['json']);

	if (!files || isEmptyArray(files)) {
		vscode.window.showInformationMessage('Did not find any json files in the selected directory');
		return;
	}

	await fileConverter.convertFiles(files);
}

export async function onConvertYamlFilesToJson(uri: vscode.Uri): Promise<void> {
	const fileConverter = new FileConverter(ConvertFromType.Yaml);
	const files = await getFilesInDirectory(uri, ['yaml', 'yml']);

	if (!files || isEmptyArray(files)) {
		vscode.window.showInformationMessage('Did not find any yaml files in the selected directory');
		return;
	}

	await fileConverter.convertFiles(files);
}

type FileContentConverter = (context: string) => string;

type FileExtensions = Array<'json' | 'yaml' | 'yml'>;

async function getFilesInDirectory(uri: vscode.Uri, fileExtensions: FileExtensions) {
	const { fsPath, scheme } = uri;

	if (scheme !== 'file') {
		vscode.window.showErrorMessage('Unexpected file scheme');
		return;
	}

	const stat = await vscode.workspace.fs.stat(uri);
	const isDirectory = stat.type === vscode.FileType.Directory;

	if (!isDirectory) {
		vscode.window.showInformationMessage('The selection was not recognised as a directory');
		return;
	}

	const getFileUri = ([filePath]: [string, vscode.FileType]) => vscode.Uri.file(path.join(fsPath, filePath));

	const directoryFiles = await vscode.workspace.fs.readDirectory(uri);

	return directoryFiles
		.filter(filterMatchingFilesInDirectory(fileExtensions))
		.map(getFileUri);
}

function filterMatchingFilesInDirectory(fileExtensions: FileExtensions) {
	return ([filePath, fileType]: [string, vscode.FileType]) =>
		fileType === vscode.FileType.File
		&& fileExtensions.some((extension) => isMatchingFileExtension(filePath, extension));
}

function isMatchingFileExtension(filePath: string, extension: string) {
	const fileExtension = path.extname(filePath);

	return fileExtension.includes(extension);
}

function createFileConverter(newFileExtname: '.json' | '.yml', contentConverter: FileContentConverter) {
	return async (fileUri: vscode.Uri) => {
		const fileContent = await vscode.workspace.fs.readFile(fileUri);
		const filePath = path.extname(fileUri.fsPath);

		const newFilePath = fileUri.fsPath.replace(filePath, newFileExtname);
		const newFileUri = vscode.Uri.file(newFilePath);

		const fileString = Buffer.from(fileContent).toString();
		const convertedFile = contentConverter(fileString);

		await convertFile(fileUri, newFileUri, convertedFile);
	};
}

const extensionNameFilter = (extnames: string[]) => (uri: vscode.Uri) => extnames.includes(path.extname(uri.fsPath));

// TODO revertable
export async function onConvertYamlSelectionToJson(clickedFile: vscode.Uri, selections: vscode.Uri[]) {
	const files = selections.filter(extensionNameFilter(['.yaml', '.yml']));

	const fileConverter = createFileConverter('.json', getJsonFromYaml);

	const promises = files.map(fileConverter);

	await Promise.all(promises);
}

// TODO revertable
export async function onConvertJsonSelectionToYaml(clickedFile: vscode.Uri, selections: vscode.Uri[]) {
	const files = selections.filter(extensionNameFilter(['.json']));

	const fileConverter = createFileConverter('.yml', getYamlFromJson);

	const promises = files.map(fileConverter);

	await Promise.all(promises);
}

export async function convertFile(oldUri: vscode.Uri, newUri: vscode.Uri, newText: string) {
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