// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
const jsonToYaml = require('json-to-pretty-yaml');
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

		const jsonPath = oldUri.path;
		const ymlPath = newUri.path;

		const wasJson = jsonPath.endsWith('.json');
		const isYml = ymlPath.endsWith('.yml');

		if (wasJson && isYml) {
			convertJsonToYml(newUri);
		}
		console.log('was json', wasJson);
		console.log('isyml', isYml);
	});
}

async function convertJsonToYml(uri: vscode.Uri) {
	const json = await readFileAsync(uri.path, 'utf8');
	const yml = jsonToYaml.stringify(json);
	console.log('file content', json);
	console.log('yml', yml);

	const edit: vscode.WorkspaceEdit = {

	};

	vscode.workspace.applyEdit({ replace: (uri, new vscode.Range(new vscode.Position(0, 0), new vscode.Position(9999, 9999)), yml) });
}

// JSON --> yml