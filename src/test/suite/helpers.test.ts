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
   * console.log output
   */
  debug?: boolean;
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

        test('should return expected yaml', async () => {
          const [input, expected] = await loadFixtures(t.inputFilePath, t.expectedFilePath);

          const actual = getYamlFromJson(input);

          if (t.debug) {
            console.log('actual value:', actual);
          }

          assert.deepStrictEqual(stripNewLines(actual), stripNewLines(expected));
        });
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

    TESTS.forEach(({ inputFilePath, expectedFilePath, description, debug }) => {
      test(description, async () => {
        const [yamlInput, expectedJson] = await loadFixtures(inputFilePath, expectedFilePath);

        const actualJson = getJsonFromYaml(yamlInput);

        if (debug) {
          console.log('actualJson', actualJson);
        }

        assert.deepStrictEqual(stripNewLines(actualJson), stripNewLines(expectedJson));
      });
    });
  });
});
