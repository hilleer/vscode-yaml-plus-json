import * as assert from 'assert';

import { getJsonFromYaml, getYamlFromJson } from '../../helpers';
import { loadFixtures, stripNewLines } from '../testHelpers';
import { ConfigId, Configs } from '../../config';
import { WorkspaceConfigurationMock } from '../testUtil';

type Test = {
  inputFilePath: string;
  expectedFilePath: string;
  description: string;
  /**
   * enable mocking of vscode.workspace.getConfiguration
   */
  configMock?: Partial<Configs>;
};

suite('helpers', () => {
  suite('getYamlFromJson()', () => {
    const tests: Test[] = [
      {
        description: 'should convert json to yaml',
        inputFilePath: 'input.json',
        expectedFilePath: 'expected.yaml',
      },
      {
        description: 'when json lines are long and line width is not limited',
        inputFilePath: 'longLinesInput.json',
        expectedFilePath: 'longLinesExpectedUnlimited.yaml',
        configMock: {
          [ConfigId.YamlLineWidth]: 0, // 0 means unlimited
        },
      },
      {
        description: 'when json lines are long and line width is limited',
        inputFilePath: 'longLinesInput.json',
        expectedFilePath: 'longLinesExpectedLimited.yaml',
        configMock: {
          [ConfigId.YamlLineWidth]: 100,
        },
      },
    ];

    for (const t of tests) {
      suite(t.description, () => {
        let workspaceConfigMock: WorkspaceConfigurationMock;
        suiteSetup(() => (workspaceConfigMock = new WorkspaceConfigurationMock(t.configMock)));

        suiteTeardown(() => workspaceConfigMock.restore());

        test('should return expected yaml', async () => assertTest(t, getYamlFromJson));
      });
    }
  });

  suite('getJsonFromYaml', async () => {
    const TESTS: Test[] = [
      {
        inputFilePath: 'input.yaml',
        expectedFilePath: 'expected.json',
        description: 'should convert basic yaml to json',
      },
      {
        inputFilePath: 'mergeTagInput.yaml',
        expectedFilePath: 'mergeTagExpected.json',
        description: 'should convert yaml with merge tags to json',
      },
    ];

    TESTS.forEach((t) => {
      suite(t.description, () => {
        test('should return expected json', () => assertTest(t, getJsonFromYaml));
      });
    });
  });
});

async function assertTest(t: Test, converter: (input: string) => string) {
  const [yaml, expected] = await loadFixtures(t.inputFilePath, t.expectedFilePath);

  const actual = converter(yaml);

  assert.deepStrictEqual(stripNewLines(actual), stripNewLines(expected));
}
