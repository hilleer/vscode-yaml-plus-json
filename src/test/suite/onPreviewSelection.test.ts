import * as assert from 'assert';
import * as Sinon from 'sinon';
import * as vscode from 'vscode';

import { onPreviewSelection } from '../../onPreviewSelection';
import { ConvertFromType } from '../../converter';
import { WorkspaceConfigurationMock } from '../testUtil';

const YAML_CONTENT = 'name: foo\nvalue: 1\n';
const JSON_CONTENT = JSON.stringify({ name: 'foo', value: 1 }, null, 2);

function createMockEditor(text: string, selection: vscode.Selection): vscode.TextEditor {
  return {
    document: {
      getText: () => text,
      uri: vscode.Uri.file('/fake/file'),
    } as unknown as vscode.TextDocument,
    selection,
  } as unknown as vscode.TextEditor;
}

suite('onPreviewSelection', () => {
  let showErrorMessageStub: Sinon.SinonStub;
  let openTextDocumentStub: Sinon.SinonStub;
  let showTextDocumentStub: Sinon.SinonStub;
  let consoleErrorStub: Sinon.SinonStub;
  let configMock: WorkspaceConfigurationMock | undefined;

  setup(() => {
    showErrorMessageStub = Sinon.stub(vscode.window, 'showErrorMessage');
    consoleErrorStub = Sinon.stub(console, 'error');
    openTextDocumentStub = Sinon.stub(vscode.workspace, 'openTextDocument');
    showTextDocumentStub = Sinon.stub(vscode.window, 'showTextDocument').resolves({} as vscode.TextEditor);
  });

  teardown(() => {
    configMock?.restore();
    configMock = undefined;
    Sinon.restore();
  });

  function withConfig(config: Record<string, unknown>) {
    configMock = new WorkspaceConfigurationMock(config);
  }

  suite('JSON to YAML preview', () => {
    test('opens preview document with YAML language', async () => {
      withConfig({});
      const text = JSON_CONTENT;
      const selection = new vscode.Selection(0, 0, 2, 0);
      const editor = createMockEditor(text, selection);

      Sinon.stub(vscode.window, 'activeTextEditor').value(editor);

      const command = onPreviewSelection(ConvertFromType.Json);
      await command();

      assert.strictEqual(openTextDocumentStub.callCount, 1);
      const options = openTextDocumentStub.firstCall.args[0] as {
        content: string;
        language: string;
      };
      assert.strictEqual(options.language, 'yaml');
      assert.ok(options.content.includes('name:'));
    });

    test('shows preview document in editor', async () => {
      withConfig({});
      const text = JSON_CONTENT;
      const selection = new vscode.Selection(0, 0, 2, 0);
      const editor = createMockEditor(text, selection);

      Sinon.stub(vscode.window, 'activeTextEditor').value(editor);

      const command = onPreviewSelection(ConvertFromType.Json);
      await command();

      assert.strictEqual(showTextDocumentStub.callCount, 1);
    });

    test('handles simple JSON object', async () => {
      withConfig({});
      const text = '{"key": "value"}';
      const selection = new vscode.Selection(0, 0, 0, 16);
      const editor = createMockEditor(text, selection);

      Sinon.stub(vscode.window, 'activeTextEditor').value(editor);

      const command = onPreviewSelection(ConvertFromType.Json);
      await command();

      assert.strictEqual(openTextDocumentStub.callCount, 1);
      const options = openTextDocumentStub.firstCall.args[0] as {
        content: string;
        language: string;
      };
      assert.strictEqual(options.language, 'yaml');
    });
  });

  suite('YAML to JSON preview', () => {
    test('opens preview document with JSON language', async () => {
      withConfig({});
      const text = YAML_CONTENT;
      const selection = new vscode.Selection(0, 0, 2, 0);
      const editor = createMockEditor(text, selection);

      Sinon.stub(vscode.window, 'activeTextEditor').value(editor);

      const command = onPreviewSelection(ConvertFromType.Yaml);
      await command();

      assert.strictEqual(openTextDocumentStub.callCount, 1);
      const options = openTextDocumentStub.firstCall.args[0] as {
        content: string;
        language: string;
      };
      assert.strictEqual(options.language, 'json');
      assert.ok(options.content.includes('{'));
    });

    test('shows preview document in editor', async () => {
      withConfig({});
      const text = YAML_CONTENT;
      const selection = new vscode.Selection(0, 0, 2, 0);
      const editor = createMockEditor(text, selection);

      Sinon.stub(vscode.window, 'activeTextEditor').value(editor);

      const command = onPreviewSelection(ConvertFromType.Yaml);
      await command();

      assert.strictEqual(showTextDocumentStub.callCount, 1);
    });

    test('handles simple YAML', async () => {
      withConfig({});
      const text = 'key: value';
      const selection = new vscode.Selection(0, 0, 0, 10);
      const editor = createMockEditor(text, selection);

      Sinon.stub(vscode.window, 'activeTextEditor').value(editor);

      const command = onPreviewSelection(ConvertFromType.Yaml);
      await command();

      assert.strictEqual(openTextDocumentStub.callCount, 1);
      const options = openTextDocumentStub.firstCall.args[0] as {
        content: string;
        language: string;
      };
      assert.strictEqual(options.language, 'json');
    });
  });

  suite('editor handling', () => {
    test('throws error when no active editor', async () => {
      withConfig({});
      Sinon.stub(vscode.window, 'activeTextEditor').value(undefined);

      const command = onPreviewSelection(ConvertFromType.Json);
      await command();

      assert.strictEqual(showErrorMessageStub.callCount, 1);
      assert.ok(
        (showErrorMessageStub.firstCall.args[0] as string).includes('an error occurred converting'),
        'should show conversion error',
      );
    });

    test('handles empty selection', async () => {
      withConfig({});
      const text = JSON_CONTENT;
      const selection = new vscode.Selection(0, 0, 0, 0);
      const editor = createMockEditor(text, selection);

      Sinon.stub(vscode.window, 'activeTextEditor').value(editor);

      const command = onPreviewSelection(ConvertFromType.Json);
      await command();

      // Should still open document with empty content
      assert.strictEqual(openTextDocumentStub.callCount, 1);
      const options = openTextDocumentStub.firstCall.args[0] as {
        content: string;
        language: string;
      };
      assert.strictEqual(options.content, '');
      assert.strictEqual(options.language, 'yaml');
    });
  });

  suite('error handling', () => {
    test('shows error for invalid JSON', async () => {
      withConfig({});
      const text = '{ invalid json }';
      const selection = new vscode.Selection(0, 0, 0, 16);
      const editor = createMockEditor(text, selection);

      Sinon.stub(vscode.window, 'activeTextEditor').value(editor);

      const command = onPreviewSelection(ConvertFromType.Json);
      await command();

      assert.strictEqual(showErrorMessageStub.callCount, 1);
      assert.ok(
        (showErrorMessageStub.firstCall.args[0] as string).includes('an error occurred converting'),
        'should show conversion error',
      );
    });

    test('shows error for invalid YAML', async () => {
      withConfig({});
      const text = '--- {unclosed';
      const selection = new vscode.Selection(0, 0, 0, 12);
      const editor = createMockEditor(text, selection);

      Sinon.stub(vscode.window, 'activeTextEditor').value(editor);

      const command = onPreviewSelection(ConvertFromType.Yaml);
      await command();

      assert.strictEqual(showErrorMessageStub.callCount, 1);
      assert.ok(
        (showErrorMessageStub.firstCall.args[0] as string).includes('an error occurred converting'),
        'should show conversion error',
      );
    });

    test('logs error to console', async () => {
      withConfig({});
      const text = '{ invalid }';
      const selection = new vscode.Selection(0, 0, 0, 11);
      const editor = createMockEditor(text, selection);

      Sinon.stub(vscode.window, 'activeTextEditor').value(editor);

      const command = onPreviewSelection(ConvertFromType.Json);
      await command();

      assert.strictEqual(consoleErrorStub.callCount, 1);
    });

    test('handles openTextDocument failure', async () => {
      withConfig({});
      openTextDocumentStub.rejects(new Error('Failed to open'));

      const text = JSON_CONTENT;
      const selection = new vscode.Selection(0, 0, 2, 0);
      const editor = createMockEditor(text, selection);

      Sinon.stub(vscode.window, 'activeTextEditor').value(editor);

      const command = onPreviewSelection(ConvertFromType.Json);
      await command();

      assert.strictEqual(showErrorMessageStub.callCount, 1);
    });

    test('handles showTextDocument failure', async () => {
      withConfig({});
      showTextDocumentStub.rejects(new Error('Failed to show'));

      const text = JSON_CONTENT;
      const selection = new vscode.Selection(0, 0, 2, 0);
      const editor = createMockEditor(text, selection);

      Sinon.stub(vscode.window, 'activeTextEditor').value(editor);

      const command = onPreviewSelection(ConvertFromType.Json);
      await command();

      assert.strictEqual(showErrorMessageStub.callCount, 1);
    });
  });

  suite('complex content', () => {
    test('previews nested JSON conversion', async () => {
      withConfig({});
      const nestedJson = JSON.stringify(
        {
          level1: {
            level2: {
              array: [1, 2, 3],
              value: 'deep',
            },
          },
        },
        null,
        2,
      );
      const selection = new vscode.Selection(0, 0, 8, 0);
      const editor = createMockEditor(nestedJson, selection);

      Sinon.stub(vscode.window, 'activeTextEditor').value(editor);

      const command = onPreviewSelection(ConvertFromType.Json);
      await command();

      assert.strictEqual(openTextDocumentStub.callCount, 1);
      const options = openTextDocumentStub.firstCall.args[0] as {
        content: string;
        language: string;
      };
      assert.strictEqual(options.language, 'yaml');
      assert.ok(options.content.includes('level1'));
      assert.ok(options.content.includes('level2'));
    });

    test('previews YAML with arrays conversion', async () => {
      withConfig({});
      const yamlWithArray = `items:
  - first
  - second
  - third`;
      const selection = new vscode.Selection(0, 0, 3, 10);
      const editor = createMockEditor(yamlWithArray, selection);

      Sinon.stub(vscode.window, 'activeTextEditor').value(editor);

      const command = onPreviewSelection(ConvertFromType.Yaml);
      await command();

      assert.strictEqual(openTextDocumentStub.callCount, 1);
      const options = openTextDocumentStub.firstCall.args[0] as {
        content: string;
        language: string;
      };
      assert.strictEqual(options.language, 'json');
      assert.ok(options.content.includes('items'));
      assert.ok(options.content.includes('[') || options.content.includes('"first"'));
    });

    test('previews multi-line selection', async () => {
      withConfig({});
      const text = `{
  "array": [1, 2, 3],
  "nested": {
    "key": "value"
  }
}`;
      const selection = new vscode.Selection(0, 0, 6, 1);
      const editor = createMockEditor(text, selection);

      Sinon.stub(vscode.window, 'activeTextEditor').value(editor);

      const command = onPreviewSelection(ConvertFromType.Json);
      await command();

      assert.strictEqual(openTextDocumentStub.callCount, 1);
    });
  });

  suite('document options', () => {
    test('creates untitled document', async () => {
      withConfig({});
      const text = JSON_CONTENT;
      const selection = new vscode.Selection(0, 0, 2, 0);
      const editor = createMockEditor(text, selection);

      Sinon.stub(vscode.window, 'activeTextEditor').value(editor);

      const command = onPreviewSelection(ConvertFromType.Json);
      await command();

      const options = openTextDocumentStub.firstCall.args[0] as { content: string; language: string };
      assert.ok(options.content !== undefined, 'should have content property');
      assert.ok(options.language !== undefined, 'should have language property');
    });

    test('preserves converted content format', async () => {
      withConfig({});
      const text = '{"compact":true}';
      const selection = new vscode.Selection(0, 0, 0, 16);
      const editor = createMockEditor(text, selection);

      Sinon.stub(vscode.window, 'activeTextEditor').value(editor);

      const command = onPreviewSelection(ConvertFromType.Json);
      await command();

      const options = openTextDocumentStub.firstCall.args[0] as {
        content: string;
        language: string;
      };
      // YAML should have proper formatting
      assert.ok(options.content.includes('compact:'));
    });
  });
});
