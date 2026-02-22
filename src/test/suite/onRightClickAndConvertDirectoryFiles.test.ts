import * as assert from 'assert';
import * as Sinon from 'sinon';
import * as vscode from 'vscode';

import {
  onRightClickAndConvertJsonFilesToYaml,
  onRightClickConvertYamlFilesToJson,
} from '../../onRightClickAndConvertDirectoryFiles';
import { ConfigId, Configs } from '../../config';
import { WorkspaceConfigurationMock } from '../testUtil';

const YAML_CONTENT = 'name: foo\nvalue: 1\n';
const JSON_CONTENT = JSON.stringify({ name: 'foo', value: 1 }, null, 2);

type MockFs = {
  readFile: Sinon.SinonStub;
  writeFile: Sinon.SinonStub;
  delete: Sinon.SinonStub;
  stat: Sinon.SinonStub;
  readDirectory: Sinon.SinonStub;
};

function makeMockFs(): MockFs {
  return {
    readFile: Sinon.stub().rejects(vscode.FileSystemError.FileNotFound()),
    writeFile: Sinon.stub().resolves(),
    delete: Sinon.stub().resolves(),
    stat: Sinon.stub().resolves({ type: vscode.FileType.Directory }),
    readDirectory: Sinon.stub().resolves([]),
  };
}

