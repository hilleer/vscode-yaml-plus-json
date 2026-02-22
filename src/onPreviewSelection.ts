import * as vscode from 'vscode';

import { ConvertFromType } from './converter';
import { getSelectionConverter } from './onConvertSelection';

export function onPreviewSelection(fromType: ConvertFromType) {
  const converter = getSelectionConverter(fromType);

  return async () => {
    try {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        throw new Error('editor not found');
      }

      const { selection, document } = editor;
      // If no text is selected, convert the entire file; otherwise convert only the selection
      const text = selection.isEmpty ? document.getText() : document.getText(selection);

      if (!text.trim()) {
        vscode.window.showErrorMessage('No content to convert.');
        return;
      }

      const previewText = converter(text);
      const previewDocument = await vscode.workspace.openTextDocument({
        content: previewText,
        language: getTextDocumentLanguage(fromType),
      });

      await vscode.window.showTextDocument(previewDocument);
    } catch (error) {
      console.error(error);
      vscode.window.showErrorMessage(`an error occurred converting content from ${fromType.toLowerCase()}`);
    }
  };
}

function getTextDocumentLanguage(fromType: ConvertFromType) {
  return {
    [ConvertFromType.Json]: 'yaml',
    [ConvertFromType.Yaml]: 'json',
  }[fromType];
}
