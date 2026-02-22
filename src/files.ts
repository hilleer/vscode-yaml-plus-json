import * as path from 'path';
import type { Uri } from 'vscode';

import { contextProvider } from './contextProvider';

type FileExtension = 'json' | 'yaml' | 'yml';

export async function getFilesInDirectory(uri: Uri, fileExtensions: FileExtension | FileExtension[]) {
  const vscode = contextProvider.vscode;
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

  const getFileUri = ([filePath]: [string, number]) => vscode.Uri.file(path.join(fsPath, filePath));

  const directoryFiles = await vscode.workspace.fs.readDirectory(uri);

  if (!Array.isArray(fileExtensions)) {
    fileExtensions = [fileExtensions];
  }

  return directoryFiles.filter(filterMatchingFilesInDirectory(vscode, fileExtensions)).map(getFileUri);
}

function filterMatchingFilesInDirectory(vscode: typeof import('vscode'), fileExtensions: FileExtension[]) {
  return ([filePath, fileType]: [string, number]) =>
    fileType === vscode.FileType.File &&
    fileExtensions.some((extension) => isMatchingFileExtension(filePath, extension));
}

function isMatchingFileExtension(filePath: string, extension: string) {
  const fileExtension = path.extname(filePath);

  return fileExtension.includes(extension);
}
