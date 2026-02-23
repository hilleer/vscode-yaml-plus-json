import * as path from 'path';
import type { Uri } from 'vscode';

import { ConvertFromType, FileConverter } from './converter';

export async function onConvertSelectedYamlFilesToJson(_clickedFile: Uri, selections: Uri[]) {
  const files = selections.filter(createExtensionNameFilter(['.yaml', '.yml']));
  const yamlFileConverter = new FileConverter(ConvertFromType.Yaml);
  await yamlFileConverter.convertFiles(files);
}

export async function onConvertSelectedJsonFilesToYaml(_clickedFile: Uri, selections: Uri[]) {
  const files = selections.filter(createExtensionNameFilter(['.json']));
  const jsonFileConverter = new FileConverter(ConvertFromType.Json);
  await jsonFileConverter.convertFiles(files);
}

function createExtensionNameFilter(extensions: string[]) {
  return (uri: Uri) => extensions.includes(path.extname(uri.fsPath));
}
