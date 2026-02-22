import * as assert from 'assert';
import * as Sinon from 'sinon';
import * as vscode from 'vscode';

import { onSave } from '../../onSave';
import { ConfigId, Configs } from '../../config';
import { WorkspaceConfigurationMock } from '../testUtil';

const YAML_CONTENT = 'name: foo\nvalue: 1\n';
const JSON_CONTENT = JSON.stringify({ name: 'foo', value: 1 }, null, 2);

function makeDocument(fsPath: string, text: string): vscode.TextDocument {
  return {
    uri: vscode.Uri.file(fsPath),
    getText: () => text,
  } as unknown as vscode.TextDocument;
}

type MockFs = {
  readFile: Sinon.SinonStub;
  writeFile: Sinon.SinonStub;
};

function makeMockFs(fileExists = false): MockFs {
  return {
    readFile: fileExists
      ? Sinon.stub().resolves(new Uint8Array())
      : Sinon.stub().rejects(vscode.FileSystemError.FileNotFound()),
    writeFile: Sinon.stub().resolves(),
  };
}

suite('onSave', () => {
  let showInformationMessageStub: Sinon.SinonStub;
  let showErrorMessageStub: Sinon.SinonStub;
  let configMock: WorkspaceConfigurationMock | undefined;
  let mockFs: MockFs;

  setup(() => {
    mockFs = makeMockFs();
    showInformationMessageStub = Sinon.stub(vscode.window, 'showInformationMessage');
    showErrorMessageStub = Sinon.stub(vscode.window, 'showErrorMessage');
  });

  teardown(() => {
    configMock?.restore();
    configMock = undefined;
    Sinon.restore();
  });

  function withConfig(config: Partial<Configs>) {
    configMock = new WorkspaceConfigurationMock(config);
  }

  test('does nothing when convertOnSave is not enabled', async () => {
    withConfig({ [ConfigId.ConvertOnSave]: false });
    await onSave(makeDocument('/fake/file.yaml', YAML_CONTENT), mockFs);
    assert.strictEqual(mockFs.writeFile.callCount, 0);
  });

  test('does nothing when convertOnSave is not set', async () => {
    withConfig({});
    await onSave(makeDocument('/fake/file.yaml', YAML_CONTENT), mockFs);
    assert.strictEqual(mockFs.writeFile.callCount, 0);
  });

  test('does nothing for non yaml/json files', async () => {
    withConfig({ [ConfigId.ConvertOnSave]: true });
    await onSave(makeDocument('/fake/file.ts', 'const x = 1;'), mockFs);
    assert.strictEqual(showErrorMessageStub.callCount, 0);
    assert.strictEqual(mockFs.writeFile.callCount, 0);
  });

  suite('yaml to json', () => {
    test('converts .yaml file content to JSON and writes counterpart', async () => {
      withConfig({ [ConfigId.ConvertOnSave]: true });

      await onSave(makeDocument('/fake/file.yaml', YAML_CONTENT), mockFs);

      assert.strictEqual(mockFs.writeFile.callCount, 1);
      const [writtenUri, writtenContent] = mockFs.writeFile.firstCall.args as [vscode.Uri, Uint8Array];
      assert.ok(writtenUri.fsPath.endsWith('.json'), 'written file should have .json extension');
      assert.deepStrictEqual(JSON.parse(Buffer.from(writtenContent).toString()), {
        name: 'foo',
        value: 1,
      });
    });

    test('converts .yml file and writes counterpart with .json extension', async () => {
      withConfig({ [ConfigId.ConvertOnSave]: true });

      await onSave(makeDocument('/fake/file.yml', YAML_CONTENT), mockFs);

      assert.strictEqual(mockFs.writeFile.callCount, 1);
      const [writtenUri] = mockFs.writeFile.firstCall.args as [vscode.Uri, Uint8Array];
      assert.ok(writtenUri.fsPath.endsWith('.json'), 'written file should have .json extension');
    });

    test('never deletes the original file', async () => {
      withConfig({ [ConfigId.ConvertOnSave]: true });

      await onSave(makeDocument('/fake/file.yaml', YAML_CONTENT), mockFs);

      // writeFile is called only for the new counterpart, never for the original path
      assert.strictEqual(mockFs.writeFile.callCount, 1);
      const [writtenUri] = mockFs.writeFile.firstCall.args as [vscode.Uri, Uint8Array];
      assert.ok(!writtenUri.fsPath.endsWith('.yaml'), 'original .yaml file should not be written/deleted');
    });
  });

  suite('json to yaml', () => {
    test('converts .json file content to YAML and writes counterpart', async () => {
      withConfig({ [ConfigId.ConvertOnSave]: true });

      await onSave(makeDocument('/fake/file.json', JSON_CONTENT), mockFs);

      assert.strictEqual(mockFs.writeFile.callCount, 1);
      const [writtenUri] = mockFs.writeFile.firstCall.args as [vscode.Uri, Uint8Array];
      assert.ok(writtenUri.fsPath.endsWith('.yaml'), 'written file should have .yaml extension');
    });

    test('never deletes the original file', async () => {
      withConfig({ [ConfigId.ConvertOnSave]: true });

      await onSave(makeDocument('/fake/file.json', JSON_CONTENT), mockFs);

      // writeFile is called only for the new counterpart, never for the original path
      assert.strictEqual(mockFs.writeFile.callCount, 1);
      const [writtenUri] = mockFs.writeFile.firstCall.args as [vscode.Uri, Uint8Array];
      assert.ok(!writtenUri.fsPath.endsWith('.json'), 'original .json file should not be written/deleted');
    });
  });

  suite('overwriteExistentFiles', () => {
    setup(() => {
      // counterpart file already exists
      mockFs = makeMockFs(true);
    });

    test('does not write when overwriteExistentFiles config is not set', async () => {
      withConfig({ [ConfigId.ConvertOnSave]: true });

      await onSave(makeDocument('/fake/file.yaml', YAML_CONTENT), mockFs);

      assert.strictEqual(mockFs.writeFile.callCount, 0);
    });

    test('overwrites without prompt when set to always', async () => {
      withConfig({
        [ConfigId.ConvertOnSave]: true,
        [ConfigId.OverwriteExistentFiles]: 'always',
      });

      await onSave(makeDocument('/fake/file.yaml', YAML_CONTENT), mockFs);

      assert.strictEqual(mockFs.writeFile.callCount, 1);
      assert.strictEqual(showInformationMessageStub.callCount, 0);
    });

    test('prompts and overwrites when set to ask and user confirms', async () => {
      withConfig({
        [ConfigId.ConvertOnSave]: true,
        [ConfigId.OverwriteExistentFiles]: 'ask',
      });
      showInformationMessageStub.resolves('Yes' as unknown);

      await onSave(makeDocument('/fake/file.yaml', YAML_CONTENT), mockFs);

      assert.strictEqual(showInformationMessageStub.callCount, 1);
      assert.strictEqual(mockFs.writeFile.callCount, 1);
    });

    test('prompts and skips when set to ask and user declines', async () => {
      withConfig({
        [ConfigId.ConvertOnSave]: true,
        [ConfigId.OverwriteExistentFiles]: 'ask',
      });
      showInformationMessageStub.resolves('No' as unknown);

      await onSave(makeDocument('/fake/file.yaml', YAML_CONTENT), mockFs);

      assert.strictEqual(showInformationMessageStub.callCount, 1);
      assert.strictEqual(mockFs.writeFile.callCount, 0);
    });
  });

  suite('custom fileExtensions config', () => {
    test('uses configured yaml extension when converting json to yaml', async () => {
      withConfig({
        [ConfigId.ConvertOnSave]: true,
        [ConfigId.FileExtensionsYaml]: '.yml',
      });

      await onSave(makeDocument('/fake/file.json', JSON_CONTENT), mockFs);

      assert.strictEqual(mockFs.writeFile.callCount, 1);
      const [writtenUri] = mockFs.writeFile.firstCall.args as [vscode.Uri, Uint8Array];
      assert.ok(writtenUri.fsPath.endsWith('.yml'), 'written file should use configured .yml extension');
    });

    test('uses configured json extension when converting yaml to json', async () => {
      withConfig({
        [ConfigId.ConvertOnSave]: true,
        [ConfigId.FileExtensionsJson]: '.json',
      });

      await onSave(makeDocument('/fake/file.yaml', YAML_CONTENT), mockFs);

      assert.strictEqual(mockFs.writeFile.callCount, 1);
      const [writtenUri] = mockFs.writeFile.firstCall.args as [vscode.Uri, Uint8Array];
      assert.ok(writtenUri.fsPath.endsWith('.json'), 'written file should use configured .json extension');
    });
  });

  suite('error handling', () => {
    test('shows error message on invalid YAML content', async () => {
      withConfig({ [ConfigId.ConvertOnSave]: true });

      await onSave(makeDocument('/fake/file.yaml', '--- {unclosed'), mockFs);

      assert.strictEqual(showErrorMessageStub.callCount, 1);
      assert.strictEqual(mockFs.writeFile.callCount, 0);
    });

    test('shows error message on invalid JSON content', async () => {
      withConfig({ [ConfigId.ConvertOnSave]: true });

      await onSave(makeDocument('/fake/file.json', '{ bad json }'), mockFs);

      assert.strictEqual(showErrorMessageStub.callCount, 1);
      assert.strictEqual(mockFs.writeFile.callCount, 0);
    });
  });
});
