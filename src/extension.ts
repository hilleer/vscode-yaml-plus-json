import * as vscode from 'vscode';
import * as YAML from 'yaml';

export function activate(context: vscode.ExtensionContext) {
	vscode.commands.registerCommand('extension.convertJson', onRightclickJson);
	vscode.commands.registerCommand('extension.convertYaml', (uri: vscode.Uri) => {
		console.log('connvert to yaml');
		console.log('uri', uri);
	});

	// console.log(await vscode.commands.getCommands(true));
	vscode.workspace.onDidRenameFiles(onRename);
}

function onRightclickJson() {
	return (uri: vscode.Uri) => {

	};
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
		const document = await vscode.workspace.openTextDocument(uri);
		const { isDirty } = document;

		if (isDirty) {
			await doAutoSave(document);
		}

		const json = document.getText();
		const yml = YAML.stringify(JSON.parse(json));

		await replaceFileContent(uri, yml);
	} catch (error) {
		showError(error);
	}
}

async function convertYmlToJson(uri: vscode.Uri) {
	try {
		const document = await vscode.workspace.openTextDocument(uri);
		const { isDirty } = document;

		if (isDirty) {
			await doAutoSave(document);
		}

		const yml = document.getText();
		const json = YAML.parse(yml);
		const jsonString = JSON.stringify(json, undefined, 2);

		await replaceFileContent(uri, jsonString);
	} catch (error) {
		showError(error);
	}
}

async function replaceFileContent(uri: vscode.Uri, newText: string) {
	try {
		const document = await vscode.workspace.openTextDocument(uri);
		const { lineCount } = document;

		const range = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(lineCount, Number.MAX_VALUE));
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

async function doAutoSave(document: vscode.TextDocument) {
	vscode.window.showInformationMessage('Your file included unsaved that was automatically saved');
	await document.save();
}