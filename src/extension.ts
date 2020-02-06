import * as vscode from 'vscode';
import * as YAML from 'yaml';

export function activate(context: vscode.ExtensionContext) {
	vscode.commands.registerCommand('extension.convertJson', onRightclickJson);
	vscode.commands.registerCommand('extension.convertYaml', onRightClickYaml);

	vscode.workspace.onDidRenameFiles(onRename);
}

async function onRightclickJson(oldUri: vscode.Uri) {
	const { path } = oldUri;
	const newFilePath = path.replace('.json', '.yml');
	const newUri = vscode.Uri.parse(newFilePath);
	try {
		const document = await vscode.workspace.openTextDocument(oldUri);
		const json = document.getText();
		const yaml = YAML.stringify(JSON.parse(json));

		await changeFile(oldUri, newUri, document, yaml);
	} catch (error) {
		showError(error);
	}
}

function onRightClickYaml(uri: vscode.Uri) {
	console.log('uri', uri);
}

function onRename(e: vscode.FileRenameEvent) {
	e.files.forEach(async (change) => {
		const { oldUri, newUri } = change;

		const oldPath = oldUri.path;
		const newPath = newUri.path;

		const shouldConvert = oldPath.endsWith('.json') || oldPath.endsWith('.yaml') || oldPath.endsWith('.yml');

		if (!shouldConvert) {
			return;
		}

		const document = await vscode.workspace.openTextDocument(newUri);

		const shouldConvertToYaml = newPath.endsWith('.yml') || newPath.endsWith('.yaml');

		if (shouldConvertToYaml) {
			convertJsonToYml(document);
		}

		const shouldConvertToJson = newPath.endsWith('json');
		if (shouldConvertToJson) {
			convertYmlToJson(document);
		}

	});
}

async function convertJsonToYml(document: vscode.TextDocument) {
	try {
		const json = document.getText();
		const yml = YAML.stringify(JSON.parse(json));

		await replaceFileContent(document, yml);
	} catch (error) {
		showError(error);
	}
}

async function convertYmlToJson(document: vscode.TextDocument) {
	try {
		const yml = document.getText();
		const json = YAML.parse(yml);
		const jsonString = JSON.stringify(json, undefined, 2);

		await replaceFileContent(document, jsonString);
	} catch (error) {
		showError(error);
	}
}

async function changeFile(oldUri: vscode.Uri, newUri: vscode.Uri, document: vscode.TextDocument, newText: string) {
	const { lineCount } = document;


	const edit = new vscode.WorkspaceEdit();
	const range = getFullDocumentRange(lineCount);

	try {
		await vscode.workspace.fs.rename(oldUri, newUri);
		edit.replace(newUri, range, newText);
		await vscode.workspace.applyEdit(edit);
		const newDocument = await vscode.workspace.openTextDocument(newUri);
		await newDocument.save();
	} catch (error) {
		showError(error);
	}
}

async function replaceFileContent(document: vscode.TextDocument, newText: string) {
	const { lineCount, isDirty, uri } = document;

	const edit = new vscode.WorkspaceEdit();
	const range = getFullDocumentRange(lineCount);

	try {
		isDirty && await doAutoSave(document);
		edit.replace(uri, range, newText);
		await vscode.workspace.applyEdit(edit);
		await document.save();
	} catch (error) {
		showError(error);
	}
}

function getFullDocumentRange(lineCount: number) {
	return new vscode.Range(
		new vscode.Position(0, 0),
		new vscode.Position(lineCount, Number.MAX_VALUE)
	);
}

function showError(error: any) {
	console.error(error);
	vscode.window.showErrorMessage('Something went wrong, please validate your file and try again or create an issue if the problem persist');
}

async function doAutoSave(document: vscode.TextDocument) {
	vscode.window.showInformationMessage('Your file included unsaved that was automatically saved');
	await document.save();
}