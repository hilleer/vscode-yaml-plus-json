import * as assert from 'assert';
import * as Sinon from 'sinon';

import { ConfigId, getConfig } from '../../config';
import { WorkspaceConfigurationMock } from '../testUtil';

suite('config', () => {
  let configMock: WorkspaceConfigurationMock | undefined;

  teardown(() => {
    configMock?.restore();
    configMock = undefined;
    Sinon.restore();
  });

  suite('directoryConversion', () => {
    test('returns true when directoryConversion is set to true', () => {
      configMock = new WorkspaceConfigurationMock({ [ConfigId.DirectoryConversion]: true });
      assert.strictEqual(getConfig<boolean>(ConfigId.DirectoryConversion), true);
    });

    test('returns false when directoryConversion is set to false', () => {
      configMock = new WorkspaceConfigurationMock({ [ConfigId.DirectoryConversion]: false });
      assert.strictEqual(getConfig<boolean>(ConfigId.DirectoryConversion), false);
    });

    test('returns undefined when not present in config mock (real VS Code returns default true)', () => {
      configMock = new WorkspaceConfigurationMock({});
      assert.strictEqual(getConfig<boolean>(ConfigId.DirectoryConversion), undefined);
    });
  });
});
