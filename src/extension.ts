import * as vscode from 'vscode';

import { onRename } from './onRename';
import { onRightClickAndConvertJsonFile, onRightClickAndConvertYamlFile } from './onRightClickAndConvertFile';
import { onRightClickAndConvertJsonFilesToYaml, onRightClickConvertYamlFilesToJson } from './onRightClickAndConvertDirectoryFiles';
import { onConvertSelectedJsonFilesToYaml, onConvertSelectedYamlFilesToJson } from './onRightClickAndConvertSelectedFiles';
import { onConvertSelection } from './onConvertSelection';
import { ConvertFromType } from './converter';

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand('extension.rightClickJson', onRightClickAndConvertJsonFile),
		vscode.commands.registerCommand('extension.rightClickYaml', onRightClickAndConvertYamlFile),
		vscode.commands.registerCommand('extension.yamlSelectionToJson', onConvertSelection(ConvertFromType.Yaml)),
		vscode.commands.registerCommand('extension.jsonSelectionToYaml', onConvertSelection(ConvertFromType.Json)),
		vscode.commands.registerCommand('extension.convertYamlFilesToJson', onRightClickConvertYamlFilesToJson),
		vscode.commands.registerCommand('extension.convertJsonFilesToYaml', onRightClickAndConvertJsonFilesToYaml),
		vscode.commands.registerCommand('extension.convertJsonSelectionsToYaml', onConvertSelectedJsonFilesToYaml),
		vscode.commands.registerCommand('extension.convertYamlSelectionsToJson', onConvertSelectedYamlFilesToJson)
	);

	vscode.workspace.onDidRenameFiles(onRename);
}