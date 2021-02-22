import * as vscode from 'vscode';

import { isEmptyArray } from './array';
import { ConvertFromType, FileConverter } from './converter';
import { getFilesInDirectory } from './files';

export async function onRightClickAndConvertJsonFilestoYaml(uri: vscode.Uri): Promise<void> {
	const files = await getFilesInDirectory(uri, 'json');

	if (!files || isEmptyArray(files)) {
		vscode.window.showInformationMessage('Did not find any json files in the selected directory');
		return;
	}

	const jsonFileConverter = new FileConverter(ConvertFromType.Json);
	await jsonFileConverter.convertFiles(files);
}

export async function onRightClickConvertYamlFilesToJson(uri: vscode.Uri): Promise<void> {
	const files = await getFilesInDirectory(uri, ['yaml', 'yml']);

	if (!files || isEmptyArray(files)) {
		vscode.window.showInformationMessage('Did not find any yaml files in the selected directory');
		return;
	}

	const yamlFileConverter = new FileConverter(ConvertFromType.Yaml);
	await yamlFileConverter.convertFiles(files);
}