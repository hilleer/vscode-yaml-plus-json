import * as vscode from 'vscode';
import * as path from 'path';

import { getJsonFromYaml, getYamlFromJson, showError } from './helpers';
import { ConfigId, Configs, getConfig } from './config';

export async function onSave(document: vscode.TextDocument): Promise<void> {
  const shouldConvertOnSave = getConfig<boolean>(ConfigId.ConvertOnSave);

  if (!shouldConvertOnSave) {
    return;
  }

  const filePath = document.uri.fsPath;
  const fileExtension = path.extname(filePath);

  const isYaml = fileExtension === '.yaml' || fileExtension === '.yml';
  const isJson = fileExtension === '.json';

  const toJsonExtension = getConfig<string>(ConfigId.FileExtensionsJson) || '.json';
  const toYamlExtension = getConfig<string>(ConfigId.FileExtensionsYaml) || '.yaml';

  let newFilePath: string;
  let newContent: string;

  try {
    if (isYaml) {
      newContent = getJsonFromYaml(document.getText());
      newFilePath = filePath.replace(fileExtension, toJsonExtension);
      return await convertAndWrite(newFilePath, newContent);
    }

    if (isJson) {
      newContent = getYamlFromJson(document.getText());
      newFilePath = filePath.replace(fileExtension, toYamlExtension);
      return await convertAndWrite(newFilePath, newContent);
    }

    throw new Error(`Unexpected file extension: ${fileExtension}`);
  } catch (error: unknown) {
    showError(error);
    return;
  }
}

async function convertAndWrite(newFilePath: string, newContent: string): Promise<void> {
  const newFileUri = vscode.Uri.file(newFilePath);

  const fileExists = await doesFileExist(newFileUri);
  if (!fileExists) {
    await vscode.workspace.fs.writeFile(newFileUri, Buffer.from(newContent));
    return;
  }

  const shouldOverwrite = await isAllowOverwriteExistentFile(newFileUri);
  if (!shouldOverwrite) {
    return;
  }

  await vscode.workspace.fs.writeFile(newFileUri, Buffer.from(newContent));
}

async function doesFileExist(fileUri: vscode.Uri): Promise<boolean> {
  try {
    await vscode.workspace.fs.readFile(fileUri);
    return true;
  } catch (error) {
    if (error instanceof vscode.FileSystemError) {
      return false;
    }
    throw error;
  }
}

async function isAllowOverwriteExistentFile(fileUri: vscode.Uri): Promise<boolean> {
  const config = getConfig<Configs['overwriteExistentFiles']>(ConfigId.OverwriteExistentFiles);

  if (!config) {
    return false;
  }

  if (config === 'always') {
    return true;
  }

  if (config === 'ask') {
    const question = `File already exists: ${fileUri.fsPath}\nDo you want to overwrite it?`;
    const userResponse = await vscode.window.showInformationMessage(question, 'Yes', 'No');
    return userResponse === 'Yes';
  }

  return false;
}
