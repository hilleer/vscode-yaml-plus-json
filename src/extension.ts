import * as vscode from 'vscode';

import { onRename } from './onRename';
import { onRightClickYaml, onRightclickJson } from './onRightClick';
import { selectionReplaceHandler } from './onSelectionCommand';

export enum ConfigId {
	ConvertOnRename = 'yaml-plus-json.convertOnRename'
}

export function activate(context: vscode.ExtensionContext) {

	context.subscriptions.push(vscode.commands.registerCommand('extension.rightClickJson', onRightclickJson));
	context.subscriptions.push(vscode.commands.registerCommand('extension.rightClickYaml', onRightClickYaml));
	context.subscriptions.push(vscode.commands.registerCommand('extension.yamlSelectionToJson', selectionReplaceHandler('yaml')));
	context.subscriptions.push(vscode.commands.registerCommand('extension.jsonSelectionToYaml', selectionReplaceHandler('json')));

	vscode.workspace.onDidRenameFiles(onRename);
}

