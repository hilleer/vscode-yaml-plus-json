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

enum UserInputPrompt {
	Yes = 'Yes',
	No = 'No'
}

type ConvertFileContext = {
	shouldKeepOriginalFile: boolean;
	oldFileUri: vscode.Uri;
	newFileUri: vscode.Uri;
	fileContent: string;
	overwriteFile?: boolean;
};

export class FileConverter {
	private convertFromType: ConvertFromType;
	constructor(convertFromType: ConvertFromType) {
		this.convertFromType = convertFromType;
	}

	public async convertFiles(files: vscode.Uri[]): Promise<void> {
		const shouldKeepOriginalFiles = await this.shouldKeepOriginalFiles(files.length);
		const convertFilePromises = files.map((file) => this.transformAndConvertFile(shouldKeepOriginalFiles, file));
		const convertedFiles = await Promise.all(convertFilePromises);
		const filtered = convertedFiles.filter(Boolean) as ConvertedFile[];

		// no need to show revert tooltip if we already keeping original files
		// might consider to redo this behavior so instead the reverting the user would have the possibility of delete created files
		if (!shouldKeepOriginalFiles && filtered.length > 0) {
			await this.showReverterTooltip(filtered);
		}
	}

	/**
	 * @returns null if file was not converted
	 */
	private transformAndConvertFile = async (shouldKeepOriginalFile: boolean, oldFileUri: vscode.Uri): Promise<ConvertedFile | null> => {
		const oldFileContent = await vscode.workspace.fs.readFile(oldFileUri);
		const oldFileExtension = path.extname(oldFileUri.fsPath);

		const newFileExtension = FileConverter.getNewFileExtension(this.convertFromType);
		const newFilePath = oldFileUri.fsPath.replace(oldFileExtension, newFileExtension);
		const newFileUri = vscode.Uri.file(newFilePath);

		const fileExists = await this.doFileExist(newFileUri);
		if (fileExists) {
			const shouldOverwriteFile = await this.isAllowOverwriteExistentFile(newFileUri);
			if (!shouldOverwriteFile) {
				vscode.window.showInformationMessage(`File already exist.\n${newFileUri}`);
				return null;
			}
		}

		const fileContent = FileConverter.getNewFileContent(this.convertFromType, oldFileContent.toString());

		await this.convertFile({ newFileUri, oldFileUri, shouldKeepOriginalFile, fileContent });

		return { oldFileUri, oldFileContent, newFileUri };
	};

	private async showReverterTooltip(convertedFiles: ConvertedFile[]) {
		const filesLength = convertedFiles.length;
		const didConvertSingleFile = filesLength === 1;

		const message = didConvertSingleFile
			? `Revert converted file?`
			: `Revert ${filesLength} converted files files?`;

		const revertSelection = await vscode.window.showInformationMessage(message, 'Revert');

		if (revertSelection !== 'Revert') {
			return;
		}

		const shouldKeepOriginalFiles = false; // never keep "original" files when reverting
		const promises = convertedFiles.map(async (convertedFile) => this.revertTransformedAndConvertedFile(shouldKeepOriginalFiles, convertedFile));
		await Promise.all(promises);

	}

	private revertTransformedAndConvertedFile = async (shouldKeepOriginalFile: boolean, convertedFile: ConvertedFile) => {
		const {
			oldFileUri: newFileUri,
			oldFileContent: newFileContent,
			newFileUri: oldFileUri
		} = convertedFile;

		const fileContent = newFileContent.toString();
		await this.convertFile({ shouldKeepOriginalFile, oldFileUri, newFileUri, fileContent });
	};

	/**
	 * @returns a boolean signaling if file was converted or not.
	 */
	private convertFile = async (context: ConvertFileContext): Promise<void> => {
		const { fileContent, newFileUri, oldFileUri, shouldKeepOriginalFile } = context;
		const newFile = Buffer.from(fileContent);

		try {
			if (!shouldKeepOriginalFile) {
				await vscode.workspace.fs.delete(oldFileUri);
			}

			await vscode.workspace.fs.writeFile(newFileUri, newFile);
		} catch (error) {
			showError(error);
		}

		if (shouldKeepOriginalFile) {
			try {
			} catch (error: any) {
				showError(error);
			}
		}

		try {
		} catch (error: any) {
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
			const message = `Do you want to keep the original file${isSingular ? '' : 's'}?`;
			const selection = await vscode.window.showInformationMessage(message, 'Keep', 'Do not keep');

			return selection === 'Keep';
		}

		return false;
	}

	private static getNewFileContent(convertFromType: ConvertFromType, oldContent: string) {
		const converter = {
			[ConvertFromType.Json]: getYamlFromJson,
			[ConvertFromType.Yaml]: getJsonFromYaml
		}[convertFromType];

		return converter(oldContent);
	}

	private static getNewFileExtension(convertFromType: ConvertFromType) {
		const toJsonFileExtension = getConfig<'.json'>(ConfigId.FileExtensionsJson);
		const toYamlFileExtension = getConfig<'.yaml' | '.yml'>(ConfigId.FileExtensionsYaml);

		const fileExtension = {
			[ConvertFromType.Json]: toYamlFileExtension,
			[ConvertFromType.Yaml]: toJsonFileExtension
		}[convertFromType];

		// should not happen
		if (!fileExtension) {
			throw new Error(`new file extension from type not found: ${convertFromType}`);
		}

		return fileExtension;
	}

	private async isAllowOverwriteExistentFile(fileUri: vscode.Uri): Promise<boolean> {
		const config = getConfig<Configs['overwriteExistentFiles']>(ConfigId.OverwriteExistentFiles);

		if (!config) {
			return false;
		}

		if (config === 'always') {
			return true;
		}

		if (config === 'ask') {
			const question = `file already exist${fileUri}\nDo you want to overwrite it?`;
			const answerOptions = Object.values(UserInputPrompt);
			const overwriteResponse = await vscode.window.showInformationMessage(question, ...answerOptions);

			return overwriteResponse === UserInputPrompt.Yes;
		}

		throw new Error('overwriteExistentFiles config key has an unexpected value');
	}
}
