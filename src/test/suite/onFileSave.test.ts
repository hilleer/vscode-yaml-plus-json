import * as assert from 'assert';
import * as Sinon from 'sinon';
import { Uri } from 'vscode';

import { onFileSave } from '../../onFileSave';
import { ConfigId, Configs } from '../../config';
import { WorkspaceConfigurationMock, createMockVscode, MockFs, createMockFs, createMockDocument } from '../testUtil';
import { contextProvider } from '../../contextProvider';

const YAML_CONTENT = 'name: foo\nvalue: 1\n';
const JSON_CONTENT = JSON.stringify({ name: 'foo', value: 1 }, null, 2);

suite('onFileSave', () => {
  let showInformationMessageStub: Sinon.SinonStub;
  let showErrorMessageStub: Sinon.SinonStub;
  let configMock: WorkspaceConfigurationMock | undefined;
  let mockFs: MockFs;

  setup(() => {
    mockFs = createMockFs();

    showInformationMessageStub = Sinon.stub();
    showErrorMessageStub = Sinon.stub();

    contextProvider.setVscode(
      createMockVscode({
        fs: mockFs,
        window: {
          showInformationMessage: showInformationMessageStub,
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

  test('does nothing when convertOnSave is not enabled', async () => {
    withConfig({ [ConfigId.ConvertOnSave]: false });
    await onFileSave(createMockDocument({ fsPath: '/fake/file.yaml', text: YAML_CONTENT }));
    assert.strictEqual(mockFs.writeFile.callCount, 0);
  });

  test('does nothing when convertOnSave is not set', async () => {
    withConfig({});
    await onFileSave(createMockDocument({ fsPath: '/fake/file.yaml', text: YAML_CONTENT }));
    assert.strictEqual(mockFs.writeFile.callCount, 0);
  });

  test('does nothing for non yaml/json files', async () => {
    withConfig({ [ConfigId.ConvertOnSave]: true });
    await onFileSave(createMockDocument({ fsPath: '/fake/file.ts', text: 'const x = 1;' }));
    assert.strictEqual(showErrorMessageStub.callCount, 0);
    assert.strictEqual(mockFs.writeFile.callCount, 0);
  });

  suite('yaml to json', () => {
    test('converts .yaml file content to JSON and writes counterpart', async () => {
      withConfig({ [ConfigId.ConvertOnSave]: true });

      await onFileSave(createMockDocument({ fsPath: '/fake/file.yaml', text: YAML_CONTENT }));

      assert.strictEqual(mockFs.writeFile.callCount, 1);
      const [writtenUri, writtenContent] = mockFs.writeFile.firstCall.args as [Uri, Uint8Array];
      assert.ok(writtenUri.fsPath.endsWith('.json'), 'written file should have .json extension');
      assert.deepStrictEqual(JSON.parse(Buffer.from(writtenContent).toString()), {
        name: 'foo',
        value: 1,
      });
    });

    test('converts .yml file and writes counterpart with .json extension', async () => {
      withConfig({ [ConfigId.ConvertOnSave]: true });

      await onFileSave(createMockDocument({ fsPath: '/fake/file.yml', text: YAML_CONTENT }));

      assert.strictEqual(mockFs.writeFile.callCount, 1);
      const [writtenUri] = mockFs.writeFile.firstCall.args as [Uri, Uint8Array];
      assert.ok(writtenUri.fsPath.endsWith('.json'), 'written file should have .json extension');
    });

    test('never deletes the original file', async () => {
      withConfig({ [ConfigId.ConvertOnSave]: true });

      await onFileSave(createMockDocument({ fsPath: '/fake/file.yaml', text: YAML_CONTENT }));

      assert.strictEqual(mockFs.writeFile.callCount, 1);
      const [writtenUri] = mockFs.writeFile.firstCall.args as [Uri, Uint8Array];
      assert.ok(!writtenUri.fsPath.endsWith('.yaml'), 'original .yaml file should not be written/deleted');
    });
  });

  suite('json to yaml', () => {
    test('converts JSON file content to YAML and writes counterpart', async () => {
      withConfig({ [ConfigId.ConvertOnSave]: true });

      await onFileSave(createMockDocument({ fsPath: '/fake/file.json', text: JSON_CONTENT }));

      assert.strictEqual(mockFs.writeFile.callCount, 1);
      const [writtenUri] = mockFs.writeFile.firstCall.args as [Uri, Uint8Array];
      assert.ok(writtenUri.fsPath.endsWith('.yaml'), 'written file should have .yaml extension');
    });

    test('never deletes the original file', async () => {
      withConfig({ [ConfigId.ConvertOnSave]: true });

      await onFileSave(createMockDocument({ fsPath: '/fake/file.json', text: JSON_CONTENT }));

      assert.strictEqual(mockFs.writeFile.callCount, 1);
      const [writtenUri] = mockFs.writeFile.firstCall.args as [Uri, Uint8Array];
      assert.ok(!writtenUri.fsPath.endsWith('.json'), 'original .json file should not be written/deleted');
    });
  });

  suite('overwriteExistentFiles', () => {
    setup(() => {
      mockFs.readFile.resolves(Buffer.from('existing content'));
    });

    test('does not write when overwriteExistentFiles config is not set', async () => {
      withConfig({ [ConfigId.ConvertOnSave]: true });

      await onFileSave(createMockDocument({ fsPath: '/fake/file.yaml', text: YAML_CONTENT }));

      assert.strictEqual(mockFs.writeFile.callCount, 0);
    });

    test('overwrites without prompt when set to always', async () => {
      withConfig({
        [ConfigId.ConvertOnSave]: true,
        [ConfigId.OverwriteExistentFiles]: 'always',
      });

      await onFileSave(createMockDocument({ fsPath: '/fake/file.yaml', text: YAML_CONTENT }));

      assert.strictEqual(mockFs.writeFile.callCount, 1);
      assert.strictEqual(showInformationMessageStub.callCount, 0);
    });

    test('prompts and overwrites when set to ask and user confirms', async () => {
      withConfig({
        [ConfigId.ConvertOnSave]: true,
        [ConfigId.OverwriteExistentFiles]: 'ask',
      });
      showInformationMessageStub.resolves('Yes' as unknown);

      await onFileSave(createMockDocument({ fsPath: '/fake/file.yaml', text: YAML_CONTENT }));

      assert.strictEqual(showInformationMessageStub.callCount, 1);
      assert.strictEqual(mockFs.writeFile.callCount, 1);
    });

    test('prompts and skips when set to ask and user declines', async () => {
      withConfig({
        [ConfigId.ConvertOnSave]: true,
        [ConfigId.OverwriteExistentFiles]: 'ask',
      });
      showInformationMessageStub.resolves('No' as unknown);

      await onFileSave(createMockDocument({ fsPath: '/fake/file.yaml', text: YAML_CONTENT }));

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

      await onFileSave(createMockDocument({ fsPath: '/fake/file.json', text: JSON_CONTENT }));

      assert.strictEqual(mockFs.writeFile.callCount, 1);
      const [writtenUri] = mockFs.writeFile.firstCall.args as [Uri, Uint8Array];
      assert.ok(writtenUri.fsPath.endsWith('.yml'), 'written file should use configured .yml extension');
    });

    test('uses configured json extension when converting yaml to json', async () => {
      withConfig({
        [ConfigId.ConvertOnSave]: true,
        [ConfigId.FileExtensionsJson]: '.json',
      });

      await onFileSave(createMockDocument({ fsPath: '/fake/file.yaml', text: YAML_CONTENT }));

      assert.strictEqual(mockFs.writeFile.callCount, 1);
      const [writtenUri] = mockFs.writeFile.firstCall.args as [Uri, Uint8Array];
      assert.ok(writtenUri.fsPath.endsWith('.json'), 'written file should use configured .json extension');
    });
  });

  suite('error handling', () => {
    test('shows error message on invalid YAML content', async () => {
      withConfig({ [ConfigId.ConvertOnSave]: true });

      await onFileSave(createMockDocument({ fsPath: '/fake/file.yaml', text: '--- {unclosed' }));

      assert.strictEqual(showErrorMessageStub.callCount, 1);
      assert.strictEqual(mockFs.writeFile.callCount, 0);
    });

    test('shows error message on invalid JSON content', async () => {
      withConfig({ [ConfigId.ConvertOnSave]: true });

      await onFileSave(createMockDocument({ fsPath: '/fake/file.json', text: '{ bad json }' }));

      assert.strictEqual(showErrorMessageStub.callCount, 1);
      assert.strictEqual(mockFs.writeFile.callCount, 0);
    });
  });
});
