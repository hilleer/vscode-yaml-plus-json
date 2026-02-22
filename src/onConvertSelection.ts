import type { Range, Selection, TextDocument } from 'vscode';

import { ConvertFromType } from './converter';
import { getJsonFromYaml, getYamlFromJson, showError } from './helpers';
import { contextProvider } from './contextProvider';

export function onConvertSelection(fromType: ConvertFromType) {
  const converter = getSelectionConverter(fromType);

  return async () => {
    try {
      const vscode = contextProvider.vscode;
      const editor = vscode.window.activeTextEditor;

      if (!editor) {
        return;
      }

      const { selection, document } = editor;
      const text = document.getText(selection);
      const newText = converter(text);

      const range = getSelectionRange(selection);

      await replaceSelection(document, range, newText);
      const { end } = selection;
      editor.selection = new vscode.Selection(end, end);
    } catch (error) {
      showError(error);
    }
  };
}

export function getSelectionConverter(fromType: ConvertFromType) {
  return {
    [ConvertFromType.Json]: getYamlFromJson,
    [ConvertFromType.Yaml]: getJsonFromYaml,
  }[fromType];
}

function getSelectionRange(selection: Selection) {
  const { start, end } = selection;
  const vscode = contextProvider.vscode;
  const range = new vscode.Range(start, end);

  return range;
}

async function replaceSelection(
  document: TextDocument,
  range: Range,
  replacement: string,
) {
  const vscode = contextProvider.vscode;
  const { uri } = document;

  const edit = new vscode.WorkspaceEdit();

  try {
    edit.replace(uri, range, replacement);
    await vscode.workspace.applyEdit(edit);
  } catch (error) {
    showError(error);
  }
}
