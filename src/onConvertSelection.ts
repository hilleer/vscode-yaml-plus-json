import type { Range, Selection, TextDocument } from 'vscode';

import { ConvertFromType } from './converter';
import {
  confirmJson5CommentStrip,
  getJson5FromYaml,
  getJsonFromYaml,
  getJsoncFromYaml,
  getYamlFromJson,
  getYamlFromJson5,
  getYamlFromJsonc,
  hasJson5OnlySyntax,
  showError,
} from './helpers';
import { ConfigId, getConfig } from './config';
import { contextProvider } from './contextProvider';

export function onConvertSelection(fromType: ConvertFromType) {
  return async () => {
    try {
      const vscode = contextProvider.vscode;
      const editor = vscode.window.activeTextEditor;

      if (!editor) {
        return;
      }

      const { selection, document } = editor;
      const text = document.getText(selection);

      const converted = await convertSelectionText(fromType, text, document.languageId);
      if (converted === null) {
        return;
      }

      const range = getSelectionRange(selection);
      await replaceSelection(document, range, converted);
      const { end } = selection;
      editor.selection = new vscode.Selection(end, end);
    } catch (error) {
      showError(error);
    }
  };
}

/**
 * Runs the selection through the appropriate converter for the editor's language.
 * Returns `null` when the user declined a JSON5 comment-strip prompt.
 */
export async function convertSelectionText(
  fromType: ConvertFromType,
  text: string,
  languageId: string,
): Promise<string | null> {
  const preserveComments = getConfig<boolean>(ConfigId.PreserveComments) ?? true;

  if (fromType === ConvertFromType.Json) {
    if (languageId === 'json5') {
      if (preserveComments && hasJson5OnlySyntax(text)) {
        const confirmed = await confirmJson5CommentStrip('selection');
        if (!confirmed) return null;
      }
      return getYamlFromJson5(text);
    }
    if (languageId === 'jsonc' && preserveComments) {
      return getYamlFromJsonc(text);
    }
    return getYamlFromJson(text);
  }

  // YAML -> JSON/JSONC/JSON5 based on target extension preference
  const targetJsonExt = getConfig<string>(ConfigId.FileExtensionsJson) || '.json';
  if (targetJsonExt === '.jsonc' && preserveComments) {
    return getJsoncFromYaml(text);
  }
  if (targetJsonExt === '.json5' && preserveComments) {
    return getJson5FromYaml(text);
  }
  return getJsonFromYaml(text);
}

function getSelectionRange(selection: Selection) {
  const { start, end } = selection;
  const vscode = contextProvider.vscode;
  const range = new vscode.Range(start, end);

  return range;
}

async function replaceSelection(document: TextDocument, range: Range, replacement: string) {
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
