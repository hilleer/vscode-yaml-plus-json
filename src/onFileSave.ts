import * as path from 'path';
import type { TextDocument, Uri, FileSystem } from 'vscode';

import { contextProvider } from './contextProvider';
import {
  getJson5FromYaml,
  getJsonFromYaml,
  getJsoncFromYaml,
  getYamlFromJson,
  getYamlFromJson5,
  getYamlFromJsonc,
  hasJson5OnlySyntax,
  showError,
  stripJsoncComments,
  warnJson5CommentsStripped,
} from './helpers';
import { ConfigId, Configs, getConfig } from './config';

export async function onFileSave(document: TextDocument): Promise<void> {
  const vscode = contextProvider.vscode;
  const shouldConvertOnSave = getConfig<boolean>(ConfigId.ConvertOnSave);
  const fs = vscode.workspace.fs;

  if (!shouldConvertOnSave) {
    return;
  }

  const filePath = document.uri.fsPath;
  const fileExtension = path.extname(filePath);

  const isYaml = fileExtension === '.yaml' || fileExtension === '.yml';
  const isJson = fileExtension === '.json' || fileExtension === '.jsonc' || fileExtension === '.json5';

  if (!isYaml && !isJson) {
    return; // saved non yaml/json/jsonc/json5 file - do nothing
  }

  const preserveComments = getConfig<boolean>(ConfigId.PreserveComments) ?? true;

  try {
    if (isYaml) {
      const toJsonExtension = getConfig<string>(ConfigId.FileExtensionsJson) || '.json';
      const yamlText = document.getText();
      let newContent: string;
      if (toJsonExtension === '.jsonc' && preserveComments) {
        newContent = getJsoncFromYaml(yamlText);
      } else if (toJsonExtension === '.json5' && preserveComments) {
        newContent = getJson5FromYaml(yamlText);
      } else {
        newContent = getJsonFromYaml(yamlText);
      }
      const newFilePath = filePath.replace(fileExtension, toJsonExtension);

      return await convertAndWrite(newFilePath, newContent, fs);
    }

    if (isJson) {
      const toYamlExtension = getConfig<string>(ConfigId.FileExtensionsYaml) || '.yaml';
      const text = document.getText();
      let newContent: string;
      let didStripJson5Comments = false;
      if (fileExtension === '.jsonc') {
        newContent = preserveComments ? getYamlFromJsonc(text) : getYamlFromJson(stripJsoncComments(text));
      } else if (fileExtension === '.json5') {
        if (preserveComments) {
          didStripJson5Comments = hasJson5OnlySyntax(text);
          newContent = getYamlFromJson5(text);
        } else {
          newContent = getYamlFromJson5(text);
        }
      } else {
        newContent = getYamlFromJson(text);
      }
      const newFilePath = filePath.replace(fileExtension, toYamlExtension);

      await convertAndWrite(newFilePath, newContent, fs);
      if (didStripJson5Comments) {
        warnJson5CommentsStripped(path.basename(filePath));
      }
      return;
    }
  } catch (error: unknown) {
    showError(error);
    return;
  }
}

async function convertAndWrite(newFilePath: string, newContent: string, fs: FileSystem): Promise<void> {
  const vscode = contextProvider.vscode;
  const newFileUri = vscode.Uri.file(newFilePath);

  const fileExists = await doesFileExist(newFileUri, fs);
  if (!fileExists) {
    await fs.writeFile(newFileUri, Buffer.from(newContent));
    return;
  }

  const shouldOverwrite = await isAllowOverwriteExistentFile(newFileUri);
  if (!shouldOverwrite) {
    return;
  }

  await fs.writeFile(newFileUri, Buffer.from(newContent));
}

async function doesFileExist(fileUri: Uri, fs: FileSystem): Promise<boolean> {
  const vscode = contextProvider.vscode;
  try {
    await fs.readFile(fileUri);
    return true;
  } catch (error) {
    if (error instanceof vscode.FileSystemError) {
      return false;
    }
    throw error;
  }
}

async function isAllowOverwriteExistentFile(fileUri: Uri): Promise<boolean> {
  const vscode = contextProvider.vscode;
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
