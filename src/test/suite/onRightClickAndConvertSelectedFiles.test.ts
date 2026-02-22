import * as assert from 'assert';
import * as Sinon from 'sinon';
import { Uri, FileSystemError } from 'vscode';

import { ConfigId, Configs } from '../../config';
import { WorkspaceConfigurationMock, createMockVscode, MockFs, createMockFs } from '../testUtil';
import { contextProvider } from '../../contextProvider';
import {
  onConvertSelectedJsonFilesToYaml,
  onConvertSelectedYamlFilesToJson,
} from '../../onRightClickAndConvertSelectedFiles';

const YAML_CONTENT = 'name: foo\nvalue: 1\n';
const JSON_CONTENT = JSON.stringify({ name: 'foo', value: 1 }, null, 2);

suite('onRightClickAndConvertSelectedFiles', () => {
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
    const defaults = {
      [ConfigId.FileExtensionsJson]: '.json',
      [ConfigId.FileExtensionsYaml]: '.yaml',
    };
    configMock = new WorkspaceConfigurationMock({ ...defaults, ...config });
  }

  suite('onConvertSelectedJsonFilesToYaml', () => {
    test('converts single selected JSON file to YAML', async () => {
      withConfig({});
      const selections = [Uri.file('/fake/file.json')];

      mockFs.readFile.callsFake((uri: Uri) => {
        if (uri.fsPath.endsWith('.yaml')) {
          return Promise.reject(FileSystemError.FileNotFound());
        }
        return Promise.resolve(Buffer.from(JSON_CONTENT));
      });

      await onConvertSelectedJsonFilesToYaml(selections);

      assert.strictEqual(mockFs.writeFile.callCount, 1);
      const [writtenUri] = mockFs.writeFile.firstCall.args as [Uri, Uint8Array];
      assert.ok(writtenUri.fsPath.endsWith('.yaml'), 'written file should have .yaml extension');
    });

    test('converts multiple selected JSON files to YAML', async () => {
      withConfig({});
      const selections = [Uri.file('/fake/file1.json'), Uri.file('/fake/file2.json'), Uri.file('/fake/config.json')];

      mockFs.readFile.callsFake((uri: Uri) => {
        if (uri.fsPath.endsWith('.yaml') || uri.fsPath.endsWith('.yml')) {
          return Promise.reject(FileSystemError.FileNotFound());
        }
        return Promise.resolve(Buffer.from(JSON_CONTENT));
      });

      await onConvertSelectedJsonFilesToYaml(selections);

      assert.strictEqual(mockFs.writeFile.callCount, 3);
    });

    test('filters out non-JSON files from selections', async () => {
      withConfig({});
      const selections = [
        Uri.file('/fake/file.json'),
        Uri.file('/fake/readme.md'),
        Uri.file('/fake/config.yaml'),
        Uri.file('/fake/script.ts'),
      ];

      mockFs.readFile.callsFake((uri: Uri) => {
        if (uri.fsPath.endsWith('.yaml') || uri.fsPath.endsWith('.yml')) {
          return Promise.reject(FileSystemError.FileNotFound());
        }
        return Promise.resolve(Buffer.from(JSON_CONTENT));
      });

      await onConvertSelectedJsonFilesToYaml(selections);

      assert.strictEqual(mockFs.writeFile.callCount, 1);
    });

    test('converts only files with .json extension', async () => {
      withConfig({});
      const selections = [
        Uri.file('/fake/file.json'),
        Uri.file('/fake/file.JSON'), // uppercase - should not match
        Uri.file('/fake/file.json5'), // different extension
      ];

      mockFs.readFile.callsFake((uri: Uri) => {
        if (uri.fsPath.endsWith('.yaml') || uri.fsPath.endsWith('.yml')) {
          return Promise.reject(FileSystemError.FileNotFound());
        }
        return Promise.resolve(Buffer.from(JSON_CONTENT));
      });

      await onConvertSelectedJsonFilesToYaml(selections);

      assert.strictEqual(mockFs.writeFile.callCount, 1);
    });

    test('handles empty selections array', async () => {
      withConfig({});
      const selections: Uri[] = [];

      await onConvertSelectedJsonFilesToYaml(selections);

      assert.strictEqual(mockFs.writeFile.callCount, 0);
    });

    test('handles selections with no JSON files', async () => {
      withConfig({});
      const selections = [Uri.file('/fake/readme.md'), Uri.file('/fake/config.yaml'), Uri.file('/fake/script.ts')];

      await onConvertSelectedJsonFilesToYaml(selections);

      assert.strictEqual(mockFs.writeFile.callCount, 0);
    });
  });

  suite('onConvertSelectedYamlFilesToJson', () => {
    test('converts single selected .yaml file to JSON', async () => {
      withConfig({});
      const selections = [Uri.file('/fake/file.yaml')];

      mockFs.readFile.callsFake((uri: Uri) => {
        if (uri.fsPath.endsWith('.json')) {
          return Promise.reject(FileSystemError.FileNotFound());
        }
        return Promise.resolve(Buffer.from(YAML_CONTENT));
      });

      await onConvertSelectedYamlFilesToJson(selections);

      assert.strictEqual(mockFs.writeFile.callCount, 1);
      const [writtenUri] = mockFs.writeFile.firstCall.args as [Uri, Uint8Array];
      assert.ok(writtenUri.fsPath.endsWith('.json'), 'written file should have .json extension');
    });

    test('converts single selected .yml file to JSON', async () => {
      withConfig({});
      const selections = [Uri.file('/fake/file.yml')];

      mockFs.readFile.callsFake((uri: Uri) => {
        if (uri.fsPath.endsWith('.json')) {
          return Promise.reject(FileSystemError.FileNotFound());
        }
        return Promise.resolve(Buffer.from(YAML_CONTENT));
      });

      await onConvertSelectedYamlFilesToJson(selections);

      assert.strictEqual(mockFs.writeFile.callCount, 1);
      const [writtenUri] = mockFs.writeFile.firstCall.args as [Uri, Uint8Array];
      assert.ok(writtenUri.fsPath.endsWith('.json'), 'written file should have .json extension');
    });

    test('converts mixed .yaml and .yml files to JSON', async () => {
      withConfig({});
      const selections = [Uri.file('/fake/file1.yaml'), Uri.file('/fake/file2.yml'), Uri.file('/fake/config.yaml')];

      mockFs.readFile.callsFake((uri: Uri) => {
        if (uri.fsPath.endsWith('.json')) {
          return Promise.reject(FileSystemError.FileNotFound());
        }
        return Promise.resolve(Buffer.from(YAML_CONTENT));
      });

      await onConvertSelectedYamlFilesToJson(selections);

      assert.strictEqual(mockFs.writeFile.callCount, 3);
    });

    test('filters out non-YAML files from selections', async () => {
      withConfig({});
      const selections = [
        Uri.file('/fake/file.yaml'),
        Uri.file('/fake/readme.md'),
        Uri.file('/fake/config.json'),
        Uri.file('/fake/script.ts'),
      ];

      mockFs.readFile.callsFake((uri: Uri) => {
        if (uri.fsPath.endsWith('.json')) {
          return Promise.reject(FileSystemError.FileNotFound());
        }
        return Promise.resolve(Buffer.from(YAML_CONTENT));
      });

      await onConvertSelectedYamlFilesToJson(selections);

      assert.strictEqual(mockFs.writeFile.callCount, 1);
    });

    test('converts only files with .yaml or .yml extension', async () => {
      withConfig({});
      const selections = [
        Uri.file('/fake/file.yaml'),
        Uri.file('/fake/file.YAML'), // uppercase - should not match
        Uri.file('/fake/file.yml'),
        Uri.file('/fake/file.YML'), // uppercase - should not match
      ];

      mockFs.readFile.callsFake((uri: Uri) => {
        if (uri.fsPath.endsWith('.json')) {
          return Promise.reject(FileSystemError.FileNotFound());
        }
        return Promise.resolve(Buffer.from(YAML_CONTENT));
      });

      await onConvertSelectedYamlFilesToJson(selections);

      assert.strictEqual(mockFs.writeFile.callCount, 2);
    });

    test('handles empty selections array', async () => {
      withConfig({});
      const selections: Uri[] = [];

      await onConvertSelectedYamlFilesToJson(selections);

      assert.strictEqual(mockFs.writeFile.callCount, 0);
    });

    test('handles selections with no YAML files', async () => {
      withConfig({});
      const selections = [Uri.file('/fake/readme.md'), Uri.file('/fake/config.json'), Uri.file('/fake/script.ts')];

      await onConvertSelectedYamlFilesToJson(selections);

      assert.strictEqual(mockFs.writeFile.callCount, 0);
    });
  });

  suite('keepOriginalFiles config', () => {
    test('keeps original JSON files when keepOriginalFiles is always', async () => {
      withConfig({ [ConfigId.KeepOriginalFiles]: 'always' });
      const selections = [Uri.file('/fake/file.json')];

      mockFs.readFile.callsFake((uri: Uri) => {
        if (uri.fsPath.endsWith('.yaml') || uri.fsPath.endsWith('.yml')) {
          return Promise.reject(FileSystemError.FileNotFound());
        }
        return Promise.resolve(Buffer.from(JSON_CONTENT));
      });

      await onConvertSelectedJsonFilesToYaml(selections);

      assert.strictEqual(mockFs.delete.callCount, 0);
      assert.strictEqual(mockFs.writeFile.callCount, 1);
    });

    test('deletes original JSON files when keepOriginalFiles is not set', async () => {
      withConfig({});
      const selections = [Uri.file('/fake/file.json')];

      mockFs.readFile.callsFake((uri: Uri) => {
        if (uri.fsPath.endsWith('.yaml') || uri.fsPath.endsWith('.yml')) {
          return Promise.reject(FileSystemError.FileNotFound());
        }
        return Promise.resolve(Buffer.from(JSON_CONTENT));
      });

      await onConvertSelectedJsonFilesToYaml(selections);

      assert.strictEqual(mockFs.delete.callCount, 1);
      assert.strictEqual(mockFs.writeFile.callCount, 1);
    });

    test('keeps original YAML files when keepOriginalFiles is always', async () => {
      withConfig({ [ConfigId.KeepOriginalFiles]: 'always' });
      const selections = [Uri.file('/fake/file.yaml')];

      mockFs.readFile.callsFake((uri: Uri) => {
        if (uri.fsPath.endsWith('.json')) {
          return Promise.reject(FileSystemError.FileNotFound());
        }
        return Promise.resolve(Buffer.from(YAML_CONTENT));
      });

      await onConvertSelectedYamlFilesToJson(selections);

      assert.strictEqual(mockFs.delete.callCount, 0);
      assert.strictEqual(mockFs.writeFile.callCount, 1);
    });
  });

  suite('reverter tooltip', () => {
    test('shows reverter tooltip for single file conversion', async () => {
      withConfig({});
      const selections = [Uri.file('/fake/file.json')];

      mockFs.readFile.callsFake((uri: Uri) => {
        if (uri.fsPath.endsWith('.yaml') || uri.fsPath.endsWith('.yml')) {
          return Promise.reject(FileSystemError.FileNotFound());
        }
        return Promise.resolve(Buffer.from(JSON_CONTENT));
      });

      await onConvertSelectedJsonFilesToYaml(selections);

      assert.strictEqual(showInformationMessageStub.callCount, 1);
      assert.ok(
        (showInformationMessageStub.firstCall.args[0] as string).includes('Revert'),
        'should show revert message',
      );
    });

    test('shows reverter tooltip for multiple files conversion', async () => {
      withConfig({});
      const selections = [Uri.file('/fake/file1.json'), Uri.file('/fake/file2.json')];

      mockFs.readFile.callsFake((uri: Uri) => {
        if (uri.fsPath.endsWith('.yaml') || uri.fsPath.endsWith('.yml')) {
          return Promise.reject(FileSystemError.FileNotFound());
        }
        return Promise.resolve(Buffer.from(JSON_CONTENT));
      });

      await onConvertSelectedJsonFilesToYaml(selections);

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
      const selections = [Uri.file('/fake/file.json')];

      mockFs.readFile.callsFake((uri: Uri) => {
        if (uri.fsPath.endsWith('.yaml') || uri.fsPath.endsWith('.yml')) {
          return Promise.reject(FileSystemError.FileNotFound());
        }
        return Promise.resolve(Buffer.from('{ invalid json }'));
      });

      await onConvertSelectedJsonFilesToYaml(selections);

      assert.strictEqual(showErrorMessageStub.callCount, 1);
    });

    test('handles errors during YAML to JSON conversion gracefully', async () => {
      withConfig({});
      const selections = [Uri.file('/fake/file.yaml')];

      mockFs.readFile.callsFake((uri: Uri) => {
        if (uri.fsPath.endsWith('.json')) {
          return Promise.reject(FileSystemError.FileNotFound());
        }
        return Promise.resolve(Buffer.from('--- {unclosed'));
      });

      await onConvertSelectedYamlFilesToJson(selections);

      assert.strictEqual(showErrorMessageStub.callCount, 1);
    });

    test('continues converting remaining files when one fails', async () => {
      withConfig({});
      const selections = [Uri.file('/fake/file1.json'), Uri.file('/fake/file2.json')];

      let callCount = 0;
      mockFs.readFile.callsFake((uri: Uri) => {
        callCount++;
        if (uri.fsPath.endsWith('.yaml') || uri.fsPath.endsWith('.yml')) {
          return Promise.reject(FileSystemError.FileNotFound());
        }
        if (callCount === 2) {
          return Promise.reject(new Error('Read error'));
        }
        return Promise.resolve(Buffer.from(JSON_CONTENT));
      });

      await onConvertSelectedJsonFilesToYaml(selections);

      assert.ok(mockFs.writeFile.callCount >= 0);
    });
  });
});
