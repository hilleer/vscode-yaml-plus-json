import * as assert from 'assert';
import * as Sinon from 'sinon';
import * as vscode from 'vscode';

import {
  onRightClickAndConvertJsonFilesToYaml,
  onRightClickConvertYamlFilesToJson,
} from '../../onRightClickAndConvertDirectoryFiles';
import { ConfigId, Configs } from '../../config';
import { WorkspaceConfigurationMock, createMockVscode, MockFs } from '../testUtil';
import { contextProvider } from '../../contextProvider';

const YAML_CONTENT = 'name: foo\nvalue: 1\n';
const JSON_CONTENT = JSON.stringify({ name: 'foo', value: 1 }, null, 2);

suite('onRightClickAndConvertDirectoryFiles', () => {
  let showInformationMessageStub: Sinon.SinonStub;
  let showErrorMessageStub: Sinon.SinonStub;
  let configMock: WorkspaceConfigurationMock | undefined;
  let mockFs: MockFs;

  setup(() => {
    mockFs = {
      readFile: Sinon.stub().rejects(vscode.FileSystemError.FileNotFound()),
      writeFile: Sinon.stub().resolves(),
      delete: Sinon.stub().resolves(),
      stat: Sinon.stub().resolves({
        type: vscode.FileType.Directory,
        ctime: Date.now(),
        mtime: Date.now(),
        size: 100,
      }),
      readDirectory: Sinon.stub().resolves([]),
    };

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
    const defaults = {
      [ConfigId.FileExtensionsJson]: '.json',
      [ConfigId.FileExtensionsYaml]: '.yaml',
    };
    configMock = new WorkspaceConfigurationMock({ ...defaults, ...config });
  }

  suite('onRightClickAndConvertJsonFilesToYaml', () => {
    test('shows message when no JSON files found in directory', async () => {
      withConfig({});
      const uri = vscode.Uri.file('/fake/dir');

      mockFs.readDirectory!.resolves([
        ['file.txt', vscode.FileType.File],
        ['subdir', vscode.FileType.Directory],
      ]);

      await onRightClickAndConvertJsonFilesToYaml(uri);

      assert.strictEqual(showInformationMessageStub.callCount, 1);
      assert.ok(
        (showInformationMessageStub.firstCall.args[0] as string).includes('Did not find any json files'),
        'should show no json files message',
      );
    });

    test('converts single JSON file to YAML', async () => {
      withConfig({});
      const uri = vscode.Uri.file('/fake/dir');

      mockFs.readDirectory!.resolves([['file.json', vscode.FileType.File]]);
      mockFs.readFile.callsFake((uri: vscode.Uri) => {
        if (uri.fsPath.endsWith('.yaml') || uri.fsPath.endsWith('.yml')) {
          return Promise.reject(vscode.FileSystemError.FileNotFound());
        }
        return Promise.resolve(Buffer.from(JSON_CONTENT));
      });

      await onRightClickAndConvertJsonFilesToYaml(uri);

      assert.strictEqual(mockFs.writeFile.callCount, 1);
      const [writtenUri] = mockFs.writeFile.firstCall.args as [vscode.Uri, Uint8Array];
      assert.ok(writtenUri.fsPath.endsWith('.yaml'), 'written file should have .yaml extension');
    });

    test('converts multiple JSON files to YAML', async () => {
      withConfig({});
      const uri = vscode.Uri.file('/fake/dir');

      mockFs.readDirectory!.resolves([
        ['file1.json', vscode.FileType.File],
        ['file2.json', vscode.FileType.File],
        ['config.json', vscode.FileType.File],
      ]);
      mockFs.readFile.callsFake((uri: vscode.Uri) => {
        if (uri.fsPath.endsWith('.yaml') || uri.fsPath.endsWith('.yml')) {
          return Promise.reject(vscode.FileSystemError.FileNotFound());
        }
        return Promise.resolve(Buffer.from(JSON_CONTENT));
      });

      await onRightClickAndConvertJsonFilesToYaml(uri);

      assert.strictEqual(mockFs.writeFile.callCount, 3);
    });

    test('ignores non-JSON files in directory', async () => {
      withConfig({});
      const uri = vscode.Uri.file('/fake/dir');

      mockFs.readDirectory!.resolves([
        ['file1.json', vscode.FileType.File],
        ['readme.md', vscode.FileType.File],
        ['file.yaml', vscode.FileType.File],
        ['script.ts', vscode.FileType.File],
      ]);
      mockFs.readFile.callsFake((uri: vscode.Uri) => {
        if (uri.fsPath.endsWith('.yaml') || uri.fsPath.endsWith('.yml')) {
          return Promise.reject(vscode.FileSystemError.FileNotFound());
        }
        return Promise.resolve(Buffer.from(JSON_CONTENT));
      });

      await onRightClickAndConvertJsonFilesToYaml(uri);

      assert.strictEqual(mockFs.writeFile.callCount, 1);
    });

    test('ignores subdirectories', async () => {
      withConfig({});
      const uri = vscode.Uri.file('/fake/dir');

      mockFs.readDirectory!.resolves([
        ['file.json', vscode.FileType.File],
        ['subdir', vscode.FileType.Directory],
        ['nested', vscode.FileType.Directory],
      ]);
      mockFs.readFile.callsFake((uri: vscode.Uri) => {
        if (uri.fsPath.endsWith('.yaml') || uri.fsPath.endsWith('.yml')) {
          return Promise.reject(vscode.FileSystemError.FileNotFound());
        }
        return Promise.resolve(Buffer.from(JSON_CONTENT));
      });

      await onRightClickAndConvertJsonFilesToYaml(uri);

      assert.strictEqual(mockFs.writeFile.callCount, 1);
    });

    test('shows error when uri scheme is not file', async () => {
      withConfig({});
      const uri = vscode.Uri.parse('http://example.com/dir');

      await onRightClickAndConvertJsonFilesToYaml(uri);

      assert.strictEqual(showErrorMessageStub.callCount, 1);
      assert.ok(
        (showErrorMessageStub.firstCall.args[0] as string).includes('Unexpected file scheme'),
        'should show unexpected scheme error',
      );
    });

    test('shows message when selection is not a directory', async () => {
      withConfig({});
      const uri = vscode.Uri.file('/fake/file.json');

      // Override stat to return File type for this test
      mockFs.stat.resolves({
        type: vscode.FileType.File,
        ctime: Date.now(),
        mtime: Date.now(),
        size: 100,
      });

      await onRightClickAndConvertJsonFilesToYaml(uri);

      assert.strictEqual(showInformationMessageStub.callCount, 1);
      assert.ok(
        (showInformationMessageStub.firstCall.args[0] as string).includes('not recognised as a directory'),
        'should show not a directory message',
      );
    });

    test('handles errors during file conversion gracefully', async () => {
      withConfig({});
      const uri = vscode.Uri.file('/fake/dir');

      mockFs.readDirectory!.resolves([['file.json', vscode.FileType.File]]);
      mockFs.readFile.callsFake((uri: vscode.Uri) => {
        if (uri.fsPath.endsWith('.yaml') || uri.fsPath.endsWith('.yml')) {
          return Promise.reject(vscode.FileSystemError.FileNotFound());
        }
        return Promise.resolve(Buffer.from('{ invalid json }'));
      });

      await onRightClickAndConvertJsonFilesToYaml(uri);

      // Should show error but not throw
      assert.strictEqual(showErrorMessageStub.callCount, 1);
    });
  });

  suite('onRightClickConvertYamlFilesToJson', () => {
    test('shows message when no YAML files found in directory', async () => {
      withConfig({});
      const uri = vscode.Uri.file('/fake/dir');

      mockFs.readDirectory!.resolves([
        ['file.txt', vscode.FileType.File],
        ['file.json', vscode.FileType.File],
      ]);

      await onRightClickConvertYamlFilesToJson(uri);

      assert.strictEqual(showInformationMessageStub.callCount, 1);
      assert.ok(
        (showInformationMessageStub.firstCall.args[0] as string).includes('Did not find any yaml files'),
        'should show no yaml files message',
      );
    });

    test('converts single .yaml file to JSON', async () => {
      withConfig({});
      const uri = vscode.Uri.file('/fake/dir');

      mockFs.readDirectory!.resolves([['file.yaml', vscode.FileType.File]]);
      mockFs.readFile.callsFake((uri: vscode.Uri) => {
        if (uri.fsPath.endsWith('.json')) {
          return Promise.reject(vscode.FileSystemError.FileNotFound());
        }
        return Promise.resolve(Buffer.from(YAML_CONTENT));
      });

      await onRightClickConvertYamlFilesToJson(uri);

      assert.strictEqual(mockFs.writeFile.callCount, 1);
      const [writtenUri] = mockFs.writeFile.firstCall.args as [vscode.Uri, Uint8Array];
      assert.ok(writtenUri.fsPath.endsWith('.json'), 'written file should have .json extension');
    });

    test('converts single .yml file to JSON', async () => {
      withConfig({});
      const uri = vscode.Uri.file('/fake/dir');

      mockFs.readDirectory!.resolves([['file.yml', vscode.FileType.File]]);
      mockFs.readFile.callsFake((uri: vscode.Uri) => {
        if (uri.fsPath.endsWith('.json')) {
          return Promise.reject(vscode.FileSystemError.FileNotFound());
        }
        return Promise.resolve(Buffer.from(YAML_CONTENT));
      });

      await onRightClickConvertYamlFilesToJson(uri);

      assert.strictEqual(mockFs.writeFile.callCount, 1);
      const [writtenUri] = mockFs.writeFile.firstCall.args as [vscode.Uri, Uint8Array];
      assert.ok(writtenUri.fsPath.endsWith('.json'), 'written file should have .json extension');
    });

    test('converts both .yaml and .yml files to JSON', async () => {
      withConfig({});
      const uri = vscode.Uri.file('/fake/dir');

      mockFs.readDirectory!.resolves([
        ['file1.yaml', vscode.FileType.File],
        ['file2.yml', vscode.FileType.File],
        ['config.yaml', vscode.FileType.File],
      ]);
      mockFs.readFile.callsFake((uri: vscode.Uri) => {
        if (uri.fsPath.endsWith('.json')) {
          return Promise.reject(vscode.FileSystemError.FileNotFound());
        }
        return Promise.resolve(Buffer.from(YAML_CONTENT));
      });

      await onRightClickConvertYamlFilesToJson(uri);

      assert.strictEqual(mockFs.writeFile.callCount, 3);
    });

    test('ignores non-YAML files in directory', async () => {
      withConfig({});
      const uri = vscode.Uri.file('/fake/dir');

      mockFs.readDirectory!.resolves([
        ['file1.yaml', vscode.FileType.File],
        ['readme.md', vscode.FileType.File],
        ['file.json', vscode.FileType.File],
        ['script.ts', vscode.FileType.File],
      ]);
      mockFs.readFile.callsFake((uri: vscode.Uri) => {
        if (uri.fsPath.endsWith('.json')) {
          return Promise.reject(vscode.FileSystemError.FileNotFound());
        }
        return Promise.resolve(Buffer.from(YAML_CONTENT));
      });

      await onRightClickConvertYamlFilesToJson(uri);

      assert.strictEqual(mockFs.writeFile.callCount, 1);
    });

    test('shows error when uri scheme is not file', async () => {
      withConfig({});
      const uri = vscode.Uri.parse('http://example.com/dir');

      await onRightClickConvertYamlFilesToJson(uri);

      assert.strictEqual(showErrorMessageStub.callCount, 1);
      assert.ok(
        (showErrorMessageStub.firstCall.args[0] as string).includes('Unexpected file scheme'),
        'should show unexpected scheme error',
      );
    });

    test('shows message when selection is not a directory', async () => {
      withConfig({});
      const uri = vscode.Uri.file('/fake/file.yaml');

      // Override stat to return File type for this test
      mockFs.stat.resolves({
        type: vscode.FileType.File,
        ctime: Date.now(),
        mtime: Date.now(),
        size: 100,
      });

      await onRightClickConvertYamlFilesToJson(uri);

      assert.strictEqual(showInformationMessageStub.callCount, 1);
      assert.ok(
        (showInformationMessageStub.firstCall.args[0] as string).includes('not recognised as a directory'),
        'should show not a directory message',
      );
    });

    test('handles errors during file conversion gracefully', async () => {
      withConfig({});
      const uri = vscode.Uri.file('/fake/dir');

      mockFs.readDirectory!.resolves([['file.yaml', vscode.FileType.File]]);
      mockFs.readFile.callsFake((uri: vscode.Uri) => {
        if (uri.fsPath.endsWith('.json')) {
          return Promise.reject(vscode.FileSystemError.FileNotFound());
        }
        return Promise.resolve(Buffer.from('--- {unclosed'));
      });

      await onRightClickConvertYamlFilesToJson(uri);

      // Should show error but not throw
      assert.strictEqual(showErrorMessageStub.callCount, 1);
    });
  });

  suite('keepOriginalFiles config', () => {
    test('keeps original JSON files when keepOriginalFiles is always', async () => {
      withConfig({ [ConfigId.KeepOriginalFiles]: 'always' });
      const uri = vscode.Uri.file('/fake/dir');

      mockFs.readDirectory!.resolves([['file.json', vscode.FileType.File]]);
      mockFs.readFile.callsFake((uri: vscode.Uri) => {
        if (uri.fsPath.endsWith('.yaml') || uri.fsPath.endsWith('.yml')) {
          return Promise.reject(vscode.FileSystemError.FileNotFound());
        }
        return Promise.resolve(Buffer.from(JSON_CONTENT));
      });

      await onRightClickAndConvertJsonFilesToYaml(uri);

      assert.strictEqual(mockFs.delete.callCount, 0);
      assert.strictEqual(mockFs.writeFile.callCount, 1);
    });

    test('deletes original JSON files when keepOriginalFiles is not set', async () => {
      withConfig({});
      const uri = vscode.Uri.file('/fake/dir');

      mockFs.readDirectory!.resolves([['file.json', vscode.FileType.File]]);
      mockFs.readFile.callsFake((uri: vscode.Uri) => {
        if (uri.fsPath.endsWith('.yaml') || uri.fsPath.endsWith('.yml')) {
          return Promise.reject(vscode.FileSystemError.FileNotFound());
        }
        return Promise.resolve(Buffer.from(JSON_CONTENT));
      });

      await onRightClickAndConvertJsonFilesToYaml(uri);

      assert.strictEqual(mockFs.delete.callCount, 1);
      assert.strictEqual(mockFs.writeFile.callCount, 1);
    });

    test('keeps original YAML files when keepOriginalFiles is always', async () => {
      withConfig({ [ConfigId.KeepOriginalFiles]: 'always' });
      const uri = vscode.Uri.file('/fake/dir');

      mockFs.readDirectory!.resolves([['file.yaml', vscode.FileType.File]]);
      mockFs.readFile.callsFake((uri: vscode.Uri) => {
        if (uri.fsPath.endsWith('.json')) {
          return Promise.reject(vscode.FileSystemError.FileNotFound());
        }
        return Promise.resolve(Buffer.from(YAML_CONTENT));
      });

      await onRightClickConvertYamlFilesToJson(uri);

      assert.strictEqual(mockFs.delete.callCount, 0);
      assert.strictEqual(mockFs.writeFile.callCount, 1);
    });
  });

  suite('reverter tooltip', () => {
    test('shows reverter tooltip for single file conversion', async () => {
      withConfig({});
      const uri = vscode.Uri.file('/fake/dir');

      mockFs.readDirectory!.resolves([['file.json', vscode.FileType.File]]);
      mockFs.readFile.callsFake((uri: vscode.Uri) => {
        if (uri.fsPath.endsWith('.yaml') || uri.fsPath.endsWith('.yml')) {
          return Promise.reject(vscode.FileSystemError.FileNotFound());
        }
        return Promise.resolve(Buffer.from(JSON_CONTENT));
      });

      await onRightClickAndConvertJsonFilesToYaml(uri);

      assert.strictEqual(showInformationMessageStub.callCount, 1);
      assert.ok(
        (showInformationMessageStub.firstCall.args[0] as string).includes('Revert'),
        'should show revert message',
      );
    });

    test('shows reverter tooltip for multiple files conversion', async () => {
      withConfig({});
      const uri = vscode.Uri.file('/fake/dir');

      mockFs.readDirectory!.resolves([
        ['file1.json', vscode.FileType.File],
        ['file2.json', vscode.FileType.File],
      ]);
      mockFs.readFile.callsFake((uri: vscode.Uri) => {
        if (uri.fsPath.endsWith('.yaml') || uri.fsPath.endsWith('.yml')) {
          return Promise.reject(vscode.FileSystemError.FileNotFound());
        }
        return Promise.resolve(Buffer.from(JSON_CONTENT));
      });

      await onRightClickAndConvertJsonFilesToYaml(uri);

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
});
