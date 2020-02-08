import * as vscode from 'vscode';

import { onRename } from './onRename';
import { onRightClickYaml, onRightclickJson } from './onRightClick';

export function activate(context: vscode.ExtensionContext) {
	vscode.commands.registerCommand('extension.rightClickJson', onRightclickJson);
	vscode.commands.registerCommand('extension.rightClickYaml', onRightClickYaml);
	vscode.workspace.onDidRenameFiles(onRename);
}

