import * as vscode from 'vscode';
import * as YAML from 'yaml';
import { readFile } from 'fs';
import { promisify } from 'util';

const readFileAsync = promisify(readFile);

export function activate(context: vscode.ExtensionContext) {
	vscode.workspace.onDidRenameFiles(onRename);
}

function onRename(e: vscode.FileRenameEvent) {
	e.files.forEach((change) => {
		const { oldUri, newUri } = change;

		const oldPath = oldUri.path;
		const newPath = newUri.path;

		const wasJson = oldPath.endsWith('.json');
		const isYml = newPath.endsWith('.yml') || newPath.endsWith('.yaml');

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
	try {
		const json = await readFileAsync(uri.path, 'utf8');
		const jsonString = JSON.parse(json);
		const yml = YAML.stringify(jsonString);

		await replace(uri, yml);
	} catch (error) {
		showError(error);
	}
}

async function convertYmlToJson(uri: vscode.Uri) {
	try {
		const yml = await readFileAsync(uri.path, 'utf8');
		const json = YAML.parse(yml);
		const jsonString = JSON.stringify(json, undefined, 2);

		await replace(uri, jsonString);
	} catch (error) {
		showError(error);
	}
}

async function replace(uri: vscode.Uri, newText: string) {
	try {
		const document = await vscode.workspace.openTextDocument(uri);
		const lastLine = document.lineCount;
		const range = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(lastLine, Number.MAX_VALUE));
		const edit = new vscode.WorkspaceEdit();

		edit.replace(uri, range, newText);

		await vscode.workspace.applyEdit(edit);
		await document.save();
	} catch (error) {
		showError(error);
	}
}

function showError(error: any) {
	console.error(error);
	vscode.window.showErrorMessage('Something went wrong, please try again or create an issue if the problem persist');
}