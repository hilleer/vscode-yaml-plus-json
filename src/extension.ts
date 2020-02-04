// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as YAML from 'yaml';
import { readFile } from 'fs';
import { promisify } from 'util';

const readFileAsync = promisify(readFile);

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	console.log('Congratulations, your extension "yaml-plus-json" is now active!');
	vscode.workspace.onDidRenameFiles(onRename);
}

// this method is called when your extension is deactivated
export function deactivate() { }

function onRename(e: vscode.FileRenameEvent) {
	e.files.forEach((change) => {
		const { oldUri, newUri } = change;

		const oldPath = oldUri.path;
		const newPath = newUri.path;

		const wasJson = oldPath.endsWith('.json');
		const isYml = newPath.endsWith('.yml') || newPath.endsWith('.yaml');

		if (wasJson && isYml) {
			convertJsonToYml(newUri);
		}

		const wasYml = oldPath.endsWith('.yml') || oldPath.endsWith('.yaml');
		const isJson = newPath.endsWith('json');

		if (wasYml && isJson) {
			convertYmlToJson(newUri);
		}
	});
}

async function convertJsonToYml(uri: vscode.Uri) {
	const json = await readFileAsync(uri.path, 'utf8');
	const yml = YAML.stringify(JSON.parse(json));

	await replace(uri, yml);
}

async function convertYmlToJson(uri: vscode.Uri) {
	const yml = await readFileAsync(uri.path, 'utf8');
	const json = YAML.parse(yml);

	await replace(uri, json);
}

async function replace(uri: vscode.Uri, newText: string) {
	const document = await vscode.workspace.openTextDocument(uri);
	const lastLine = document.lineCount;
	const range = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(lastLine, Number.MAX_VALUE));
	const edit = new vscode.WorkspaceEdit();

	edit.replace(uri, range, newText);

	await vscode.workspace.applyEdit(edit);
}