import * as  vscode from 'vscode';
import * as path from 'path';

type FileExtension = 'json' | 'yaml' | 'yml';

export async function getFilesInDirectory(uri: vscode.Uri, fileExtensions: FileExtension | FileExtension[]) {
	const { fsPath, scheme } = uri;

	if (scheme !== 'file') {
		vscode.window.showErrorMessage('Unexpected file scheme');
		return;
	}

	const stat = await vscode.workspace.fs.stat(uri);
	const isDirectory = stat.type === vscode.FileType.Directory;

	if (!isDirectory) {
		vscode.window.showWarningMessage('The selection was not recognized as a directory');
		return;
	}

	const getFileUri = ([filePath]: [string, vscode.FileType]) => vscode.Uri.file(path.join(fsPath, filePath));

	const directoryFiles = await vscode.workspace.fs.readDirectory(uri);

	if (!Array.isArray(fileExtensions)) {
		fileExtensions = [fileExtensions];
	}

	return directoryFiles
		.filter(filterMatchingFilesInDirectory(fileExtensions))
		.map(getFileUri);
}

function filterMatchingFilesInDirectory(fileExtensions: FileExtension[]) {
	return ([filePath, fileType]: [string, vscode.FileType]) =>
		fileType === vscode.FileType.File
		&& fileExtensions.some((extension) => isMatchingFileExtension(filePath, extension));
}

function isMatchingFileExtension(filePath: string, extension: string) {
	const fileExtension = path.extname(filePath);

	return fileExtension.includes(extension);
}