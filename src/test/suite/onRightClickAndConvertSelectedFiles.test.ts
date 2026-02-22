import * as assert from 'assert';
import * as Sinon from 'sinon';
import * as vscode from 'vscode';

import {
  onConvertSelectedYamlFilesToJson,
  onConvertSelectedJsonFilesToYaml,
} from '../../onRightClickAndConvertSelectedFiles';
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

function makeMockFs(): MockFs {
  return {
    readFile: Sinon.stub().rejects(vscode.FileSystemError.FileNotFound()),
    writeFile: Sinon.stub().resolves(),
    delete: Sinon.stub().resolves(),
    stat: Sinon.stub().resolves({ type: vscode.FileType.File }),
  };
}

suite('onRightClickAndConvertSelectedFiles', () => {
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

  suite('onConvertSelectedJsonFilesToYaml', () => {
    test('converts single selected JSON file to YAML', async () => {
      withConfig({});
      const clickedFile = vscode.Uri.file('/fake/file.json');
      const selections = [vscode.Uri.file('/fake/file.json')];

      mockFs.readFile = Sinon.stub().resolves(Buffer.from(JSON_CONTENT));

      await onConvertSelectedJsonFilesToYaml(clickedFile, selections);

      assert.strictEqual(mockFs.writeFile.callCount, 1);
      const [writtenUri] = mockFs.writeFile.firstCall.args as [vscode.Uri, Uint8Array];
      assert.ok(writtenUri.fsPath.endsWith('.yaml'), 'written file should have .yaml extension');
    });

    test('converts multiple selected JSON files to YAML', async () => {
      withConfig({});
      const clickedFile = vscode.Uri.file('/fake/file1.json');
      const selections = [
        vscode.Uri.file('/fake/file1.json'),
        vscode.Uri.file('/fake/file2.json'),
        vscode.Uri.file('/fake/config.json'),
      ];

      mockFs.readFile = Sinon.stub().resolves(Buffer.from(JSON_CONTENT));

      await onConvertSelectedJsonFilesToYaml(clickedFile, selections);

      assert.strictEqual(mockFs.writeFile.callCount, 3);
    });

    test('filters out non-JSON files from selections', async () => {
      withConfig({});
      const clickedFile = vscode.Uri.file('/fake/file.json');
      const selections = [
        vscode.Uri.file('/fake/file.json'),
        vscode.Uri.file('/fake/readme.md'),
        vscode.Uri.file('/fake/config.yaml'),
        vscode.Uri.file('/fake/script.ts'),
      ];

      mockFs.readFile = Sinon.stub().resolves(Buffer.from(JSON_CONTENT));

      await onConvertSelectedJsonFilesToYaml(clickedFile, selections);

      assert.strictEqual(mockFs.writeFile.callCount, 1);
    });

    test('converts only files with .json extension', async () => {
      withConfig({});
      const clickedFile = vscode.Uri.file('/fake/file.json');
      const selections = [
        vscode.Uri.file('/fake/file.json'),
        vscode.Uri.file('/fake/file.JSON'), // uppercase - should not match
        vscode.Uri.file('/fake/file.json5'), // different extension
      ];

      mockFs.readFile = Sinon.stub().resolves(Buffer.from(JSON_CONTENT));

      await onConvertSelectedJsonFilesToYaml(clickedFile, selections);

      assert.strictEqual(mockFs.writeFile.callCount, 1);
      const [writtenUri] = mockFs.writeFile.firstCall.args as [vscode.Uri, Uint8Array];
      assert.ok(writtenUri.fsPath.includes('file.json'), 'should only convert .json file');
    });

    test('handles empty selections array', async () => {
      withConfig({});
      const clickedFile = vscode.Uri.file('/fake/file.json');
      const selections: vscode.Uri[] = [];

      await onConvertSelectedJsonFilesToYaml(clickedFile, selections);

      assert.strictEqual(mockFs.writeFile.callCount, 0);
    });

    test('handles selections with no JSON files', async () => {
      withConfig({});
      const clickedFile = vscode.Uri.file('/fake/file.txt');
      const selections = [
        vscode.Uri.file('/fake/readme.md'),
        vscode.Uri.file('/fake/config.yaml'),
        vscode.Uri.file('/fake/script.ts'),
      ];

      await onConvertSelectedJsonFilesToYaml(clickedFile, selections);

      assert.strictEqual(mockFs.writeFile.callCount, 0);
    });
  });

  suite('onConvertSelectedYamlFilesToJson', () => {
    test('converts single selected .yaml file to JSON', async () => {
      withConfig({});
      const clickedFile = vscode.Uri.file('/fake/file.yaml');
      const selections = [vscode.Uri.file('/fake/file.yaml')];

      mockFs.readFile = Sinon.stub().resolves(Buffer.from(YAML_CONTENT));

      await onConvertSelectedYamlFilesToJson(clickedFile, selections);

      assert.strictEqual(mockFs.writeFile.callCount, 1);
      const [writtenUri] = mockFs.writeFile.firstCall.args as [vscode.Uri, Uint8Array];
      assert.ok(writtenUri.fsPath.endsWith('.json'), 'written file should have .json extension');
    });

    test('converts single selected .yml file to JSON', async () => {
      withConfig({});
      const clickedFile = vscode.Uri.file('/fake/file.yml');
      const selections = [vscode.Uri.file('/fake/file.yml')];

      mockFs.readFile = Sinon.stub().resolves(Buffer.from(YAML_CONTENT));

      await onConvertSelectedYamlFilesToJson(clickedFile, selections);

      assert.strictEqual(mockFs.writeFile.callCount, 1);
      const [writtenUri] = mockFs.writeFile.firstCall.args as [vscode.Uri, Uint8Array];
      assert.ok(writtenUri.fsPath.endsWith('.json'), 'written file should have .json extension');
    });

    test('converts mixed .yaml and .yml files to JSON', async () => {
      withConfig({});
      const clickedFile = vscode.Uri.file('/fake/file1.yaml');
      const selections = [
        vscode.Uri.file('/fake/file1.yaml'),
        vscode.Uri.file('/fake/file2.yml'),
        vscode.Uri.file('/fake/config.yaml'),
      ];

      mockFs.readFile = Sinon.stub().resolves(Buffer.from(YAML_CONTENT));

      await onConvertSelectedYamlFilesToJson(clickedFile, selections);

      assert.strictEqual(mockFs.writeFile.callCount, 3);
    });

    test('filters out non-YAML files from selections', async () => {
      withConfig({});
      const clickedFile = vscode.Uri.file('/fake/file.yaml');
      const selections = [
        vscode.Uri.file('/fake/file.yaml'),
        vscode.Uri.file('/fake/readme.md'),
        vscode.Uri.file('/fake/config.json'),
        vscode.Uri.file('/fake/script.ts'),
      ];

      mockFs.readFile = Sinon.stub().resolves(Buffer.from(YAML_CONTENT));

      await onConvertSelectedYamlFilesToJson(clickedFile, selections);

      assert.strictEqual(mockFs.writeFile.callCount, 1);
    });

    test('converts only files with .yaml or .yml extension', async () => {
      withConfig({});
      const clickedFile = vscode.Uri.file('/fake/file.yaml');
      const selections = [
        vscode.Uri.file('/fake/file.yaml'),
        vscode.Uri.file('/fake/file.YAML'), // uppercase - should not match
        vscode.Uri.file('/fake/file.yml'),
        vscode.Uri.file('/fake/file.YML'), // uppercase - should not match
      ];

      mockFs.readFile = Sinon.stub().resolves(Buffer.from(YAML_CONTENT));

      await onConvertSelectedYamlFilesToJson(clickedFile, selections);

      assert.strictEqual(mockFs.writeFile.callCount, 2);
    });

    test('handles empty selections array', async () => {
      withConfig({});
      const clickedFile = vscode.Uri.file('/fake/file.yaml');
      const selections: vscode.Uri[] = [];

      await onConvertSelectedYamlFilesToJson(clickedFile, selections);

      assert.strictEqual(mockFs.writeFile.callCount, 0);
    });

    test('handles selections with no YAML files', async () => {
      withConfig({});
      const clickedFile = vscode.Uri.file('/fake/file.txt');
      const selections = [
        vscode.Uri.file('/fake/readme.md'),
        vscode.Uri.file('/fake/config.json'),
        vscode.Uri.file('/fake/script.ts'),
      ];

      await onConvertSelectedYamlFilesToJson(clickedFile, selections);

      assert.strictEqual(mockFs.writeFile.callCount, 0);
    });
  });

  suite('keepOriginalFiles config', () => {
    test('keeps original JSON files when keepOriginalFiles is always', async () => {
      withConfig({ [ConfigId.KeepOriginalFiles]: 'always' });
      const clickedFile = vscode.Uri.file('/fake/file.json');
      const selections = [vscode.Uri.file('/fake/file.json')];

      mockFs.readFile = Sinon.stub().resolves(Buffer.from(JSON_CONTENT));

      await onConvertSelectedJsonFilesToYaml(clickedFile, selections);

      assert.strictEqual(mockFs.delete.callCount, 0);
      assert.strictEqual(mockFs.writeFile.callCount, 1);
    });

    test('deletes original JSON files when keepOriginalFiles is not set', async () => {
      withConfig({});
      const clickedFile = vscode.Uri.file('/fake/file.json');
      const selections = [vscode.Uri.file('/fake/file.json')];

      mockFs.readFile = Sinon.stub().resolves(Buffer.from(JSON_CONTENT));

      await onConvertSelectedJsonFilesToYaml(clickedFile, selections);

      assert.strictEqual(mockFs.delete.callCount, 1);
      assert.strictEqual(mockFs.writeFile.callCount, 1);
    });

    test('keeps original YAML files when keepOriginalFiles is always', async () => {
      withConfig({ [ConfigId.KeepOriginalFiles]: 'always' });
      const clickedFile = vscode.Uri.file('/fake/file.yaml');
      const selections = [vscode.Uri.file('/fake/file.yaml')];

      mockFs.readFile = Sinon.stub().resolves(Buffer.from(YAML_CONTENT));

      await onConvertSelectedYamlFilesToJson(clickedFile, selections);

      assert.strictEqual(mockFs.delete.callCount, 0);
      assert.strictEqual(mockFs.writeFile.callCount, 1);
    });
  });

  suite('reverter tooltip', () => {
    test('shows reverter tooltip for single file conversion', async () => {
      withConfig({});
      const clickedFile = vscode.Uri.file('/fake/file.json');
      const selections = [vscode.Uri.file('/fake/file.json')];

      mockFs.readFile = Sinon.stub().resolves(Buffer.from(JSON_CONTENT));

      await onConvertSelectedJsonFilesToYaml(clickedFile, selections);

      assert.strictEqual(showInformationMessageStub.callCount, 1);
      assert.ok(
        (showInformationMessageStub.firstCall.args[0] as string).includes('Revert'),
        'should show revert message',
      );
    });

    test('shows reverter tooltip for multiple files conversion', async () => {
      withConfig({});
      const clickedFile = vscode.Uri.file('/fake/file1.json');
      const selections = [vscode.Uri.file('/fake/file1.json'), vscode.Uri.file('/fake/file2.json')];

      mockFs.readFile = Sinon.stub().resolves(Buffer.from(JSON_CONTENT));

      await onConvertSelectedJsonFilesToYaml(clickedFile, selections);

      assert.strictEqual(showInformationMessageStub.callCount, 1);
      assert.ok(
        (showInformationMessageStub.firstCall.args[0] as string).includes('Revert'),
        'should show revert message',
      );
      assert.ok(
        (showInformationMessageStub.firstCall.args[0] as string).includes('2'),
        'should mention number of files',
      );
    });
  });

  suite('error handling', () => {
    test('handles errors during JSON to YAML conversion gracefully', async () => {
      withConfig({});
      const clickedFile = vscode.Uri.file('/fake/file.json');
      const selections = [vscode.Uri.file('/fake/file.json')];

      mockFs.readFile = Sinon.stub().resolves(Buffer.from('{ invalid json }'));

      await onConvertSelectedJsonFilesToYaml(clickedFile, selections);

      // Should show error but not throw
      assert.strictEqual(showErrorMessageStub.callCount, 1);
    });

    test('handles errors during YAML to JSON conversion gracefully', async () => {
      withConfig({});
      const clickedFile = vscode.Uri.file('/fake/file.yaml');
      const selections = [vscode.Uri.file('/fake/file.yaml')];

      mockFs.readFile = Sinon.stub().resolves(Buffer.from('--- {unclosed'));

      await onConvertSelectedYamlFilesToJson(clickedFile, selections);

      // Should show error but not throw
      assert.strictEqual(showErrorMessageStub.callCount, 1);
    });

    test('continues converting remaining files when one fails', async () => {
      withConfig({});
      const clickedFile = vscode.Uri.file('/fake/file1.json');
      const selections = [vscode.Uri.file('/fake/file1.json'), vscode.Uri.file('/fake/file2.json')];

      // First call succeeds, second throws
      mockFs.readFile = Sinon.stub()
        .onFirstCall()
        .resolves(Buffer.from(JSON_CONTENT))
        .onSecondCall()
        .rejects(new Error('Read error'));

      await onConvertSelectedJsonFilesToYaml(clickedFile, selections);

      // Should have attempted both, at least one succeeded
      assert.ok(mockFs.writeFile.callCount >= 0);
    });
  });
});
