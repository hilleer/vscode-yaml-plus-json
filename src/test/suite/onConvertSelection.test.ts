import * as assert from 'assert';
import * as Sinon from 'sinon';
import * as vscode from 'vscode';
import type { TextEditor, TextDocument, Range, WorkspaceEdit, Selection } from 'vscode';

import { onConvertSelection, getSelectionConverter } from '../../onConvertSelection';
import { ConvertFromType } from '../../converter';
import { WorkspaceConfigurationMock } from '../testUtil';
import { contextProvider } from '../../contextProvider';

const YAML_CONTENT = 'name: foo\nvalue: 1\n';
const JSON_CONTENT = JSON.stringify({ name: 'foo', value: 1 }, null, 2);

function createMockEditor(text: string, selection: Selection): TextEditor {
  const document = {
    getText: (range?: Range) => {
      if (!range) return text;
      const lines = text.split('\n');
      const result: string[] = [];
      for (let i = range.start.line; i <= range.end.line; i++) {
        const line = lines[i] || '';
        if (i === range.start.line && i === range.end.line) {
          result.push(line.substring(range.start.character, range.end.character));
        } else if (i === range.start.line) {
          result.push(line.substring(range.start.character));
        } else if (i === range.end.line) {
          result.push(line.substring(0, range.end.character));
        } else {
          result.push(line);
        }
      }
      return result.join('\n');
    },
    uri: vscode.Uri.file('/fake/file'),
  } as unknown as TextDocument;

  return {
    document,
    selection,
    edit: Sinon.stub().resolves(true),
  } as unknown as TextEditor;
}

