import type { Uri } from 'vscode';

import { contextProvider } from './contextProvider';
import { isEmptyArray } from './array';
import { ConvertFromType, FileConverter } from './converter';
import { getFilesInDirectory } from './files';

export async function onRightClickAndConvertJsonFilesToYaml(uri: Uri): Promise<void> {
  const vscode = contextProvider.vscode;
  const files = await getFilesInDirectory(uri, ['json', 'jsonc']);

  if (!files) {
    return; // getFilesInDirectory already showed an error/info message
  }

  if (isEmptyArray(files)) {
    vscode.window.showInformationMessage('Did not find any json or jsonc files in the selected directory');
    return;
  }

  const jsonFileConverter = new FileConverter(ConvertFromType.Json);
  await jsonFileConverter.convertFiles(files);
}

export async function onRightClickConvertYamlFilesToJson(uri: Uri): Promise<void> {
  const vscode = contextProvider.vscode;
  const files = await getFilesInDirectory(uri, ['yaml', 'yml']);

  if (!files) {
    return; // getFilesInDirectory already showed an error/info message
  }

  if (isEmptyArray(files)) {
    vscode.window.showInformationMessage('Did not find any yaml files in the selected directory');
    return;
  }

  const yamlFileConverter = new FileConverter(ConvertFromType.Yaml);
  await yamlFileConverter.convertFiles(files);
}
