import * as assert from 'assert';
import * as Sinon from 'sinon';
import * as vscode from 'vscode';

import { onRightClickAndConvertJsonFile, onRightClickAndConvertYamlFile } from '../../onRightClickAndConvertFile';
import { ConfigId, Configs } from '../../config';
import { WorkspaceConfigurationMock } from '../testUtil';

const YAML_CONTENT = 'name: foo\nvalue: 1\n';
const JSON_CONTENT = JSON.stringify({ name: 'foo', value: 1 }, null, 2);

type MockFs = {
  readFile: Sinon.SinonStub;
  writeFile: Sinon.SinonStub;
  delete: Sinon.SinonStub;
  stat: Sinon.SinonStub;
};

function makeMockFs(fileExists = false): MockFs {
  return {
    readFile: fileExists
      ? Sinon.stub().resolves(new Uint8Array())
      : Sinon.stub().rejects(vscode.FileSystemError.FileNotFound()),
    writeFile: Sinon.stub().resolves(),
    delete: Sinon.stub().resolves(),
    stat: Sinon.stub().resolves({ type: vscode.FileType.File }),
  };
}

suite('onRightClickAndConvertFile', () => {
  let showInformationMessageStub: Sinon.SinonStub;
  let showErrorMessageStub: Sinon.SinonStub;
  let configMock: WorkspaceConfigurationMock | undefined;
  let mockFs: MockFs;
  let originalFs: typeof vscode.workspace.fs;

  setup(() => {
    mockFs = makeMockFs();
    originalFs = vscode.workspace.fs;
    // Replace vscode.workspace.fs with our mock
    Object.defineProperty(vscode.workspace, 'fs', {
      value: mockFs,
      writable: true,
      configurable: true,
    });
    showInformationMessageStub = Sinon.stub(vscode.window, 'showInformationMessage');
    showErrorMessageStub = Sinon.stub(vscode.window, 'showErrorMessage');
  });

  teardown(() => {
    configMock?.restore();
    configMock = undefined;
    // Restore original fs
    Object.defineProperty(vscode.workspace, 'fs', {
      value: originalFs,
      writable: true,
      configurable: true,
    });
    Sinon.restore();
  });

  function withConfig(config: Partial<Configs>) {
    configMock = new WorkspaceConfigurationMock(config);
  }

  suite('onRightClickAndConvertJsonFile', () => {
    test('converts JSON file to YAML', async () => {
      withConfig({});
      const uri = vscode.Uri.file('/fake/file.json');

      mockFs.readFile = Sinon.stub().resolves(Buffer.from(JSON_CONTENT));

      await onRightClickAndConvertJsonFile(uri);

      assert.strictEqual(mockFs.writeFile.callCount, 1);
      const [writtenUri] = mockFs.writeFile.firstCall.args as [vscode.Uri, Uint8Array];
      assert.ok(writtenUri.fsPath.endsWith('.yaml'), 'written file should have .yaml extension');
    });

    test('uses active text editor when uri is not provided', async () => {
      withConfig({});
      const uri = vscode.Uri.file('/fake/active.json');
      const mockDocument = {
        uri: uri,
        getText: () => JSON_CONTENT,
      } as unknown as vscode.TextDocument;

      mockFs.readFile = Sinon.stub().resolves(Buffer.from(JSON_CONTENT));

      Sinon.stub(vscode.window, 'activeTextEditor').value({
        document: mockDocument,
      } as unknown as vscode.TextEditor);

      await onRightClickAndConvertJsonFile(undefined as unknown as vscode.Uri);

      assert.strictEqual(mockFs.writeFile.callCount, 1);
    });

    test('throws error when no active text editor and no uri', async () => {
      withConfig({});
      Sinon.stub(vscode.window, 'activeTextEditor').value(undefined);

      try {
        await onRightClickAndConvertJsonFile(undefined as unknown as vscode.Uri);
        assert.fail('should have thrown an error');
      } catch (error) {
        assert.ok(error instanceof Error);
        assert.strictEqual((error as Error).message, 'Failed to get active text editor');
      }
    });

    test('keeps original file when keepOriginalFiles is always', async () => {
      withConfig({ [ConfigId.KeepOriginalFiles]: 'always' });
      const uri = vscode.Uri.file('/fake/file.json');

      mockFs.readFile = Sinon.stub().resolves(Buffer.from(JSON_CONTENT));

      await onRightClickAndConvertJsonFile(uri);

      assert.strictEqual(mockFs.delete.callCount, 0);
      assert.strictEqual(mockFs.writeFile.callCount, 1);
    });

    test('deletes original file when keepOriginalFiles is not set', async () => {
      withConfig({});
      const uri = vscode.Uri.file('/fake/file.json');

      mockFs.readFile = Sinon.stub().resolves(Buffer.from(JSON_CONTENT));

      await onRightClickAndConvertJsonFile(uri);

      assert.strictEqual(mockFs.delete.callCount, 1);
      assert.strictEqual(mockFs.writeFile.callCount, 1);
    });

    test('prompts user when keepOriginalFiles is ask and user chooses to keep', async () => {
      withConfig({ [ConfigId.KeepOriginalFiles]: 'ask' });
      showInformationMessageStub.resolves('Keep' as unknown);
      const uri = vscode.Uri.file('/fake/file.json');

      mockFs.readFile = Sinon.stub().resolves(Buffer.from(JSON_CONTENT));

      await onRightClickAndConvertJsonFile(uri);

      assert.strictEqual(showInformationMessageStub.callCount, 1);
      assert.strictEqual(mockFs.delete.callCount, 0);
      assert.strictEqual(mockFs.writeFile.callCount, 1);
    });

    test('prompts user when keepOriginalFiles is ask and user chooses not to keep', async () => {
      withConfig({ [ConfigId.KeepOriginalFiles]: 'ask' });
      showInformationMessageStub.resolves('Do not keep' as unknown);
      const uri = vscode.Uri.file('/fake/file.json');

      mockFs.readFile = Sinon.stub().resolves(Buffer.from(JSON_CONTENT));

      await onRightClickAndConvertJsonFile(uri);

      assert.strictEqual(showInformationMessageStub.callCount, 1);
      assert.strictEqual(mockFs.delete.callCount, 1);
      assert.strictEqual(mockFs.writeFile.callCount, 1);
    });
  });

  suite('onRightClickAndConvertYamlFile', () => {
    test('converts YAML file to JSON', async () => {
      withConfig({});
      const uri = vscode.Uri.file('/fake/file.yaml');

      mockFs.readFile = Sinon.stub().resolves(Buffer.from(YAML_CONTENT));

      await onRightClickAndConvertYamlFile(uri);

      assert.strictEqual(mockFs.writeFile.callCount, 1);
      const [writtenUri, writtenContent] = mockFs.writeFile.firstCall.args as [vscode.Uri, Uint8Array];
      assert.ok(writtenUri.fsPath.endsWith('.json'), 'written file should have .json extension');
      assert.deepStrictEqual(JSON.parse(Buffer.from(writtenContent).toString()), {
        name: 'foo',
        value: 1,
      });
    });

    test('converts .yml file to JSON', async () => {
      withConfig({});
      const uri = vscode.Uri.file('/fake/file.yml');

      mockFs.readFile = Sinon.stub().resolves(Buffer.from(YAML_CONTENT));

      await onRightClickAndConvertYamlFile(uri);

      assert.strictEqual(mockFs.writeFile.callCount, 1);
      const [writtenUri] = mockFs.writeFile.firstCall.args as [vscode.Uri, Uint8Array];
      assert.ok(writtenUri.fsPath.endsWith('.json'), 'written file should have .json extension');
    });

    test('uses active text editor when uri is not provided', async () => {
      withConfig({});
      const uri = vscode.Uri.file('/fake/active.yaml');
      const mockDocument = {
        uri: uri,
        getText: () => YAML_CONTENT,
      } as unknown as vscode.TextDocument;

      mockFs.readFile = Sinon.stub().resolves(Buffer.from(YAML_CONTENT));

      Sinon.stub(vscode.window, 'activeTextEditor').value({
        document: mockDocument,
      } as unknown as vscode.TextEditor);

      await onRightClickAndConvertYamlFile(undefined as unknown as vscode.Uri);

      assert.strictEqual(mockFs.writeFile.callCount, 1);
    });

    test('throws error when no active text editor and no uri', async () => {
      withConfig({});
      Sinon.stub(vscode.window, 'activeTextEditor').value(undefined);

      try {
        await onRightClickAndConvertYamlFile(undefined as unknown as vscode.Uri);
        assert.fail('should have thrown an error');
      } catch (error) {
        assert.ok(error instanceof Error);
        assert.strictEqual((error as Error).message, 'Failed to get active text editor');
      }
    });
  });

  suite('overwriteExistentFiles', () => {
    setup(() => {
      mockFs = makeMockFs(true);
      Object.defineProperty(vscode.workspace, 'fs', {
        value: mockFs,
        writable: true,
        configurable: true,
      });
    });

    test('does not write when overwriteExistentFiles is not set', async () => {
      withConfig({});
      const uri = vscode.Uri.file('/fake/file.json');

      mockFs.readFile = Sinon.stub().resolves(Buffer.from(JSON_CONTENT));

      await onRightClickAndConvertJsonFile(uri);

      assert.strictEqual(mockFs.writeFile.callCount, 0);
      assert.strictEqual(showInformationMessageStub.callCount, 1);
    });

    test('overwrites without prompt when set to always', async () => {
      withConfig({ [ConfigId.OverwriteExistentFiles]: 'always' });
      const uri = vscode.Uri.file('/fake/file.json');

      mockFs.readFile = Sinon.stub().resolves(Buffer.from(JSON_CONTENT));

      await onRightClickAndConvertJsonFile(uri);

      assert.strictEqual(mockFs.writeFile.callCount, 1);
      assert.strictEqual(showInformationMessageStub.callCount, 0);
    });

    test('prompts and overwrites when set to ask and user confirms', async () => {
      withConfig({ [ConfigId.OverwriteExistentFiles]: 'ask' });
      showInformationMessageStub.resolves('Yes' as unknown);
      const uri = vscode.Uri.file('/fake/file.json');

      mockFs.readFile = Sinon.stub().resolves(Buffer.from(JSON_CONTENT));

      await onRightClickAndConvertJsonFile(uri);

      assert.strictEqual(showInformationMessageStub.callCount, 1);
      assert.strictEqual(mockFs.writeFile.callCount, 1);
    });

    test('prompts and skips when set to ask and user declines', async () => {
      withConfig({ [ConfigId.OverwriteExistentFiles]: 'ask' });
      showInformationMessageStub.resolves('No' as unknown);
      const uri = vscode.Uri.file('/fake/file.json');

      mockFs.readFile = Sinon.stub().resolves(Buffer.from(JSON_CONTENT));

      await onRightClickAndConvertJsonFile(uri);

      assert.strictEqual(showInformationMessageStub.callCount, 1);
      assert.strictEqual(mockFs.writeFile.callCount, 0);
    });
  });

  suite('reverter tooltip', () => {
    test('shows reverter tooltip after conversion', async () => {
      withConfig({});
      const uri = vscode.Uri.file('/fake/file.json');

      mockFs.readFile = Sinon.stub().resolves(Buffer.from(JSON_CONTENT));

      await onRightClickAndConvertJsonFile(uri);

      assert.strictEqual(showInformationMessageStub.callCount, 1);
      assert.ok(showInformationMessageStub.firstCall.args[0].includes('Revert'), 'should show revert message');
    });

    test('does not show reverter tooltip when keepOriginalFiles is true', async () => {
      withConfig({ [ConfigId.KeepOriginalFiles]: 'always' });
      const uri = vscode.Uri.file('/fake/file.json');

      mockFs.readFile = Sinon.stub().resolves(Buffer.from(JSON_CONTENT));

      await onRightClickAndConvertJsonFile(uri);

      // Should not show revert tooltip when keeping originals
      assert.strictEqual(showInformationMessageStub.callCount, 1, 'should only show the keep files prompt');
    });
  });

  suite('error handling', () => {
    test('shows error message on invalid JSON content', async () => {
      withConfig({});
      const uri = vscode.Uri.file('/fake/file.json');

      mockFs.readFile = Sinon.stub().resolves(Buffer.from('{ bad json }'));

      await onRightClickAndConvertJsonFile(uri);

      assert.strictEqual(showErrorMessageStub.callCount, 1);
      assert.strictEqual(mockFs.writeFile.callCount, 0);
    });

    test('shows error message on invalid YAML content', async () => {
      withConfig({});
      const uri = vscode.Uri.file('/fake/file.yaml');

      mockFs.readFile = Sinon.stub().resolves(Buffer.from('--- {unclosed'));

      await onRightClickAndConvertYamlFile(uri);

      assert.strictEqual(showErrorMessageStub.callCount, 1);
      assert.strictEqual(mockFs.writeFile.callCount, 0);
    });
  });

  suite('custom fileExtensions config', () => {
    test('uses configured yaml extension when converting json to yaml', async () => {
      withConfig({ [ConfigId.FileExtensionsYaml]: '.yml' });
      const uri = vscode.Uri.file('/fake/file.json');

      mockFs.readFile = Sinon.stub().resolves(Buffer.from(JSON_CONTENT));

      await onRightClickAndConvertJsonFile(uri);

      assert.strictEqual(mockFs.writeFile.callCount, 1);
      const [writtenUri] = mockFs.writeFile.firstCall.args as [vscode.Uri, Uint8Array];
      assert.ok(writtenUri.fsPath.endsWith('.yml'), 'written file should use configured .yml extension');
    });

    test('uses configured json extension when converting yaml to json', async () => {
      withConfig({ [ConfigId.FileExtensionsJson]: '.json' });
      const uri = vscode.Uri.file('/fake/file.yaml');

      mockFs.readFile = Sinon.stub().resolves(Buffer.from(YAML_CONTENT));

      await onRightClickAndConvertYamlFile(uri);

      assert.strictEqual(mockFs.writeFile.callCount, 1);
      const [writtenUri] = mockFs.writeFile.firstCall.args as [vscode.Uri, Uint8Array];
      assert.ok(writtenUri.fsPath.endsWith('.json'), 'written file should use configured .json extension');
    });
  });
});
