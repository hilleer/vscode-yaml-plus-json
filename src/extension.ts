import * as vscode from 'vscode';

import { onRename } from './onRename';
import { onRightClickAndConvertJsonFile, onRightClickAndConvertYamlFile } from './onRightClickAndConvertFile';
import { onRightClickAndConvertJsonFilesToYaml, onRightClickConvertYamlFilesToJson } from './onRightClickAndConvertDirectoryFiles';
import { onConvertSelectedJsonFilesToYaml, onConvertSelectedYamlFilesToJson } from './onRightClickAndConvertSelectedFiles';
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
		registerCommand('extension.previewYaml', onPreviewSelection(ConvertFromType.Json)),
		registerCommand('extension.previewJson', onPreviewSelection(ConvertFromType.Yaml))
	);

	vscode.workspace.onDidRenameFiles(onRename);
}