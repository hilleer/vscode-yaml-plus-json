import * as assert from 'assert';
import * as Sinon from 'sinon';
import { Uri, FileSystemError } from 'vscode';
import type { TextDocument, TextEditor } from 'vscode';

import { onRightClickAndConvertJsonFile, onRightClickAndConvertYamlFile } from '../../onRightClickAndConvertFile';
import { ConfigId, Configs } from '../../config';
import { WorkspaceConfigurationMock, createMockVscode, MockFs, createMockFs } from '../testUtil';
import { contextProvider } from '../../contextProvider';

const YAML_CONTENT = 'name: foo\nvalue: 1\n';
const JSON_CONTENT = JSON.stringify({ name: 'foo', value: 1 }, null, 2);

suite('onRightClickAndConvertFile', () => {
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

  suite('onRightClickAndConvertJsonFile', () => {
    test('converts JSON file to YAML', async () => {
      withConfig({});
      const uri = Uri.file('/fake/file.json');

      mockFs.readFile.callsFake((uri: Uri) => {
        if (uri.fsPath.endsWith('.yaml') || uri.fsPath.endsWith('.yml')) {
          return Promise.reject(FileSystemError.FileNotFound());
        }
        return Promise.resolve(Buffer.from(JSON_CONTENT));
      });

      await onRightClickAndConvertJsonFile(uri);

      assert.strictEqual(mockFs.writeFile.callCount, 1);
      const [writtenUri] = mockFs.writeFile.firstCall.args as [Uri, Uint8Array];
      assert.ok(writtenUri.fsPath.endsWith('.yaml'), 'written file should have .yaml extension');
    });

    test('uses active text editor when uri is not provided', async () => {
      withConfig({});
      const uri = Uri.file('/fake/active.json');
      const mockDocument = {
        uri: uri,
        getText: () => JSON_CONTENT,
      } as unknown as TextDocument;

      mockFs.readFile.callsFake((u: Uri) => {
        if (u.fsPath.endsWith('.yaml') || u.fsPath.endsWith('.yml')) {
          return Promise.reject(FileSystemError.FileNotFound());
        }
        return Promise.resolve(Buffer.from(JSON_CONTENT));
      });

      // Set activeTextEditor on the mock
      (contextProvider.vscode.window as { activeTextEditor: TextEditor | undefined }).activeTextEditor = {
        document: mockDocument,
      } as TextEditor;

      await onRightClickAndConvertJsonFile(undefined as unknown as Uri);

      assert.strictEqual(mockFs.writeFile.callCount, 1);
    });

    test('throws error when no active text editor and no uri', async () => {
      withConfig({});
      // activeTextEditor is undefined in the mock by default

      try {
        await onRightClickAndConvertJsonFile(undefined as unknown as Uri);
        assert.fail('should have thrown an error');
      } catch (error) {
        if (!(error instanceof Error)) {
          assert.fail('expected error to be an Error');
        }
        assert.strictEqual(error.message, 'Failed to get active text editor');
      }
    });

    test('keeps original file when keepOriginalFiles is always', async () => {
      withConfig({ [ConfigId.KeepOriginalFiles]: 'always' });
      const uri = Uri.file('/fake/file.json');

      mockFs.readFile.callsFake((uri: Uri) => {
        if (uri.fsPath.endsWith('.yaml') || uri.fsPath.endsWith('.yml')) {
          return Promise.reject(FileSystemError.FileNotFound());
        }
        return Promise.resolve(Buffer.from(JSON_CONTENT));
      });

      await onRightClickAndConvertJsonFile(uri);

      assert.strictEqual(mockFs.delete.callCount, 0);
      assert.strictEqual(mockFs.writeFile.callCount, 1);
    });

    test('deletes original file when keepOriginalFiles is not set', async () => {
      withConfig({});
      const uri = Uri.file('/fake/file.json');

      mockFs.readFile.callsFake((uri: Uri) => {
        if (uri.fsPath.endsWith('.yaml') || uri.fsPath.endsWith('.yml')) {
          return Promise.reject(FileSystemError.FileNotFound());
        }
        return Promise.resolve(Buffer.from(JSON_CONTENT));
      });

      await onRightClickAndConvertJsonFile(uri);

      assert.strictEqual(mockFs.delete.callCount, 1);
      assert.strictEqual(mockFs.writeFile.callCount, 1);
    });

    test('prompts user when keepOriginalFiles is ask and user chooses to keep', async () => {
      withConfig({ [ConfigId.KeepOriginalFiles]: 'ask' });
      showInformationMessageStub.resolves('Keep' as unknown);
      const uri = Uri.file('/fake/file.json');

      mockFs.readFile.callsFake((uri: Uri) => {
        if (uri.fsPath.endsWith('.yaml') || uri.fsPath.endsWith('.yml')) {
          return Promise.reject(FileSystemError.FileNotFound());
        }
        return Promise.resolve(Buffer.from(JSON_CONTENT));
      });

      await onRightClickAndConvertJsonFile(uri);

      assert.strictEqual(showInformationMessageStub.callCount, 1);
      assert.strictEqual(mockFs.delete.callCount, 0);
      assert.strictEqual(mockFs.writeFile.callCount, 1);
    });

    test('prompts user when keepOriginalFiles is ask and user chooses not to keep', async () => {
      withConfig({ [ConfigId.KeepOriginalFiles]: 'ask' });
      showInformationMessageStub.resolves('Do not keep' as unknown);
      const uri = Uri.file('/fake/file.json');

      mockFs.readFile.callsFake((uri: Uri) => {
        if (uri.fsPath.endsWith('.yaml') || uri.fsPath.endsWith('.yml')) {
          return Promise.reject(FileSystemError.FileNotFound());
        }
        return Promise.resolve(Buffer.from(JSON_CONTENT));
      });

      await onRightClickAndConvertJsonFile(uri);

      // 2 calls: 1 for "keep original files?" prompt, 1 for reverter tooltip
      assert.strictEqual(showInformationMessageStub.callCount, 2);
      assert.strictEqual(mockFs.delete.callCount, 1);
      assert.strictEqual(mockFs.writeFile.callCount, 1);
    });
  });

  suite('onRightClickAndConvertYamlFile', () => {
    test('converts YAML file to JSON', async () => {
      withConfig({});
      const uri = Uri.file('/fake/file.yaml');

      mockFs.readFile.callsFake((uri: Uri) => {
        if (uri.fsPath.endsWith('.json')) {
          return Promise.reject(FileSystemError.FileNotFound());
        }
        return Promise.resolve(Buffer.from(YAML_CONTENT));
      });

      await onRightClickAndConvertYamlFile(uri);

      assert.strictEqual(mockFs.writeFile.callCount, 1);
      const [writtenUri, writtenContent] = mockFs.writeFile.firstCall.args as [Uri, Uint8Array];
      assert.ok(writtenUri.fsPath.endsWith('.json'), 'written file should have .json extension');
      assert.deepStrictEqual(JSON.parse(Buffer.from(writtenContent).toString()), {
        name: 'foo',
        value: 1,
      });
    });

    test('converts .yml file to JSON', async () => {
      withConfig({});
      const uri = Uri.file('/fake/file.yml');

      mockFs.readFile.callsFake((uri: Uri) => {
        if (uri.fsPath.endsWith('.json')) {
          return Promise.reject(FileSystemError.FileNotFound());
        }
        return Promise.resolve(Buffer.from(YAML_CONTENT));
      });

      await onRightClickAndConvertYamlFile(uri);

      assert.strictEqual(mockFs.writeFile.callCount, 1);
      const [writtenUri] = mockFs.writeFile.firstCall.args as [Uri, Uint8Array];
      assert.ok(writtenUri.fsPath.endsWith('.json'), 'written file should have .json extension');
    });

    test('uses active text editor when uri is not provided', async () => {
      withConfig({});
      const uri = Uri.file('/fake/active.yaml');
      const mockDocument = {
        uri: uri,
        getText: () => YAML_CONTENT,
      } as unknown as TextDocument;

      mockFs.readFile.callsFake((u: Uri) => {
        if (u.fsPath.endsWith('.json')) {
          return Promise.reject(FileSystemError.FileNotFound());
        }
        return Promise.resolve(Buffer.from(YAML_CONTENT));
      });

      (contextProvider.vscode.window as { activeTextEditor: TextEditor | undefined }).activeTextEditor = {
        document: mockDocument,
      } as TextEditor;

      await onRightClickAndConvertYamlFile(undefined as unknown as Uri);

      assert.strictEqual(mockFs.writeFile.callCount, 1);
    });

    test('throws error when no active text editor and no uri', async () => {
      withConfig({});

      try {
        await onRightClickAndConvertYamlFile(undefined as unknown as Uri);
        assert.fail('should have thrown an error');
      } catch (error) {
        if (!(error instanceof Error)) {
          assert.fail('expected error to be an Error');
        }
        assert.strictEqual(error.message, 'Failed to get active text editor');
      }
    });
  });

  suite('overwriteExistentFiles', () => {
    test('does not write when overwriteExistentFiles is not set', async () => {
      withConfig({});
      const uri = Uri.file('/fake/file.json');

      // Target .yaml exists; source .json has valid content
      mockFs.readFile.callsFake((u: Uri) => {
        if (u.fsPath.endsWith('.yaml') || u.fsPath.endsWith('.yml')) {
          return Promise.resolve(Buffer.from('existing yaml'));
        }
        return Promise.resolve(Buffer.from(JSON_CONTENT));
      });

      await onRightClickAndConvertJsonFile(uri);

      assert.strictEqual(mockFs.writeFile.callCount, 0);
      assert.strictEqual(showInformationMessageStub.callCount, 1);
    });

    test('overwrites without prompt when set to always', async () => {
      withConfig({ [ConfigId.OverwriteExistentFiles]: 'always' });
      const uri = Uri.file('/fake/file.json');

      // Target .yaml exists; source .json has valid content
      mockFs.readFile.callsFake((u: Uri) => {
        if (u.fsPath.endsWith('.yaml') || u.fsPath.endsWith('.yml')) {
          return Promise.resolve(Buffer.from('existing yaml'));
        }
        return Promise.resolve(Buffer.from(JSON_CONTENT));
      });

      await onRightClickAndConvertJsonFile(uri);

      assert.strictEqual(mockFs.writeFile.callCount, 1);
    });

    test('prompts and overwrites when set to ask and user confirms', async () => {
      withConfig({ [ConfigId.OverwriteExistentFiles]: 'ask' });
      showInformationMessageStub.resolves('Yes' as unknown);
      const uri = Uri.file('/fake/file.json');

      mockFs.readFile.callsFake((u: Uri) => {
        if (u.fsPath.endsWith('.yaml') || u.fsPath.endsWith('.yml')) {
          return Promise.resolve(Buffer.from('existing yaml'));
        }
        return Promise.resolve(Buffer.from(JSON_CONTENT));
      });

      await onRightClickAndConvertJsonFile(uri);

      // 2 calls: 1 for "overwrite?" prompt, 1 for reverter tooltip
      assert.strictEqual(showInformationMessageStub.callCount, 2);
      assert.strictEqual(mockFs.writeFile.callCount, 1);
    });

    test('prompts and skips when set to ask and user declines', async () => {
      withConfig({ [ConfigId.OverwriteExistentFiles]: 'ask' });
      showInformationMessageStub.resolves('No' as unknown);
      const uri = Uri.file('/fake/file.json');

      mockFs.readFile.callsFake((u: Uri) => {
        if (u.fsPath.endsWith('.yaml') || u.fsPath.endsWith('.yml')) {
          return Promise.resolve(Buffer.from('existing yaml'));
        }
        return Promise.resolve(Buffer.from(JSON_CONTENT));
      });

      await onRightClickAndConvertJsonFile(uri);

      assert.strictEqual(showInformationMessageStub.callCount, 1);
      assert.strictEqual(mockFs.writeFile.callCount, 0);
    });
  });

  suite('reverter tooltip', () => {
    test('shows reverter tooltip after conversion', async () => {
      withConfig({});
      const uri = Uri.file('/fake/file.json');

      mockFs.readFile.callsFake((uri: Uri) => {
        if (uri.fsPath.endsWith('.yaml') || uri.fsPath.endsWith('.yml')) {
          return Promise.reject(FileSystemError.FileNotFound());
        }
        return Promise.resolve(Buffer.from(JSON_CONTENT));
      });

      await onRightClickAndConvertJsonFile(uri);

      assert.strictEqual(showInformationMessageStub.callCount, 1);
      assert.ok(
        (showInformationMessageStub.firstCall.args[0] as string).includes('Revert'),
        'should show revert message',
      );
    });

    test('does not show reverter tooltip when keepOriginalFiles is always', async () => {
      withConfig({ [ConfigId.KeepOriginalFiles]: 'always' });
      const uri = Uri.file('/fake/file.json');

      mockFs.readFile.callsFake((uri: Uri) => {
        if (uri.fsPath.endsWith('.yaml') || uri.fsPath.endsWith('.yml')) {
          return Promise.reject(FileSystemError.FileNotFound());
        }
        return Promise.resolve(Buffer.from(JSON_CONTENT));
      });

      await onRightClickAndConvertJsonFile(uri);

      // keepOriginalFiles='always' means no prompt and no revert tooltip
      assert.strictEqual(showInformationMessageStub.callCount, 0);
    });
  });

  suite('error handling', () => {
    test('shows error message on invalid JSON content', async () => {
      withConfig({});
      const uri = Uri.file('/fake/file.json');

      mockFs.readFile.callsFake((uri: Uri) => {
        if (uri.fsPath.endsWith('.yaml') || uri.fsPath.endsWith('.yml')) {
          return Promise.reject(FileSystemError.FileNotFound());
        }
        return Promise.resolve(Buffer.from('{ bad json }'));
      });

      await onRightClickAndConvertJsonFile(uri);

      assert.strictEqual(showErrorMessageStub.callCount, 1);
      assert.strictEqual(mockFs.writeFile.callCount, 0);
    });

    test('shows error message on invalid YAML content', async () => {
      withConfig({});
      const uri = Uri.file('/fake/file.yaml');

      mockFs.readFile.callsFake((uri: Uri) => {
        if (uri.fsPath.endsWith('.json')) {
          return Promise.reject(FileSystemError.FileNotFound());
        }
        return Promise.resolve(Buffer.from('--- {unclosed'));
      });

      await onRightClickAndConvertYamlFile(uri);

      assert.strictEqual(showErrorMessageStub.callCount, 1);
      assert.strictEqual(mockFs.writeFile.callCount, 0);
    });
  });

  suite('custom fileExtensions config', () => {
    test('uses configured yaml extension when converting json to yaml', async () => {
      withConfig({ [ConfigId.FileExtensionsYaml]: '.yml' });
      const uri = Uri.file('/fake/file.json');

      mockFs.readFile.callsFake((uri: Uri) => {
        if (uri.fsPath.endsWith('.yml')) {
          return Promise.reject(FileSystemError.FileNotFound());
        }
        return Promise.resolve(Buffer.from(JSON_CONTENT));
      });

      await onRightClickAndConvertJsonFile(uri);

      assert.strictEqual(mockFs.writeFile.callCount, 1);
      const [writtenUri] = mockFs.writeFile.firstCall.args as [Uri, Uint8Array];
      assert.ok(writtenUri.fsPath.endsWith('.yml'), 'written file should use configured .yml extension');
    });

    test('uses configured json extension when converting yaml to json', async () => {
      withConfig({ [ConfigId.FileExtensionsJson]: '.json' });
      const uri = Uri.file('/fake/file.yaml');

      mockFs.readFile.callsFake((uri: Uri) => {
        if (uri.fsPath.endsWith('.json')) {
          return Promise.reject(FileSystemError.FileNotFound());
        }
        return Promise.resolve(Buffer.from(YAML_CONTENT));
      });

      await onRightClickAndConvertYamlFile(uri);

      assert.strictEqual(mockFs.writeFile.callCount, 1);
      const [writtenUri] = mockFs.writeFile.firstCall.args as [Uri, Uint8Array];
      assert.ok(writtenUri.fsPath.endsWith('.json'), 'written file should use configured .json extension');
    });
  });
});
