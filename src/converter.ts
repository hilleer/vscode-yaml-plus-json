import * as vscode from 'vscode';
import * as path from 'path';

import { getJsonFromYaml, getYamlFromJson, showError } from './helpers';
import { ConfigId, Configs, getConfig } from './config';

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
	private convertFromType: ConvertFromType;
	constructor(convertFromType: ConvertFromType) {
		this.convertFromType = convertFromType;
	}

	public async convertFiles(files: vscode.Uri[]): Promise<void> {
		const shouldKeepOriginalFiles = await this.shouldKeepOriginalFiles(files.length);
		const convertFilePromises = files.map((file) => this.transformAndConvertFile(shouldKeepOriginalFiles, file));
		const convertedFiles = await Promise.all(convertFilePromises);
		!shouldKeepOriginalFiles && await this.showReverterTooltip(convertedFiles);
	}

	private transformAndConvertFile = async (shouldKeepOriginalFile: boolean, oldFileUri: vscode.Uri): Promise<ConvertedFile> => {
		const oldFileContent = await vscode.workspace.fs.readFile(oldFileUri);
		const oldFileExtension = path.extname(oldFileUri.fsPath);

		const newFileExtension = FileConverter.getNewFileExtension(this.convertFromType);
		const newFilePath = oldFileUri.fsPath.replace(oldFileExtension, newFileExtension);
		const newFileUri = vscode.Uri.file(newFilePath);
		const newFileContent = FileConverter.getFileConverter(this.convertFromType)(oldFileContent.toString());

		await this.convertFile(shouldKeepOriginalFile, oldFileUri, newFileUri, newFileContent);

		return { oldFileUri, oldFileContent, newFileUri };
	};

	private async showReverterTooltip(convertedFiles: ConvertedFile[]) {
		const filesLength = convertedFiles.length;
		const didConvertSingleFile = filesLength === 1;

		const message = didConvertSingleFile
			? `Successfully converted file`
			: `Successfully converted ${filesLength} files`;

		const revertSelection = await vscode.window.showInformationMessage(message, 'Revert');

		if (revertSelection !== 'Revert') {
			return;
		}

		const shouldKeepOriginalFiles = false; // never keep "original" files when reverting
		const promises = convertedFiles.map(async (convertedFile) => this.revertTransformedAndConvertedFile(shouldKeepOriginalFiles, convertedFile));
		await Promise.all(promises);

		const revertedMessage = didConvertSingleFile
			? 'Successfully reverted converted file'
			: `Successfully reverted conversion of ${filesLength} files`;

		vscode.window.showInformationMessage(revertedMessage);
	}

	private revertTransformedAndConvertedFile = async (shouldKeepOriginalFiles: boolean, convertedFile: ConvertedFile) => {
		const {
			oldFileUri: newFileUri,
			oldFileContent: newFileContent,
			newFileUri: oldFileUri
		} = convertedFile;

		await this.convertFile(shouldKeepOriginalFiles, oldFileUri, newFileUri, newFileContent.toString());
	};

	private convertFile = async (shouldKeepOriginalFile: boolean, oldFileUri: vscode.Uri, newFileUri: vscode.Uri, newFileContent: string) => {
		const newFile = Buffer.from(newFileContent);

		const existentFile = await this.doFileExist(newFileUri);
		if (existentFile) {
			vscode.window.showInformationMessage(`file already exist: ${newFileUri}`);
			return;
		}

		if (shouldKeepOriginalFile) {
			try {
				await vscode.workspace.fs.writeFile(newFileUri, newFile);
			} catch (error: any) {
				console.error(error);
				showError(error);
			}
			return;
		}

		try {
			await vscode.workspace.fs.writeFile(oldFileUri, newFile);
			await vscode.workspace.fs.rename(oldFileUri, newFileUri);
		} catch (error: any) {
			console.error(error);
			showError(error);
		}
	};

	private async doFileExist(fileUri: vscode.Uri): Promise<boolean> {
		try {
			await vscode.workspace.fs.readFile(fileUri);
			return true;
		} catch (error) {
			// vscode throws this error when file is not found
			if (error instanceof vscode.FileSystemError) {
				return false;
			}

			throw error;
		}
	}

	private async shouldKeepOriginalFiles(length: number): Promise<boolean> {
		const keepOriginalFiles = getConfig<Configs['keepOriginalFiles']>(ConfigId.KeepOriginalFiles);

		if (keepOriginalFiles === 'always') {
			return true;
		}

		if (keepOriginalFiles === 'ask') {
			const isSingular = length === 1;
			const message = `Do you want to keep original file${isSingular ? '' : 's'}?`;
			const selection = await vscode.window.showInformationMessage(message, 'Keep', 'Dont keep');

			return selection === 'Keep';
		}

		return false;
	}

	private static getFileConverter(convertFromType: ConvertFromType) {
		return {
			[ConvertFromType.Json]: getYamlFromJson,
			[ConvertFromType.Yaml]: getJsonFromYaml
		}[convertFromType];
	}

	private static getNewFileExtension(convertFromType: ConvertFromType) {
		const toJsonFileExtension = getConfig(ConfigId.FileExtensionsJson);
		const toYamlFileExtension = getConfig(ConfigId.FileExtensionsYaml);

		return {
			[ConvertFromType.Json]: toYamlFileExtension,
			[ConvertFromType.Yaml]: toJsonFileExtension
		}[convertFromType];
	}
}