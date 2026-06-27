import type { FileRenameEvent, TextDocument } from 'vscode';

import { contextProvider } from './contextProvider';
import { ConfigId, getConfig } from './config';
import * as path from 'path';

import {
  showError,
  getJson5FromYaml,
  getJsonFromYaml,
  getJsoncFromYaml,
  getYamlFromJson,
  getYamlFromJson5,
  getYamlFromJsonc,
  hasJson5OnlySyntax,
  stripJsoncComments,
  warnJson5CommentsStripped,
} from './helpers';

export async function onFileRename(event: FileRenameEvent): Promise<void> {
  const vscode = contextProvider.vscode;
  const shouldConvertOnRename = getConfig<boolean>(ConfigId.ConvertOnRename);

  if (!shouldConvertOnRename) {
    return;
  }

  for (const change of event.files) {
    const { oldUri, newUri } = change;

    const oldPath = oldUri.path;
    const newPath = newUri.path;

    const shouldConvertJson =
      (oldPath.endsWith('.json') || oldPath.endsWith('.jsonc') || oldPath.endsWith('.json5')) &&
      (newPath.endsWith('.yaml') || newPath.endsWith('.yml'));
    const shouldConvertYaml =
      (oldPath.endsWith('.yaml') || oldPath.endsWith('.yml')) &&
      (newPath.endsWith('.json') || newPath.endsWith('.jsonc') || newPath.endsWith('.json5'));

    if (!shouldConvertJson && !shouldConvertYaml) {
      continue;
    }

    try {
      const document = await vscode.workspace.openTextDocument(newUri);

      // language id of the NEW file
      switch (document.languageId) {
        case 'jsonc':
          await convertYamlToJsonc(document);
          break;
        case 'json5':
          await convertYamlToJson5(document);
          break;
        case 'json':
          await convertYamlToJson(document);
          break;
        case 'yaml':
          await convertJsonToYaml(document, oldUri.path);
          break;
      }
    } catch (error: unknown) {
      showError(error);
    }
  }
}

async function convertJsonToYaml(document: TextDocument, oldPath: string) {
  try {
    const text = document.getText();
    const preserveComments = getConfig<boolean>(ConfigId.PreserveComments) ?? true;
    const isJsonc = oldPath.endsWith('.jsonc');
    const isJson5 = oldPath.endsWith('.json5');

    let yaml: string;
    let didStripJson5Comments = false;
    if (preserveComments && isJsonc) {
      yaml = getYamlFromJsonc(text);
    } else if (isJson5) {
      if (preserveComments) {
        didStripJson5Comments = hasJson5OnlySyntax(text);
      }
      yaml = getYamlFromJson5(text);
    } else {
      const content = isJsonc ? stripJsoncComments(text) : text;
      yaml = getYamlFromJson(content);
    }

    await replaceFileContent(document, yaml);
    if (didStripJson5Comments) {
      warnJson5CommentsStripped(path.basename(oldPath));
    }
  } catch (error: unknown) {
    showError(error);
  }
}

async function convertYamlToJson(document: TextDocument) {
  try {
    const yaml = document.getText();
    const json = getJsonFromYaml(yaml);

    await replaceFileContent(document, json);
  } catch (error: unknown) {
    showError(error);
  }
}

async function convertYamlToJsonc(document: TextDocument) {
  try {
    const yaml = document.getText();
    const preserveComments = getConfig<boolean>(ConfigId.PreserveComments) ?? true;

    const jsonc = preserveComments ? getJsoncFromYaml(yaml) : getJsonFromYaml(yaml);

    await replaceFileContent(document, jsonc);
  } catch (error: unknown) {
    showError(error);
  }
}

async function convertYamlToJson5(document: TextDocument) {
  try {
    const yaml = document.getText();
    const preserveComments = getConfig<boolean>(ConfigId.PreserveComments) ?? true;

    const json5 = preserveComments ? getJson5FromYaml(yaml) : getJsonFromYaml(yaml);

    await replaceFileContent(document, json5);
  } catch (error: unknown) {
    showError(error);
  }
}

async function replaceFileContent(document: TextDocument, newText: string) {
  const vscode = contextProvider.vscode;
  const { lineCount, isDirty, uri } = document;

  const edit = new vscode.WorkspaceEdit();
  const range = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(lineCount, Number.MAX_VALUE));

  try {
    if (isDirty) {
      await document.save();
    }

    edit.replace(uri, range, newText);
    await vscode.workspace.applyEdit(edit);
    await document.save();
  } catch (error: unknown) {
    showError(error);
  }
}
