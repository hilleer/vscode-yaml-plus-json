import * as assert from 'assert';
import * as Sinon from 'sinon';
import * as vscode from 'vscode';

import { onFileRename } from '../../onFileRename';
import { ConfigId, Configs } from '../../config';
import { WorkspaceConfigurationMock, createMockVscode } from '../testUtil';
import { contextProvider } from '../../contextProvider';

const YAML_CONTENT = 'name: foo\nvalue: 1\n';
const JSON_CONTENT = JSON.stringify({ name: 'foo', value: 1 }, null, 2);

function makeDocument(text: string, languageId: string): vscode.TextDocument {
  return {
    getText: () => text,
    languageId,
    lineCount: text.split('\n').length,
    isDirty: false,
    uri: vscode.Uri.file('/fake/path'),
    save: Sinon.stub().resolves(),
  } as unknown as vscode.TextDocument;
}

suite('onFileRename', () => {
  let showErrorMessageStub: Sinon.SinonStub;
  let configMock: WorkspaceConfigurationMock | undefined;
  let mockOpenTextDocument: Sinon.SinonStub;
  let mockApplyEdit: Sinon.SinonStub;

  setup(() => {
    showErrorMessageStub = Sinon.stub();
    mockOpenTextDocument = Sinon.stub();
    mockApplyEdit = Sinon.stub().resolves(true);

    contextProvider.setVscode(
      createMockVscode({
        workspace: {
          openTextDocument: mockOpenTextDocument,
          applyEdit: mockApplyEdit,
        },
        window: {
          showErrorMessage: showErrorMessageStub,
        },
      }),
    );
  });

  teardown(() => {
    configMock?.restore();
    configMock = undefined;
    Sinon.restore();
    contextProvider.reset();
  });

  function withConfig(config: Partial<Configs>) {
    configMock = new WorkspaceConfigurationMock(config);
  }

  function createRenameEvent(oldPath: string, newPath: string): vscode.FileRenameEvent {
    return {
      files: [
        {
          oldUri: vscode.Uri.file(oldPath),
          newUri: vscode.Uri.file(newPath),
        },
      ],
    } as vscode.FileRenameEvent;
  }

  suite('convertOnRename disabled', () => {
    test('does nothing when convertOnRename is false', async () => {
      withConfig({ [ConfigId.ConvertOnRename]: false });
      const event = createRenameEvent('/fake/file.json', '/fake/file.yaml');

      mockOpenTextDocument.resolves(makeDocument(JSON_CONTENT, 'yaml'));

      await onFileRename(event);

      assert.strictEqual(mockOpenTextDocument.callCount, 0);
    });

    test('does nothing when convertOnRename is not set', async () => {
      withConfig({});
      const event = createRenameEvent('/fake/file.json', '/fake/file.yaml');

      mockOpenTextDocument.resolves(makeDocument(JSON_CONTENT, 'yaml'));

      await onFileRename(event);

      assert.strictEqual(mockOpenTextDocument.callCount, 0);
    });
  });

  suite('JSON to YAML conversion', () => {
    setup(() => {
      withConfig({ [ConfigId.ConvertOnRename]: true });
    });

    test('converts content when renaming .json to .yaml', async () => {
      const event = createRenameEvent('/fake/file.json', '/fake/file.yaml');
      const document = makeDocument(JSON_CONTENT, 'yaml');

      mockOpenTextDocument.resolves(document);

      await onFileRename(event);

      assert.strictEqual(mockOpenTextDocument.callCount, 1);
      assert.strictEqual(mockApplyEdit.callCount, 1);
    });

    test('converts content when renaming .json to .yml', async () => {
      const event = createRenameEvent('/fake/file.json', '/fake/file.yml');
      const document = makeDocument(JSON_CONTENT, 'yaml');

      mockOpenTextDocument.resolves(document);

      await onFileRename(event);

      assert.strictEqual(mockOpenTextDocument.callCount, 1);
      assert.strictEqual(mockApplyEdit.callCount, 1);
    });

    test('does not convert when old file is not .json', async () => {
      const event = createRenameEvent('/fake/file.txt', '/fake/file.yaml');
      const document = makeDocument('some text', 'yaml');

      mockOpenTextDocument.resolves(document);

      await onFileRename(event);

      assert.strictEqual(mockApplyEdit.callCount, 0);
    });

    test('does not convert when new file is not .yaml or .yml', async () => {
      const event = createRenameEvent('/fake/file.json', '/fake/file.txt');
      const document = makeDocument(JSON_CONTENT, 'plaintext');

      mockOpenTextDocument.resolves(document);

      await onFileRename(event);

      assert.strictEqual(mockApplyEdit.callCount, 0);
    });
  });

  suite('YAML to JSON conversion', () => {
    setup(() => {
      withConfig({ [ConfigId.ConvertOnRename]: true });
    });

    test('converts content when renaming .yaml to .json', async () => {
      const event = createRenameEvent('/fake/file.yaml', '/fake/file.json');
      const document = makeDocument(YAML_CONTENT, 'json');

      mockOpenTextDocument.resolves(document);

      await onFileRename(event);

      assert.strictEqual(mockOpenTextDocument.callCount, 1);
      assert.strictEqual(mockApplyEdit.callCount, 1);
    });

    test('converts content when renaming .yml to .json', async () => {
      const event = createRenameEvent('/fake/file.yml', '/fake/file.json');
      const document = makeDocument(YAML_CONTENT, 'json');

      mockOpenTextDocument.resolves(document);

      await onFileRename(event);

      assert.strictEqual(mockOpenTextDocument.callCount, 1);
      assert.strictEqual(mockApplyEdit.callCount, 1);
    });

    test('does not convert when old file is not .yaml or .yml', async () => {
      const event = createRenameEvent('/fake/file.txt', '/fake/file.json');
      const document = makeDocument('some text', 'json');

      mockOpenTextDocument.resolves(document);

      await onFileRename(event);

      assert.strictEqual(mockApplyEdit.callCount, 0);
    });

    test('does not convert when new file is not .json', async () => {
      const event = createRenameEvent('/fake/file.yaml', '/fake/file.txt');
      const document = makeDocument(YAML_CONTENT, 'plaintext');

      mockOpenTextDocument.resolves(document);

      await onFileRename(event);

      assert.strictEqual(mockApplyEdit.callCount, 0);
    });
  });

  suite('multiple file renames', () => {
    setup(() => {
      withConfig({ [ConfigId.ConvertOnRename]: true });
    });

    test('converts multiple files in a single rename event', async () => {
      const event = {
        files: [
          {
            oldUri: vscode.Uri.file('/fake/file1.json'),
            newUri: vscode.Uri.file('/fake/file1.yaml'),
          },
          {
            oldUri: vscode.Uri.file('/fake/file2.yml'),
            newUri: vscode.Uri.file('/fake/file2.json'),
          },
        ],
      } as vscode.FileRenameEvent;

      mockOpenTextDocument
        .onFirstCall()
        .resolves(makeDocument(JSON_CONTENT, 'yaml'))
        .onSecondCall()
        .resolves(makeDocument(YAML_CONTENT, 'json'));

      await onFileRename(event);

      assert.strictEqual(mockOpenTextDocument.callCount, 2);
      assert.strictEqual(mockApplyEdit.callCount, 2);
    });

    test('processes only convertible file renames', async () => {
      const event = {
        files: [
          {
            oldUri: vscode.Uri.file('/fake/file1.json'),
            newUri: vscode.Uri.file('/fake/file1.yaml'),
          },
          {
            oldUri: vscode.Uri.file('/fake/file2.txt'),
            newUri: vscode.Uri.file('/fake/file2.md'),
          },
          {
            oldUri: vscode.Uri.file('/fake/file3.yml'),
            newUri: vscode.Uri.file('/fake/file3.json'),
          },
        ],
      } as vscode.FileRenameEvent;

      mockOpenTextDocument
        .onFirstCall()
        .resolves(makeDocument(JSON_CONTENT, 'yaml'))
        .onSecondCall()
        .resolves(makeDocument('text', 'plaintext'))
        .onThirdCall()
        .resolves(makeDocument(YAML_CONTENT, 'json'));

      await onFileRename(event);

      // Should only process 2 files (json->yaml and yml->json)
      // The implementation only calls openTextDocument for convertible files
      assert.strictEqual(mockOpenTextDocument.callCount, 2);
      // But only 1 should have edit applied (only json->yaml and yml->json pairs work)
      assert.strictEqual(mockApplyEdit.callCount, 1);
    });
  });

  suite('document language detection', () => {
    setup(() => {
      withConfig({ [ConfigId.ConvertOnRename]: true });
    });

    test('uses languageId to determine conversion type', async () => {
      const event = createRenameEvent('/fake/file.json', '/fake/file.yaml');
      // Document has JSON content but yaml language ID
      const document = makeDocument(JSON_CONTENT, 'yaml');

      mockOpenTextDocument.resolves(document);

      await onFileRename(event);

      // Should convert because languageId is 'yaml'
      assert.strictEqual(mockApplyEdit.callCount, 1);
    });

    test('handles different content based on languageId', async () => {
      const event = createRenameEvent('/fake/file.yaml', '/fake/file.json');
      // Document has YAML content but json language ID
      const document = makeDocument(YAML_CONTENT, 'json');

      mockOpenTextDocument.resolves(document);

      await onFileRename(event);

      // Should convert because languageId is 'json'
      assert.strictEqual(mockApplyEdit.callCount, 1);
    });
  });

  suite('error handling', () => {
    setup(() => {
      withConfig({ [ConfigId.ConvertOnRename]: true });
    });

    test('shows error message for invalid JSON content', async () => {
      const event = createRenameEvent('/fake/file.json', '/fake/file.yaml');
      const document = makeDocument('{ invalid json }', 'yaml');

      mockOpenTextDocument.resolves(document);

      await onFileRename(event);

      assert.strictEqual(showErrorMessageStub.callCount, 1);
      assert.strictEqual(mockApplyEdit.callCount, 0);
    });

    test('shows error message for invalid YAML content', async () => {
      const event = createRenameEvent('/fake/file.yaml', '/fake/file.json');
      const document = makeDocument('--- {unclosed', 'json');

      mockOpenTextDocument.resolves(document);

      await onFileRename(event);

      assert.strictEqual(showErrorMessageStub.callCount, 1);
      assert.strictEqual(mockApplyEdit.callCount, 0);
    });

    test('handles errors when opening document fails', async () => {
      const event = createRenameEvent('/fake/file.json', '/fake/file.yaml');

      mockOpenTextDocument.rejects(new Error('File not found'));

      await onFileRename(event);

      // Should not throw, but error handling depends on implementation
      assert.strictEqual(mockOpenTextDocument.callCount, 1);
    });

    test('handles dirty documents by saving first', async () => {
      const event = createRenameEvent('/fake/file.json', '/fake/file.yaml');
      const saveStub = Sinon.stub().resolves();
      // Create a proper mock document that will save before conversion
      const document = {
        getText: () => JSON_CONTENT,
        languageId: 'yaml',
        lineCount: JSON_CONTENT.split('\n').length,
        isDirty: true,
        uri: vscode.Uri.file('/fake/file.yaml'),
        save: saveStub,
      } as unknown as vscode.TextDocument;

      mockOpenTextDocument.resolves(document);

      await onFileRename(event);

      // Should call save twice: once before conversion (because isDirty) and once after
      assert.strictEqual(saveStub.callCount, 2);
      // applyEdit should be called at least once for the replace operation
      assert.ok(mockApplyEdit.callCount >= 1, 'applyEdit should be called at least once');
    });
  });

  suite('edge cases', () => {
    setup(() => {
      withConfig({ [ConfigId.ConvertOnRename]: true });
    });

    test('handles empty rename event', async () => {
      const event = {
        files: [],
      } as vscode.FileRenameEvent;

      // Reset the stub to ensure clean state
      mockOpenTextDocument.resolves(makeDocument('', 'plaintext'));

      await onFileRename(event);

      // With empty files array, no documents should be opened
      assert.strictEqual(mockOpenTextDocument.callCount, 0);
    });

    test('handles paths with dots in directory names', async () => {
      const event = createRenameEvent('/some.dir/file.json', '/some.dir/file.yaml');
      const document = makeDocument(JSON_CONTENT, 'yaml');

      mockOpenTextDocument.resolves(document);

      await onFileRename(event);

      assert.strictEqual(mockApplyEdit.callCount, 1);
    });

    test('handles paths with multiple extensions', async () => {
      const event = createRenameEvent('/fake/file.test.json', '/fake/file.test.yaml');
      const document = makeDocument(JSON_CONTENT, 'yaml');

      mockOpenTextDocument.resolves(document);

      await onFileRename(event);

      assert.strictEqual(mockApplyEdit.callCount, 1);
    });
  });
});