suite('onRightClickAndConvertDirectoryFiles', () => {
  let showInformationMessageStub: Sinon.SinonStub;
  let showErrorMessageStub: Sinon.SinonStub;
  let configMock: WorkspaceConfigurationMock | undefined;
  let mockFs: MockFs;
  let originalFs: typeof vscode.workspace.fs;

  setup(() => {
    mockFs = makeMockFs();
    originalFs = vscode.workspace.fs;
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

  suite('onRightClickAndConvertJsonFilesToYaml', () => {
    test('shows message when no JSON files found in directory', async () => {
      withConfig({});
      const uri = vscode.Uri.file('/fake/dir');

      mockFs.readDirectory = Sinon.stub().resolves([
        ['file.txt', vscode.FileType.File],
        ['subdir', vscode.FileType.Directory],
      ]);

      await onRightClickAndConvertJsonFilesToYaml(uri);

      assert.strictEqual(showInformationMessageStub.callCount, 1);
      assert.ok(
        showInformationMessageStub.firstCall.args[0].includes('Did not find any json files'),
        'should show no json files message',
      );
    });

    test('converts single JSON file to YAML', async () => {
      withConfig({});
      const uri = vscode.Uri.file('/fake/dir');

      mockFs.readDirectory = Sinon.stub().resolves([['file.json', vscode.FileType.File]]);
      mockFs.readFile = Sinon.stub().resolves(Buffer.from(JSON_CONTENT));

      await onRightClickAndConvertJsonFilesToYaml(uri);

      assert.strictEqual(mockFs.writeFile.callCount, 1);
      const [writtenUri] = mockFs.writeFile.firstCall.args as [vscode.Uri, Uint8Array];
      assert.ok(writtenUri.fsPath.endsWith('.yaml'), 'written file should have .yaml extension');
    });

    test('converts multiple JSON files to YAML', async () => {
      withConfig({});
      const uri = vscode.Uri.file('/fake/dir');

      mockFs.readDirectory = Sinon.stub().resolves([
        ['file1.json', vscode.FileType.File],
        ['file2.json', vscode.FileType.File],
        ['config.json', vscode.FileType.File],
      ]);
      mockFs.readFile = Sinon.stub().resolves(Buffer.from(JSON_CONTENT));

      await onRightClickAndConvertJsonFilesToYaml(uri);

      assert.strictEqual(mockFs.writeFile.callCount, 3);
    });

    test('ignores non-JSON files in directory', async () => {
      withConfig({});
      const uri = vscode.Uri.file('/fake/dir');

      mockFs.readDirectory = Sinon.stub().resolves([
        ['file1.json', vscode.FileType.File],
        ['readme.md', vscode.FileType.File],
        ['file.yaml', vscode.FileType.File],
        ['script.ts', vscode.FileType.File],
      ]);
      mockFs.readFile = Sinon.stub().resolves(Buffer.from(JSON_CONTENT));

      await onRightClickAndConvertJsonFilesToYaml(uri);

      assert.strictEqual(mockFs.writeFile.callCount, 1);
    });

    test('ignores subdirectories', async () => {
      withConfig({});
      const uri = vscode.Uri.file('/fake/dir');

      mockFs.readDirectory = Sinon.stub().resolves([
        ['file.json', vscode.FileType.File],
        ['subdir', vscode.FileType.Directory],
        ['nested', vscode.FileType.Directory],
      ]);
      mockFs.readFile = Sinon.stub().resolves(Buffer.from(JSON_CONTENT));

      await onRightClickAndConvertJsonFilesToYaml(uri);

      assert.strictEqual(mockFs.writeFile.callCount, 1);
    });

    test('shows error when uri scheme is not file', async () => {
      withConfig({});
      const uri = vscode.Uri.parse('http://example.com/dir');

      await onRightClickAndConvertJsonFilesToYaml(uri);

      assert.strictEqual(showErrorMessageStub.callCount, 1);
      assert.ok(
        showErrorMessageStub.firstCall.args[0].includes('Unexpected file scheme'),
        'should show unexpected scheme error',
      );
    });

    test('shows message when selection is not a directory', async () => {
      withConfig({});
      const uri = vscode.Uri.file('/fake/file.json');

      mockFs.stat = Sinon.stub().resolves({ type: vscode.FileType.File });

      await onRightClickAndConvertJsonFilesToYaml(uri);

      assert.strictEqual(showInformationMessageStub.callCount, 1);
      assert.ok(
        showInformationMessageStub.firstCall.args[0].includes('not recognised as a directory'),
        'should show not a directory message',
      );
    });

    test('handles errors during file conversion gracefully', async () => {
      withConfig({});
      const uri = vscode.Uri.file('/fake/dir');

      mockFs.readDirectory = Sinon.stub().resolves([['file.json', vscode.FileType.File]]);
      mockFs.readFile = Sinon.stub().resolves(Buffer.from('{ invalid json }'));

      await onRightClickAndConvertJsonFilesToYaml(uri);

      // Should show error but not throw
      assert.strictEqual(showErrorMessageStub.callCount, 1);
    });
  });

  suite('onRightClickConvertYamlFilesToJson', () => {
    test('shows message when no YAML files found in directory', async () => {
      withConfig({});
      const uri = vscode.Uri.file('/fake/dir');

      mockFs.readDirectory = Sinon.stub().resolves([
        ['file.txt', vscode.FileType.File],
        ['file.json', vscode.FileType.File],
      ]);

      await onRightClickConvertYamlFilesToJson(uri);

      assert.strictEqual(showInformationMessageStub.callCount, 1);
      assert.ok(
        showInformationMessageStub.firstCall.args[0].includes('Did not find any yaml files'),
        'should show no yaml files message',
      );
    });

    test('converts single .yaml file to JSON', async () => {
      withConfig({});
      const uri = vscode.Uri.file('/fake/dir');

      mockFs.readDirectory = Sinon.stub().resolves([['file.yaml', vscode.FileType.File]]);
      mockFs.readFile = Sinon.stub().resolves(Buffer.from(YAML_CONTENT));

      await onRightClickConvertYamlFilesToJson(uri);

      assert.strictEqual(mockFs.writeFile.callCount, 1);
      const [writtenUri] = mockFs.writeFile.firstCall.args as [vscode.Uri, Uint8Array];
      assert.ok(writtenUri.fsPath.endsWith('.json'), 'written file should have .json extension');
    });

    test('converts single .yml file to JSON', async () => {
      withConfig({});
      const uri = vscode.Uri.file('/fake/dir');

      mockFs.readDirectory = Sinon.stub().resolves([['file.yml', vscode.FileType.File]]);
      mockFs.readFile = Sinon.stub().resolves(Buffer.from(YAML_CONTENT));

      await onRightClickConvertYamlFilesToJson(uri);

      assert.strictEqual(mockFs.writeFile.callCount, 1);
      const [writtenUri] = mockFs.writeFile.firstCall.args as [vscode.Uri, Uint8Array];
      assert.ok(writtenUri.fsPath.endsWith('.json'), 'written file should have .json extension');
    });

    test('converts both .yaml and .yml files to JSON', async () => {
      withConfig({});
      const uri = vscode.Uri.file('/fake/dir');

      mockFs.readDirectory = Sinon.stub().resolves([
        ['file1.yaml', vscode.FileType.File],
        ['file2.yml', vscode.FileType.File],
        ['config.yaml', vscode.FileType.File],
      ]);
      mockFs.readFile = Sinon.stub().resolves(Buffer.from(YAML_CONTENT));

      await onRightClickConvertYamlFilesToJson(uri);

      assert.strictEqual(mockFs.writeFile.callCount, 3);
    });

    test('ignores non-YAML files in directory', async () => {
      withConfig({});
      const uri = vscode.Uri.file('/fake/dir');

      mockFs.readDirectory = Sinon.stub().resolves([
        ['file1.yaml', vscode.FileType.File],
        ['readme.md', vscode.FileType.File],
        ['file.json', vscode.FileType.File],
        ['script.ts', vscode.FileType.File],
      ]);
      mockFs.readFile = Sinon.stub().resolves(Buffer.from(YAML_CONTENT));

      await onRightClickConvertYamlFilesToJson(uri);

      assert.strictEqual(mockFs.writeFile.callCount, 1);
    });

    test('shows error when uri scheme is not file', async () => {
      withConfig({});
      const uri = vscode.Uri.parse('http://example.com/dir');

      await onRightClickConvertYamlFilesToJson(uri);

      assert.strictEqual(showErrorMessageStub.callCount, 1);
      assert.ok(
        showErrorMessageStub.firstCall.args[0].includes('Unexpected file scheme'),
        'should show unexpected scheme error',
      );
    });

    test('shows message when selection is not a directory', async () => {
      withConfig({});
      const uri = vscode.Uri.file('/fake/file.yaml');

      mockFs.stat = Sinon.stub().resolves({ type: vscode.FileType.File });

      await onRightClickConvertYamlFilesToJson(uri);

      assert.strictEqual(showInformationMessageStub.callCount, 1);
      assert.ok(
        showInformationMessageStub.firstCall.args[0].includes('not recognised as a directory'),
        'should show not a directory message',
      );
    });

    test('handles errors during file conversion gracefully', async () => {
      withConfig({});
      const uri = vscode.Uri.file('/fake/dir');

      mockFs.readDirectory = Sinon.stub().resolves([['file.yaml', vscode.FileType.File]]);
      mockFs.readFile = Sinon.stub().resolves(Buffer.from('--- {unclosed'));

      await onRightClickConvertYamlFilesToJson(uri);

      // Should show error but not throw
      assert.strictEqual(showErrorMessageStub.callCount, 1);
    });
  });

  suite('keepOriginalFiles config', () => {
    test('keeps original JSON files when keepOriginalFiles is always', async () => {
      withConfig({ [ConfigId.KeepOriginalFiles]: 'always' });
      const uri = vscode.Uri.file('/fake/dir');

      mockFs.readDirectory = Sinon.stub().resolves([['file.json', vscode.FileType.File]]);
      mockFs.readFile = Sinon.stub().resolves(Buffer.from(JSON_CONTENT));

      await onRightClickAndConvertJsonFilesToYaml(uri);

      assert.strictEqual(mockFs.delete.callCount, 0);
      assert.strictEqual(mockFs.writeFile.callCount, 1);
    });

    test('deletes original JSON files when keepOriginalFiles is not set', async () => {
      withConfig({});
      const uri = vscode.Uri.file('/fake/dir');

      mockFs.readDirectory = Sinon.stub().resolves([['file.json', vscode.FileType.File]]);
      mockFs.readFile = Sinon.stub().resolves(Buffer.from(JSON_CONTENT));

      await onRightClickAndConvertJsonFilesToYaml(uri);

      assert.strictEqual(mockFs.delete.callCount, 1);
      assert.strictEqual(mockFs.writeFile.callCount, 1);
    });

    test('keeps original YAML files when keepOriginalFiles is always', async () => {
      withConfig({ [ConfigId.KeepOriginalFiles]: 'always' });
      const uri = vscode.Uri.file('/fake/dir');

      mockFs.readDirectory = Sinon.stub().resolves([['file.yaml', vscode.FileType.File]]);
      mockFs.readFile = Sinon.stub().resolves(Buffer.from(YAML_CONTENT));

      await onRightClickConvertYamlFilesToJson(uri);

      assert.strictEqual(mockFs.delete.callCount, 0);
      assert.strictEqual(mockFs.writeFile.callCount, 1);
    });
  });

  suite('reverter tooltip', () => {
    test('shows reverter tooltip for single file conversion', async () => {
      withConfig({});
      const uri = vscode.Uri.file('/fake/dir');

      mockFs.readDirectory = Sinon.stub().resolves([['file.json', vscode.FileType.File]]);
      mockFs.readFile = Sinon.stub().resolves(Buffer.from(JSON_CONTENT));

      await onRightClickAndConvertJsonFilesToYaml(uri);

      assert.strictEqual(showInformationMessageStub.callCount, 1);
      assert.ok(showInformationMessageStub.firstCall.args[0].includes('Revert'), 'should show revert message');
    });

    test('shows reverter tooltip for multiple files conversion', async () => {
      withConfig({});
      const uri = vscode.Uri.file('/fake/dir');

      mockFs.readDirectory = Sinon.stub().resolves([
        ['file1.json', vscode.FileType.File],
        ['file2.json', vscode.FileType.File],
      ]);
      mockFs.readFile = Sinon.stub().resolves(Buffer.from(JSON_CONTENT));

      await onRightClickAndConvertJsonFilesToYaml(uri);

      assert.strictEqual(showInformationMessageStub.callCount, 1);
      assert.ok(showInformationMessageStub.firstCall.args[0].includes('Revert'), 'should show revert message');
      assert.ok(showInformationMessageStub.firstCall.args[0].includes('2'), 'should mention number of files');
    });
  });
});
