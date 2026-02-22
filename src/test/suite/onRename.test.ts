import * as assert from 'assert';
import * as Sinon from 'sinon';
import * as vscode from 'vscode';

import { onRename } from '../../onRename';
import { ConfigId, Configs } from '../../config';
import { WorkspaceConfigurationMock } from '../testUtil';

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

suite('onRename', () => {
  let showErrorMessageStub: Sinon.SinonStub;
  let configMock: WorkspaceConfigurationMock | undefined;
  let openTextDocumentStub: Sinon.SinonStub;
  let applyEditStub: Sinon.SinonStub;

  setup(() => {
    showErrorMessageStub = Sinon.stub(vscode.window, 'showErrorMessage');
    applyEditStub = Sinon.stub(vscode.workspace, 'applyEdit').resolves(true);
  });

  teardown(() => {
    configMock?.restore();
    configMock = undefined;
    Sinon.restore();
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

      openTextDocumentStub = Sinon.stub(vscode.workspace, 'openTextDocument').resolves(
        makeDocument(JSON_CONTENT, 'yaml'),
      );

      await onRename(event);

      assert.strictEqual(openTextDocumentStub.callCount, 0);
    });

    test('does nothing when convertOnRename is not set', async () => {
      withConfig({});
      const event = createRenameEvent('/fake/file.json', '/fake/file.yaml');

      openTextDocumentStub = Sinon.stub(vscode.workspace, 'openTextDocument').resolves(
        makeDocument(JSON_CONTENT, 'yaml'),
      );

      await onRename(event);

      assert.strictEqual(openTextDocumentStub.callCount, 0);
    });
  });

  suite('JSON to YAML conversion', () => {
    setup(() => {
      withConfig({ [ConfigId.ConvertOnRename]: true });
    });

    test('converts content when renaming .json to .yaml', async () => {
      const event = createRenameEvent('/fake/file.json', '/fake/file.yaml');
      const document = makeDocument(JSON_CONTENT, 'yaml');

      openTextDocumentStub = Sinon.stub(vscode.workspace, 'openTextDocument').resolves(document);

      await onRename(event);

      assert.strictEqual(openTextDocumentStub.callCount, 1);
      assert.strictEqual(applyEditStub.callCount, 1);
    });

    test('converts content when renaming .json to .yml', async () => {
      const event = createRenameEvent('/fake/file.json', '/fake/file.yml');
      const document = makeDocument(JSON_CONTENT, 'yaml');

      openTextDocumentStub = Sinon.stub(vscode.workspace, 'openTextDocument').resolves(document);

      await onRename(event);

      assert.strictEqual(openTextDocumentStub.callCount, 1);
      assert.strictEqual(applyEditStub.callCount, 1);
    });

    test('does not convert when old file is not .json', async () => {
      const event = createRenameEvent('/fake/file.txt', '/fake/file.yaml');
      const document = makeDocument('some text', 'yaml');

      openTextDocumentStub = Sinon.stub(vscode.workspace, 'openTextDocument').resolves(document);

      await onRename(event);

      assert.strictEqual(applyEditStub.callCount, 0);
    });

    test('does not convert when new file is not .yaml or .yml', async () => {
      const event = createRenameEvent('/fake/file.json', '/fake/file.txt');
      const document = makeDocument(JSON_CONTENT, 'plaintext');

      openTextDocumentStub = Sinon.stub(vscode.workspace, 'openTextDocument').resolves(document);

      await onRename(event);

      assert.strictEqual(applyEditStub.callCount, 0);
    });
  });

  suite('YAML to JSON conversion', () => {
    setup(() => {
      withConfig({ [ConfigId.ConvertOnRename]: true });
    });

    test('converts content when renaming .yaml to .json', async () => {
      const event = createRenameEvent('/fake/file.yaml', '/fake/file.json');
      const document = makeDocument(YAML_CONTENT, 'json');

      openTextDocumentStub = Sinon.stub(vscode.workspace, 'openTextDocument').resolves(document);

      await onRename(event);

      assert.strictEqual(openTextDocumentStub.callCount, 1);
      assert.strictEqual(applyEditStub.callCount, 1);
    });

    test('converts content when renaming .yml to .json', async () => {
      const event = createRenameEvent('/fake/file.yml', '/fake/file.json');
      const document = makeDocument(YAML_CONTENT, 'json');

      openTextDocumentStub = Sinon.stub(vscode.workspace, 'openTextDocument').resolves(document);

      await onRename(event);

      assert.strictEqual(openTextDocumentStub.callCount, 1);
      assert.strictEqual(applyEditStub.callCount, 1);
    });

    test('does not convert when old file is not .yaml or .yml', async () => {
      const event = createRenameEvent('/fake/file.txt', '/fake/file.json');
      const document = makeDocument('some text', 'json');

      openTextDocumentStub = Sinon.stub(vscode.workspace, 'openTextDocument').resolves(document);

      await onRename(event);

      assert.strictEqual(applyEditStub.callCount, 0);
    });

    test('does not convert when new file is not .json', async () => {
      const event = createRenameEvent('/fake/file.yaml', '/fake/file.txt');
      const document = makeDocument(YAML_CONTENT, 'plaintext');

      openTextDocumentStub = Sinon.stub(vscode.workspace, 'openTextDocument').resolves(document);

      await onRename(event);

      assert.strictEqual(applyEditStub.callCount, 0);
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

      openTextDocumentStub = Sinon.stub(vscode.workspace, 'openTextDocument');
      openTextDocumentStub
        .onFirstCall()
        .resolves(makeDocument(JSON_CONTENT, 'yaml'))
        .onSecondCall()
        .resolves(makeDocument(YAML_CONTENT, 'json'));

      await onRename(event);

      assert.strictEqual(openTextDocumentStub.callCount, 2);
      assert.strictEqual(applyEditStub.callCount, 2);
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

      openTextDocumentStub = Sinon.stub(vscode.workspace, 'openTextDocument');
      openTextDocumentStub
        .onFirstCall()
        .resolves(makeDocument(JSON_CONTENT, 'yaml'))
        .onSecondCall()
        .resolves(makeDocument('text', 'plaintext'))
        .onThirdCall()
        .resolves(makeDocument(YAML_CONTENT, 'json'));

      await onRename(event);

      // Should only process 2 files (json->yaml and yml->json)
      assert.strictEqual(openTextDocumentStub.callCount, 3);
      // But only 2 should have edits applied
      assert.strictEqual(applyEditStub.callCount, 2);
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

      openTextDocumentStub = Sinon.stub(vscode.workspace, 'openTextDocument').resolves(document);

      await onRename(event);

      // Should convert because languageId is 'yaml'
      assert.strictEqual(applyEditStub.callCount, 1);
    });

    test('handles different content based on languageId', async () => {
      const event = createRenameEvent('/fake/file.yaml', '/fake/file.json');
      // Document has YAML content but json language ID
      const document = makeDocument(YAML_CONTENT, 'json');

      openTextDocumentStub = Sinon.stub(vscode.workspace, 'openTextDocument').resolves(document);

      await onRename(event);

      // Should convert because languageId is 'json'
      assert.strictEqual(applyEditStub.callCount, 1);
    });
  });

  suite('error handling', () => {
    setup(() => {
      withConfig({ [ConfigId.ConvertOnRename]: true });
    });

    test('shows error message for invalid JSON content', async () => {
      const event = createRenameEvent('/fake/file.json', '/fake/file.yaml');
      const document = makeDocument('{ invalid json }', 'yaml');

      openTextDocumentStub = Sinon.stub(vscode.workspace, 'openTextDocument').resolves(document);

      await onRename(event);

      assert.strictEqual(showErrorMessageStub.callCount, 1);
      assert.strictEqual(applyEditStub.callCount, 0);
    });

    test('shows error message for invalid YAML content', async () => {
      const event = createRenameEvent('/fake/file.yaml', '/fake/file.json');
      const document = makeDocument('--- {unclosed', 'json');

      openTextDocumentStub = Sinon.stub(vscode.workspace, 'openTextDocument').resolves(document);

      await onRename(event);

      assert.strictEqual(showErrorMessageStub.callCount, 1);
      assert.strictEqual(applyEditStub.callCount, 0);
    });

    test('handles errors when opening document fails', async () => {
      const event = createRenameEvent('/fake/file.json', '/fake/file.yaml');

      openTextDocumentStub = Sinon.stub(vscode.workspace, 'openTextDocument').rejects(new Error('File not found'));

      await onRename(event);

      // Should not throw, but error handling depends on implementation
      assert.strictEqual(openTextDocumentStub.callCount, 1);
    });

    test('handles dirty documents by saving first', async () => {
      const event = createRenameEvent('/fake/file.json', '/fake/file.yaml');
      const saveStub = Sinon.stub().resolves();
      const document = {
        ...makeDocument(JSON_CONTENT, 'yaml'),
        isDirty: true,
        save: saveStub,
      } as unknown as vscode.TextDocument;

      openTextDocumentStub = Sinon.stub(vscode.workspace, 'openTextDocument').resolves(document);

      await onRename(event);

      assert.strictEqual(saveStub.callCount, 1);
      assert.strictEqual(applyEditStub.callCount, 1);
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

      await onRename(event);

      assert.strictEqual(openTextDocumentStub?.callCount || 0, 0);
    });

    test('handles paths with dots in directory names', async () => {
      const event = createRenameEvent('/some.dir/file.json', '/some.dir/file.yaml');
      const document = makeDocument(JSON_CONTENT, 'yaml');

      openTextDocumentStub = Sinon.stub(vscode.workspace, 'openTextDocument').resolves(document);

      await onRename(event);

      assert.strictEqual(applyEditStub.callCount, 1);
    });

    test('handles paths with multiple extensions', async () => {
      const event = createRenameEvent('/fake/file.test.json', '/fake/file.test.yaml');
      const document = makeDocument(JSON_CONTENT, 'yaml');

      openTextDocumentStub = Sinon.stub(vscode.workspace, 'openTextDocument').resolves(document);

      await onRename(event);

      assert.strictEqual(applyEditStub.callCount, 1);
    });
  });
});
