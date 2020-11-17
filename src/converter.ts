import * as vscode from 'vscode';
import * as path from 'path';

import { getJsonFromYaml, getYamlFromJson, showError } from './helpers';

type File = {
	uri: vscode.Uri;
	content: Uint8Array;
};

export enum ConvertFromType {
	Yaml = 'YAML',
	Json = 'JSON'
}

export class FileConverter {
	/** files converted from (old) */
	private oldFiles: File[];
	/** files converted to (new) */
	private createdFiles: vscode.Uri[];
	private convertFromType: ConvertFromType;
	constructor(convertFromType: ConvertFromType) {
		this.oldFiles = [];
		this.createdFiles = [];
		this.convertFromType = convertFromType;
	}

	public async convertFiles(files: vscode.Uri[]) {
		const convertFilePromises = files.map(this.convertFile);
		await Promise.all(convertFilePromises);
		await this.showReverterTooltip();
	}

	private convertFile = async (oldFileUri: vscode.Uri) => {
		const oldFileContent = await vscode.workspace.fs.readFile(oldFileUri);
		const oldFileExtension = path.extname(oldFileUri.fsPath);

		this.oldFiles.push({ uri: oldFileUri, content: oldFileContent });

		const newFileExtension = FileConverter.getNewFileExtension(this.convertFromType);
		const newFilePath = oldFileUri.fsPath.replace(oldFileExtension, newFileExtension);
		const newFileUri = vscode.Uri.file(newFilePath);
		const newFileContent = FileConverter.getFileConverter(this.convertFromType)(oldFileContent.toString());

		try {
			await vscode.workspace.fs.writeFile(oldFileUri, Buffer.from(newFileContent));
			await vscode.workspace.fs.rename(oldFileUri, newFileUri);
			this.createdFiles.push(newFileUri);
		} catch (error) {
			showError(error);
		}
	};

	private async showReverterTooltip() {
		const message = `Successfully converted ${this.createdFiles.length}`;
		const userChoice = await vscode.window.showInformationMessage(message, 'Revert');

		if (userChoice !== 'Revert') {
			return;
		}

		vscode.window.showInformationMessage('Reverting all files converted');
	}

	// private async revertConvertedFiles() {

	// }

	private static getFileConverter(convertFromType: ConvertFromType) {
		return {
			[ConvertFromType.Json]: getYamlFromJson,
			[ConvertFromType.Yaml]: getJsonFromYaml
		}[convertFromType];
	}

	private static getNewFileExtension(convertFromType: ConvertFromType) {
		return {
			[ConvertFromType.Json]: '.yml',
			[ConvertFromType.Yaml]: '.json'
		}[convertFromType];
	}
}