import * as path from 'path';

import {
  getJsonFromYaml,
  getJsoncFromYaml,
  getYamlFromJson,
  getYamlFromJsonc,
  showError,
  stripJsoncComments,
} from './helpers';
import { ConfigId, Configs, getConfig } from './config';
import { contextProvider } from './contextProvider';
import type { Uri } from 'vscode';

type ConvertedFile = {
  oldFileUri: Uri;
  oldFileContent: Uint8Array;
  newFileUri: Uri;
};

export enum ConvertFromType {
  Yaml = 'YAML',
  Json = 'JSON',
}

enum UserInputPrompt {
  Yes = 'Yes',
  No = 'No',
}

type ConvertFileContext = {
  shouldKeepOriginalFile: boolean;
  oldFileUri: Uri;
  newFileUri: Uri;
  fileContent: string;
};

type GetNewFileContent = {
  fromType: ConvertFromType;
  oldContent: string;
  oldFileExtension: string;
};

export class FileConverter {
  private convertFromType: ConvertFromType;

  constructor(convertFromType: ConvertFromType) {
    this.convertFromType = convertFromType;
  }

  public async convertFiles(files: Uri[]): Promise<void> {
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
  private transformAndConvertFile = async (
    shouldKeepOriginalFile: boolean,
    oldFileUri: Uri,
  ): Promise<ConvertedFile | null> => {
    try {
      const vscode = contextProvider.vscode;
      const oldFileContent = await vscode.workspace.fs.readFile(oldFileUri);
      const oldFileExtension = path.extname(oldFileUri.fsPath);

      const newFileExtension = FileConverter.getNewFileExtension(this.convertFromType);
      const newFilePath = oldFileUri.fsPath.replace(oldFileExtension, newFileExtension);
      const newFileUri = vscode.Uri.file(newFilePath);

      const fileExists = await this.doFileExist(newFileUri);
      if (fileExists) {
        const shouldOverwriteFile = await this.isAllowOverwriteExistentFile(newFileUri);
        if (!shouldOverwriteFile) {
          const overwriteConfig = getConfig(ConfigId.OverwriteExistentFiles);
          // Only show "file already exists" info when not in 'ask' mode
          // (in 'ask' mode the user was already explicitly prompted and declined)
          if (overwriteConfig !== 'ask') {
            vscode.window.showInformationMessage(`File already exist.\n${newFileUri.fsPath}`);
          }
          return null;
        }
      }

      const fileContent = FileConverter.getNewFileContent({
        fromType: this.convertFromType,
        oldContent: oldFileContent.toString(),
        oldFileExtension,
      });

      await this.convertFile({ newFileUri, oldFileUri, shouldKeepOriginalFile, fileContent });

      return { oldFileUri, oldFileContent, newFileUri };
    } catch (error) {
      showError(error);
      return null;
    }
  };

  private async showReverterTooltip(convertedFiles: ConvertedFile[]) {
    const vscode = contextProvider.vscode;
    const filesLength = convertedFiles.length;
    const didConvertSingleFile = filesLength === 1;

    const message = didConvertSingleFile ? `Revert converted file?` : `Revert ${filesLength} converted files files?`;

    const revertSelection = await vscode.window.showInformationMessage(message, 'Revert');

    if (revertSelection !== 'Revert') {
      return;
    }

    const shouldKeepOriginalFiles = false; // never keep "original" files when reverting
    const promises = convertedFiles.map(async (convertedFile) =>
      this.revertTransformedAndConvertedFile(shouldKeepOriginalFiles, convertedFile),
    );
    await Promise.all(promises);
  }

  private revertTransformedAndConvertedFile = async (shouldKeepOriginalFile: boolean, convertedFile: ConvertedFile) => {
    const { oldFileUri: newFileUri, oldFileContent: newFileContent, newFileUri: oldFileUri } = convertedFile;

    const fileContent = newFileContent.toString();
    await this.convertFile({ shouldKeepOriginalFile, oldFileUri, newFileUri, fileContent });
  };

  /**
   * @returns a boolean signaling if file was converted or not.
   */
  private convertFile = async (context: ConvertFileContext): Promise<void> => {
    const vscode = contextProvider.vscode;
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
        // TODO check if can be removed
        // introduced here: https://github.com/hilleer/vscode-yaml-plus-json/pull/68/files#diff-2c718087c1fd72979602bd9da34119fb956d070d90109b6bc01ea23b2ad7eae1L91
      } catch (error: unknown) {
        showError(error);
      }
    }

    try {
      // TODO check if can be removed
      // introduced here: https://github.com/hilleer/vscode-yaml-plus-json/pull/68/files#diff-2c718087c1fd72979602bd9da34119fb956d070d90109b6bc01ea23b2ad7eae1L99
    } catch (error: unknown) {
      showError(error);
    }
  };

  private async doFileExist(fileUri: Uri): Promise<boolean> {
    const vscode = contextProvider.vscode;
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
    const vscode = contextProvider.vscode;
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

  private static getNewFileContent({ fromType, oldContent, oldFileExtension }: GetNewFileContent) {
    const preserveComments = getConfig<boolean>(ConfigId.PreserveComments) ?? true;
    const targetJsonExt = getConfig<string>(ConfigId.FileExtensionsJson) || '.json';

    const convertToYaml = fromType === ConvertFromType.Json;
    if (convertToYaml) {
      // Source is JSON/JSONC - target is YAML
      if (preserveComments && oldFileExtension === '.jsonc') {
        return getYamlFromJsonc(oldContent);
      }
      // Strip comments from JSONC before plain conversion
      const content = oldFileExtension === '.jsonc' ? stripJsoncComments(oldContent) : oldContent;
      return getYamlFromJson(content);
    }

    // Source is YAML - target is JSONC
    if (targetJsonExt === '.jsonc' && preserveComments) {
      return getJsoncFromYaml(oldContent);
    }

    // Source is YAML - target is JSON (or JSONC but user doesn't want to preserve comments)
    return getJsonFromYaml(oldContent);
  }

  private static getNewFileExtension(convertFromType: ConvertFromType) {
    const toJsonFileExtension = getConfig<'.json'>(ConfigId.FileExtensionsJson);
    const toYamlFileExtension = getConfig<'.yaml' | '.yml'>(ConfigId.FileExtensionsYaml);

    const fileExtension = {
      [ConvertFromType.Json]: toYamlFileExtension,
      [ConvertFromType.Yaml]: toJsonFileExtension,
    }[convertFromType];

    // should not happen
    if (!fileExtension) {
      throw new Error(`new file extension from type not found: ${convertFromType}`);
    }

    return fileExtension;
  }

  private async isAllowOverwriteExistentFile(fileUri: Uri): Promise<boolean> {
    const vscode = contextProvider.vscode;
    const config = getConfig<Configs['overwriteExistentFiles']>(ConfigId.OverwriteExistentFiles);

    if (!config) {
      return false;
    }

    if (config === 'always') {
      return true;
    }

    if (config === 'ask') {
      const question = `file already exist${fileUri.fsPath}\nDo you want to overwrite it?`;
      const answerOptions = Object.values(UserInputPrompt);
      const userResponse = await vscode.window.showInformationMessage(question, ...answerOptions);

      return userResponse === UserInputPrompt.Yes;
    }

    throw new Error('config of overwriteExistentFiles has an unexpected or unsupported value');
  }
}
