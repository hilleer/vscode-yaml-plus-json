import * as vscode from 'vscode';

import { onRename } from './onRename';
import { onSave } from './onSave';
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

const { registerCommand } = vscode.commands;

export function activate(context: vscode.ExtensionContext) {
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

  vscode.workspace.onDidRenameFiles(onRename);
  context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(onSave));
}
