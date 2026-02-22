import type { FileRenameEvent, TextDocument } from 'vscode';

import { contextProvider } from './contextProvider';
import { ConfigId, getConfig } from './config';
import { showError, getJsonFromYaml, getYamlFromJson } from './helpers';

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

    const shouldConvertJson = oldPath.endsWith('.json') && (newPath.endsWith('.yaml') || newPath.endsWith('.yml'));
    const shouldConvertYaml = (oldPath.endsWith('.yaml') || oldPath.endsWith('.yml')) && newPath.endsWith('.json');

    if (!shouldConvertJson && !shouldConvertYaml) {
      continue;
    }

    try {
      const document = await vscode.workspace.openTextDocument(newUri);

      // language id of the NEW file
      switch (document.languageId) {
        case 'json':
          await convertYamlToJson(document);
          break;
        case 'yaml':
          await convertJsonToYaml(document);
          break;
      }
    } catch (error: unknown) {
      showError(error);
    }
  }
}

async function convertJsonToYaml(document: TextDocument) {
  try {
    const json = document.getText();
    const yaml = getYamlFromJson(json);

    await replaceFileContent(document, yaml);
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
