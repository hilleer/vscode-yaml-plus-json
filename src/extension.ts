import * as vscode from 'vscode';

import { contextProvider } from './contextProvider';
import { onFileRename } from './onFileRename';
import { onFileSave } from './onFileSave';
import { onRightClickAndConvertJsonFile, onRightClickAndConvertYamlFile } from './onRightClickAndConvertFile';
import {
  onRightClickAndConvertJsonFilesToYaml,
  onRightClickConvertYamlFilesToJson,
} from './onRightClickAndConvertDirectoryFiles';
import {
  onConvertSelectedJsonFilesToYaml,
  onConvertSelectedYamlFilesToJson,
} from './onRightClickAndConvertSelectedFiles';
import { onConvertSelection } from './onConvertSelection';
import { ConvertFromType } from './converter';
import { onPreviewSelection } from './onPreviewSelection';
import { ConfigId, getConfig } from './config';

const { registerCommand, executeCommand } = vscode.commands;

const DIRECTORY_CONVERSION_CONTEXT = 'yaml-plus-json.directoryConversion';

function syncDirectoryConversionContext() {
  const value = getConfig<boolean>(ConfigId.DirectoryConversion);
  executeCommand('setContext', DIRECTORY_CONVERSION_CONTEXT, value ?? true);
}

export function activate(context: vscode.ExtensionContext) {
  contextProvider.setVscode(vscode);

  syncDirectoryConversionContext();
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('yaml-plus-json')) {
        syncDirectoryConversionContext();
      }
    }),
  );

  context.subscriptions.push(
    registerCommand('extension.rightClickJson', onRightClickAndConvertJsonFile),
    registerCommand('extension.rightClickYaml', onRightClickAndConvertYamlFile),
    registerCommand('extension.yamlSelectionToJson', onConvertSelection(ConvertFromType.Yaml)),
    registerCommand('extension.jsonSelectionToYaml', onConvertSelection(ConvertFromType.Json)),
    registerCommand('extension.convertYamlFilesToJson', onRightClickConvertYamlFilesToJson),
    registerCommand('extension.convertJsonFilesToYaml', onRightClickAndConvertJsonFilesToYaml),
    registerCommand('extension.convertJsonSelectionsToYaml', onConvertSelectedJsonFilesToYaml),
    registerCommand('extension.convertYamlSelectionsToJson', onConvertSelectedYamlFilesToJson),
    registerCommand('extension.previewAsYaml', onPreviewSelection(ConvertFromType.Json)),
    registerCommand('extension.previewAsJson', onPreviewSelection(ConvertFromType.Yaml)),
  );

  vscode.workspace.onDidRenameFiles(onFileRename);
  context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(onFileSave));
}
