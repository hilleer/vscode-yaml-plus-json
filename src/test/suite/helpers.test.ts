import * as assert from 'assert';

import { getJsonFromYaml, getYamlFromJson } from '../../helpers';
import { loadFixture, loadFixtures, stripNewLines } from '../testHelpers';
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
        description: 'should convert json with trailing commas to yaml',
        inputFilePath: 'trailingCommaInput.json',
        expectedFilePath: 'trailingCommaExpected.yaml',
      },
      {
        description: 'should convert complex json with trailing commas at multiple levels to yaml',
        inputFilePath: 'trailingCommaComplexInput.json',
        expectedFilePath: 'trailingCommaComplexExpected.yaml',
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
      {
        description: 'should convert a json array to a yaml sequence',
        inputFilePath: 'jsonArrayInput.json',
        expectedFilePath: 'jsonArrayExpected.yaml',
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

    suite('error handling', () => {
      let workspaceConfigMock: WorkspaceConfigurationMock;
      suiteSetup(() => (workspaceConfigMock = new WorkspaceConfigurationMock()));
      suiteTeardown(() => workspaceConfigMock.restore());

      test('should throw an error with correct message when given invalid json', async () => {
        const invalidJson = await loadFixture('input.yaml'); // YAML is not valid JSON flow syntax
        assert.throws(
          () => getYamlFromJson(invalidJson),
          (err: Error) => {
            assert.ok(err instanceof Error);
            assert.strictEqual(
              err.message,
              'Failed to parse JSON. Please make sure it has a valid format and try again.',
            );
            assert.ok(err.cause instanceof Error, 'error should have a cause');
            return true;
          },
        );
      });
    });
  });

  suite('getJsonFromYaml', () => {
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
      {
        inputFilePath: 'multiDocumentInput.yaml',
        expectedFilePath: 'multiDocumentExpected.json',
        description: 'should convert multi-document yaml (--- separator) to a json array',
      },
    ];

    TESTS.forEach((t) => {
      suite(t.description, () => {
        test('should return expected json', () => assertTest(t, getJsonFromYaml));
      });
    });

    suite('error handling', () => {
      test('should throw an error with correct message when given invalid yaml', () => {
        const invalidYaml = 'key: [unclosed bracket';
        assert.throws(
          () => getJsonFromYaml(invalidYaml),
          (err: Error) => {
            assert.ok(err instanceof Error);
            assert.strictEqual(
              err.message,
              'Failed to parse YAML. Please make sure it has a valid format and try again.',
            );
            assert.ok(err.cause instanceof Error, 'error should have a cause');
            return true;
          },
        );
      });
    });
  });
});

async function assertTest(t: Test, converter: (input: string) => string) {
  const [yaml, expected] = await loadFixtures(t.inputFilePath, t.expectedFilePath);

  const actual = converter(yaml);

  assert.deepStrictEqual(stripNewLines(actual), stripNewLines(expected));
}
