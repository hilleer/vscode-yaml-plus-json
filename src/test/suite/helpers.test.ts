import * as assert from 'assert';
import * as sinon from 'sinon';

import { getJsonFromYaml, getYamlFromJson } from '../../helpers';
import { loadFixtures, stripNewLines } from '../testHelpers';
import { ConfigId } from '../../config';
import { mockWorkspaceGetConfigurationMethod } from '../testUtil';

type Test = {
  inputFilePath: string;
  expectedFilePath: string;
  description: string;
  /**
   * console.log output
   */
  debug?: boolean;
};

suite('helpers', () => {
  suite('getYamlFromJson()', () => {
    test('should convert json to yaml', async () => {
      const [inputJson, expectedYaml] = await loadFixtures('input.json', 'expected.yaml');

      const actualYaml = getYamlFromJson(inputJson);

      assert.deepStrictEqual(stripNewLines(actualYaml), stripNewLines(expectedYaml));
    });

    suite('when json lines are long and line width is not limited', () => {
      let vscodeWorkspaceStub: sinon.SinonStub;
      suiteSetup(
        () =>
          (vscodeWorkspaceStub = mockWorkspaceGetConfigurationMethod({
            [ConfigId.YamlLineWidth]: 0,
          })),
      );

      suiteTeardown(() => vscodeWorkspaceStub.restore());

      test('should convert json to yaml without line breaks', async () => {
        const [inputJson, expectedYaml] = await loadFixtures('longLinesInput.json', 'longLinesExpectedUnlimited.yaml');

        const actualYaml = getYamlFromJson(inputJson);

        assert.deepStrictEqual(stripNewLines(actualYaml), stripNewLines(expectedYaml));
      });
    });

    suite('when json lines are long and line width is limited', () => {
      let vscodeWorkspaceStub: sinon.SinonStub;
      suiteSetup(
        () =>
          (vscodeWorkspaceStub = mockWorkspaceGetConfigurationMethod({
            [ConfigId.YamlLineWidth]: 100,
          })),
      );

      suiteTeardown(() => vscodeWorkspaceStub.restore());

      test('should convert json to yaml and apply line breaks', async () => {
        const [inputJson, expectedYaml] = await loadFixtures('longLinesInput.json', 'longLinesExpectedLimited.yaml');

        const actualYaml = getYamlFromJson(inputJson);

        assert.deepStrictEqual(stripNewLines(actualYaml), stripNewLines(expectedYaml));
      });
    });
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
