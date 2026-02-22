import type { Uri } from 'vscode';

import { contextProvider } from './contextProvider';
import { FileConverter, ConvertFromType } from './converter';

export async function onRightClickAndConvertJsonFile(uri: Uri) {
  const resolvedUri = uri ?? getActiveTextEditorUri();
  const jsonFileConverter = new FileConverter(ConvertFromType.Json);
  await jsonFileConverter.convertFiles([resolvedUri]);
}

export async function onRightClickAndConvertYamlFile(uri: Uri) {
  const resolvedUri = uri ?? getActiveTextEditorUri();
  const yamlFileConverter = new FileConverter(ConvertFromType.Yaml);
  await yamlFileConverter.convertFiles([resolvedUri]);
}

function getActiveTextEditorUri() {
  const editor = contextProvider.vscode.window.activeTextEditor;
  if (!editor) {
    throw new Error('Failed to get active text editor');
  }
  return editor.document.uri;
}
