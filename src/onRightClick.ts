import * as vscode from 'vscode';
import * as path from 'path';

import { showError, getJsonFromYaml, getYamlFromJson } from './helpers';
import { FileConverter, ConvertFromType } from './revert';

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

		await convertFile(oldUri, newUri, yaml);
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

		await convertFile(oldUri, newUri, json);
	} catch (error) {
		showError(error.message);
		throw error;
	}
}

export async function onConvertJsonFilestoYaml(uri: vscode.Uri) {
	const fileContentConverter: FileContentConverter = getYamlFromJson;
	const newFileExtname: NewFileExtname = '.yml';
	const fileFilter: FileFilter = ([filePath, fileType]) => fileType === vscode.FileType.File && filePath.endsWith('.json');

	const fileConverter = new FileConverter(ConvertFromType.Json);

	await directoryFilesConverter({ uri, newFileExtname, fileFilter, fileContentConverter });
}

export async function onConvertYamlFilesToJson(uri: vscode.Uri) {
	const newFileExtname: NewFileExtname = '.json';
	const fileContentConverter: FileContentConverter = getJsonFromYaml;
	const fileFilter: FileFilter = ([filePath, fileType]) => fileType === vscode.FileType.File && /ya?ml/.test(filePath);
	const fileConverter = new FileConverter(ConvertFromType.Yaml);

	await directoryFilesConverter({ uri, newFileExtname, fileFilter, fileContentConverter, fileConverter });
}

type FileContentConverter = (context: string) => string;
type NewFileExtname = '.yml' | '.json';
type FileFilter = ([filePath, fileType]: [string, vscode.FileType]) => boolean;
type DirectoryFilesConverter = {
	fileContentConverter: FileContentConverter;
	fileFilter: FileFilter;
	newFileExtname: NewFileExtname;
	/** uri supposedly representing the folder */
	uri: vscode.Uri,
	fileConverter: FileConverter
};

async function directoryFilesConverter({ newFileExtname, uri, fileFilter, fileContentConverter, fileConverter }: DirectoryFilesConverter) {
	const { fsPath, scheme } = uri;

	if (scheme !== 'file') {
		return vscode.window.showErrorMessage('Unexpected file scheme');
	}

	const stat = await vscode.workspace.fs.stat(uri);
	const isDirectory = stat.type === vscode.FileType.Directory;

	if (!isDirectory) {
		return vscode.window.showInformationMessage('The selection was not recognised as a directory');
	}

	const directoryFiles = await vscode.workspace.fs.readDirectory(uri);

	const getFileUri = ([filePath]: [string, vscode.FileType]) => vscode.Uri.file(path.join(fsPath, filePath));

	const files = directoryFiles
		.filter(fileFilter)
		.map(getFileUri);

	if (files.length === 0) {
		return vscode.window.showInformationMessage(`No convertable files found in the selected directory`);
	}

	fileConverter.addFiles(files[0]);

	const fileConverter = createFileConverter(newFileExtname, fileContentConverter);
	const promises = files.map(fileConverter);
	await Promise.all(promises);
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

export async function onConvertYamlSelectionToJson(clickedFile: vscode.Uri, selections: vscode.Uri[]) {
	const files = selections.filter(extensionNameFilter(['.yaml', '.yml']));

	const fileConverter = createFileConverter('.json', getJsonFromYaml);

	const promises = files.map(fileConverter);

	await Promise.all(promises);
}

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