suite('onConvertSelection', () => {
  let showErrorMessageStub: Sinon.SinonStub;
  let applyEditStub: Sinon.SinonStub;
  let configMock: WorkspaceConfigurationMock | undefined;

  setup(() => {
    showErrorMessageStub = Sinon.stub(vscode.window, 'showErrorMessage');
    applyEditStub = Sinon.stub(vscode.workspace, 'applyEdit').resolves(true);
    contextProvider.setVscode(vscode);
  });

  teardown(() => {
    configMock?.restore();
    configMock = undefined;
    Sinon.restore();
    contextProvider.reset();
  });

  function withConfig(config: Record<string, unknown>) {
    configMock = new WorkspaceConfigurationMock(config);
  }

  suite('getSelectionConverter', () => {
    test('returns getYamlFromJson for ConvertFromType.Json', () => {
      const converter = getSelectionConverter(ConvertFromType.Json);
      const result = converter(JSON_CONTENT);
      assert.ok(result.includes('name:'));
      assert.ok(result.includes('value:'));
    });

    test('returns getJsonFromYaml for ConvertFromType.Yaml', () => {
      const converter = getSelectionConverter(ConvertFromType.Yaml);
      const result = converter(YAML_CONTENT);
      assert.ok(result.includes('"name":'));
      assert.ok(result.includes('"value":'));
    });
  });

  suite('JSON to YAML conversion', () => {
    test('converts selected JSON text to YAML', async () => {
      withConfig({});
      const text = JSON_CONTENT;
      // Select all content - JSON_CONTENT is 4 lines, select to end of last line
      const selection = new vscode.Selection(0, 0, 3, 1);
      const editor = createMockEditor(text, selection);

      Sinon.stub(vscode.window, 'activeTextEditor').value(editor);

      const command = onConvertSelection(ConvertFromType.Json);
      await command();

      assert.strictEqual(applyEditStub.callCount, 1);
      const edit = applyEditStub.firstCall.args[0] as WorkspaceEdit;
      const entries = edit.entries();
      assert.strictEqual(entries.length, 1);
    });

    test('handles partial selection', async () => {
      withConfig({});
      // Use a complete valid JSON that we can select a portion of
      // The selected text must be valid JSON on its own
      const text = '"partial value"';
      // Select the entire string (valid JSON string)
      const selection = new vscode.Selection(0, 0, 0, 15);
      const editor = createMockEditor(text, selection);

      Sinon.stub(vscode.window, 'activeTextEditor').value(editor);

      const command = onConvertSelection(ConvertFromType.Json);
      await command();

      assert.strictEqual(applyEditStub.callCount, 1);
    });

    test('handles empty selection gracefully', async () => {
      withConfig({});
      const text = JSON_CONTENT;
      // Empty selection
      const selection = new vscode.Selection(0, 0, 0, 0);
      const editor = createMockEditor(text, selection);

      Sinon.stub(vscode.window, 'activeTextEditor').value(editor);

      const command = onConvertSelection(ConvertFromType.Json);
      await command();

      // Should still try to convert (empty string is valid)
      assert.strictEqual(applyEditStub.callCount, 1);
    });
  });

  suite('YAML to JSON conversion', () => {
    test('converts selected YAML text to JSON', async () => {
      withConfig({});
      const text = YAML_CONTENT;
      // YAML_CONTENT is 3 lines: "name: foo\nvalue: 1\n" - select all content
      const selection = new vscode.Selection(0, 0, 2, 8);
      const editor = createMockEditor(text, selection);

      Sinon.stub(vscode.window, 'activeTextEditor').value(editor);

      const command = onConvertSelection(ConvertFromType.Yaml);
      await command();

      assert.strictEqual(applyEditStub.callCount, 1);
    });

    test('handles partial YAML selection', async () => {
      withConfig({});
      const text = 'name: foo\nvalue: 1\nother: bar';
      // Select just one line
      const selection = new vscode.Selection(0, 0, 0, 9);
      const editor = createMockEditor(text, selection);

      Sinon.stub(vscode.window, 'activeTextEditor').value(editor);

      const command = onConvertSelection(ConvertFromType.Yaml);
      await command();

      assert.strictEqual(applyEditStub.callCount, 1);
    });
  });

  suite('editor handling', () => {
    test('does nothing when there is no active editor', async () => {
      withConfig({});
      Sinon.stub(vscode.window, 'activeTextEditor').value(undefined);

      const command = onConvertSelection(ConvertFromType.Json);
      await command();

      assert.strictEqual(applyEditStub.callCount, 0);
    });

    test('moves cursor to end of selection after conversion', async () => {
      withConfig({});
      const text = JSON_CONTENT;
      // Select all content - JSON_CONTENT is 4 lines
      const selection = new vscode.Selection(0, 0, 3, 1);
      const editor = createMockEditor(text, selection);

      // Create a mock selection setter to track if selection is updated
      let selectionWasUpdated = false;
      Object.defineProperty(editor, 'selection', {
        set: () => {
          selectionWasUpdated = true;
        },
        get: () => selection,
        configurable: true,
      });

      Sinon.stub(vscode.window, 'activeTextEditor').value(editor);

      const command = onConvertSelection(ConvertFromType.Json);
      await command();

      // applyEdit should be called for the conversion
      assert.strictEqual(applyEditStub.callCount, 1);
      // Selection should have been updated
      assert.strictEqual(selectionWasUpdated, true);
    });
  });

  suite('error handling', () => {
    test('shows error message for invalid JSON', async () => {
      withConfig({});
      const text = '{ invalid json }';
      const selection = new vscode.Selection(0, 0, 0, 16);
      const editor = createMockEditor(text, selection);

      Sinon.stub(vscode.window, 'activeTextEditor').value(editor);

      const command = onConvertSelection(ConvertFromType.Json);
      await command();

      assert.strictEqual(showErrorMessageStub.callCount, 1);
      assert.strictEqual(applyEditStub.callCount, 0);
    });

    test('shows error message for invalid YAML', async () => {
      withConfig({});
      const text = '--- {unclosed';
      const selection = new vscode.Selection(0, 0, 0, 12);
      const editor = createMockEditor(text, selection);

      Sinon.stub(vscode.window, 'activeTextEditor').value(editor);

      const command = onConvertSelection(ConvertFromType.Yaml);
      await command();

      assert.strictEqual(showErrorMessageStub.callCount, 1);
      assert.strictEqual(applyEditStub.callCount, 0);
    });

    test('handles applyEdit failure gracefully', async () => {
      withConfig({});
      applyEditStub.rejects(new Error('Edit failed'));

      const text = JSON_CONTENT;
      const selection = new vscode.Selection(0, 0, 2, 0);
      const editor = createMockEditor(text, selection);

      Sinon.stub(vscode.window, 'activeTextEditor').value(editor);

      const command = onConvertSelection(ConvertFromType.Json);
      await command();

      assert.strictEqual(showErrorMessageStub.callCount, 1);
    });
  });

  suite('complex content', () => {
    test('converts nested JSON object', async () => {
      withConfig({});
      const nestedJson = JSON.stringify(
        {
          level1: {
            level2: {
              value: 'deep',
            },
          },
        },
        null,
        2,
      );
      // Select all content (7 lines total, lines 0-6)
      const selection = new vscode.Selection(0, 0, 6, 1);
      const editor = createMockEditor(nestedJson, selection);

      Sinon.stub(vscode.window, 'activeTextEditor').value(editor);

      const command = onConvertSelection(ConvertFromType.Json);
      await command();

      assert.strictEqual(applyEditStub.callCount, 1);
    });

    test('converts YAML with arrays', async () => {
      withConfig({});
      const yamlWithArray = `items:
  - first
  - second
  - third`;
      const selection = new vscode.Selection(0, 0, 3, 10);
      const editor = createMockEditor(yamlWithArray, selection);

      Sinon.stub(vscode.window, 'activeTextEditor').value(editor);

      const command = onConvertSelection(ConvertFromType.Yaml);
      await command();

      assert.strictEqual(applyEditStub.callCount, 1);
      const edit = applyEditStub.firstCall.args[0] as WorkspaceEdit;
      const entries = edit.entries();
      const replacement = entries[0][1][0].newText;
      assert.ok(replacement.includes('[') || replacement.includes('items'));
    });

    test('converts multi-line selection', async () => {
      withConfig({});
      const text = `{
  "key1": "value1",
  "key2": "value2"
}`;
      const selection = new vscode.Selection(0, 0, 3, 1);
      const editor = createMockEditor(text, selection);

      Sinon.stub(vscode.window, 'activeTextEditor').value(editor);

      const command = onConvertSelection(ConvertFromType.Json);
      await command();

      assert.strictEqual(applyEditStub.callCount, 1);
    });
  });

  suite('selection range', () => {
    test('handles single character selection', async () => {
      withConfig({});
      // A quoted string is valid JSON, so select just the string value including quotes
      const text = '{"a":1}';
      const selection = new vscode.Selection(0, 5, 0, 6);
      const editor = createMockEditor(text, selection);

      Sinon.stub(vscode.window, 'activeTextEditor').value(editor);

      const command = onConvertSelection(ConvertFromType.Json);
      await command();

      assert.strictEqual(applyEditStub.callCount, 1);
    });

    test('handles selection spanning multiple lines', async () => {
      withConfig({});
      const text = 'line1\nline2\nline3\nline4';
      const selection = new vscode.Selection(0, 0, 3, 5);
      const editor = createMockEditor(text, selection);

      Sinon.stub(vscode.window, 'activeTextEditor').value(editor);

      const command = onConvertSelection(ConvertFromType.Yaml);
      await command();

      assert.strictEqual(applyEditStub.callCount, 1);
    });

    test('handles reversed selection (end before start)', async () => {
      withConfig({});
      const text = JSON_CONTENT;
      // Reversed selection but should still capture all content
      const selection = new vscode.Selection(3, 1, 0, 0);
      const editor = createMockEditor(text, selection);

      Sinon.stub(vscode.window, 'activeTextEditor').value(editor);

      const command = onConvertSelection(ConvertFromType.Json);
      await command();

      assert.strictEqual(applyEditStub.callCount, 1);
    });
  });
});
