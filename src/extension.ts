import * as vscode from 'vscode';

import { onRename } from './onRename';
import {
	onConvertJsonFilestoYaml,
	onConvertJsonSelectionToYaml,
	onConvertYamlFilesToJson,
	onConvertYamlSelectionToJson,
	onRightclickJson,
	onRightClickYaml
} from './onRightClick';
import { selectionReplaceHandler } from './onSelectionCommand';

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand('extension.rightClickJson', onRightclickJson),
		vscode.commands.registerCommand('extension.rightClickYaml', onRightClickYaml),
		vscode.commands.registerCommand('extension.yamlSelectionToJson', selectionReplaceHandler('yaml')),
		vscode.commands.registerCommand('extension.jsonSelectionToYaml', selectionReplaceHandler('json')),
		vscode.commands.registerCommand('extension.convertYamlFilesToJson', onConvertYamlFilesToJson),
		vscode.commands.registerCommand('extension.convertJsonFilesToYaml', onConvertJsonFilestoYaml),
		vscode.commands.registerCommand('extension.convertJsonSelectionsToYaml', onConvertJsonSelectionToYaml),
		vscode.commands.registerCommand('extension.convertYamlSelectionsToJson', onConvertYamlSelectionToJson)
	);

	vscode.workspace.onDidRenameFiles(onRename);
}