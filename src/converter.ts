import * as vscode from 'vscode';
import * as path from 'path';

import { getJsonFromYaml, getYamlFromJson, showError } from './helpers';

type ConvertedFile = {
	oldFileUri: vscode.Uri;
	oldFileContent: Uint8Array;
	newFileUri: vscode.Uri;
};

export enum ConvertFromType {
	Yaml = 'YAML',
	Json = 'JSON'
}

export class FileConverter {
	private convertedFiles: ConvertedFile[];
	private convertFromType: ConvertFromType;
	constructor(convertFromType: ConvertFromType) {
		this.convertedFiles = [];
		this.convertFromType = convertFromType;
	}

	public async convertFiles(files: vscode.Uri[]) {
		const convertFilePromises = files.map(this.transformAndConvertFile);
		await Promise.all(convertFilePromises);
		await this.showReverterTooltip();
	}

	private transformAndConvertFile = async (oldFileUri: vscode.Uri) => {
		const oldFileContent = await vscode.workspace.fs.readFile(oldFileUri);
		const oldFileExtension = path.extname(oldFileUri.fsPath);

		const newFileExtension = FileConverter.getNewFileExtension(this.convertFromType);
		const newFilePath = oldFileUri.fsPath.replace(oldFileExtension, newFileExtension);
		const newFileUri = vscode.Uri.file(newFilePath);
		const newFileContent = FileConverter.getFileConverter(this.convertFromType)(oldFileContent.toString());

		await this.convertFile(oldFileUri, newFileUri, newFileContent);
		this.convertedFiles.push({ oldFileUri, oldFileContent, newFileUri });
	};

	private async showReverterTooltip() {
		const filesLength = this.convertedFiles.length;
		const didConvertOneFile = filesLength === 1;
		const message = didConvertOneFile
			? `Successfully converted file`
			: `Successfully converted ${this.convertedFiles.length} files`;

		const userChoice = await vscode.window.showInformationMessage(message, 'Revert');

		if (userChoice !== 'Revert') {
			return;
		}

		await Promise.all(this.convertedFiles.map(this.revertTransformedAndConvertedFile));

		const revertedMessage = didConvertOneFile
			? 'Successfully reverted converted file'
			: `Successfully reverted conversion of ${filesLength} files`;
		vscode.window.showInformationMessage(revertedMessage);
	}

	private revertTransformedAndConvertedFile = async (convertedFile: ConvertedFile) => {
		const {
			oldFileUri: newFileUri,
			oldFileContent: newFileContent,
			newFileUri: oldFileUri
		} = convertedFile;

		await this.convertFile(oldFileUri, newFileUri, newFileContent.toString());
	};

	private convertFile = async (oldFileUri: vscode.Uri, newFileUri: vscode.Uri, newFileContent: string) => {
		try {
			await vscode.workspace.fs.writeFile(oldFileUri, Buffer.from(newFileContent));
			await vscode.workspace.fs.rename(oldFileUri, newFileUri);
		} catch (error) {
			showError(error);
		}
	};

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