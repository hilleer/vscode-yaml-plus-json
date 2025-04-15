import * as vscode from 'vscode';
import * as path from 'path';

import { ConvertFromType, FileConverter } from './converter';

export async function onConvertSelectedYamlFilesToJson(clickedFile: vscode.Uri, selections: vscode.Uri[]) {
  const files = selections.filter(createExtensionNameFilter(['.yaml', '.yml']));

  const yamlFileConverter = new FileConverter(ConvertFromType.Yaml);
  await yamlFileConverter.convertFiles(files);
}

export async function onConvertSelectedJsonFilesToYaml(clickedFile: vscode.Uri, selections: vscode.Uri[]) {
  const files = selections.filter(createExtensionNameFilter(['.json']));

  const jsonFileConverter = new FileConverter(ConvertFromType.Json);
  await jsonFileConverter.convertFiles(files);
}

function createExtensionNameFilter(extensions: string[]) {
  return (uri: vscode.Uri) => extensions.includes(path.extname(uri.fsPath));
}
