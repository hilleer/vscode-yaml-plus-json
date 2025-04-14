import * as assert from 'assert';
import * as sinon from 'sinon';

import { getJsonFromYaml, getYamlFromJson } from '../../helpers';
import { loadFixtures, stripNewLines } from '../testHelpers';
import { ConfigId } from '../../config';
import { mockWorkspaceGetConfigurationMethod } from '../testUtil';

suite('helpers', () => {
	suite('getYamlFromJson()', () => {
		test('should convert json to yaml', async () => {
			const [inputJson, expectedYaml] = await loadFixtures('input.json', 'expected.yaml');

			const actualYaml = getYamlFromJson(inputJson);

			assert.deepStrictEqual(stripNewLines(actualYaml), stripNewLines(expectedYaml));
		});

		suite('when json lines are long and line width is not limited', () => {
			let vscodeWorkspaceStub: sinon.SinonStub;
			suiteSetup(() => vscodeWorkspaceStub = mockWorkspaceGetConfigurationMethod({
				[ConfigId.YamlLineWidth]: 0,
			}));

			suiteTeardown(() => vscodeWorkspaceStub.restore());

			test('should convert json to yaml without line breaks', async () => {
				const [inputJson, expectedYaml] = await loadFixtures('longLinesInput.json', 'longLinesExpectedUnlimited.yaml');

				const actualYaml = getYamlFromJson(inputJson);

				assert.deepStrictEqual(stripNewLines(actualYaml), stripNewLines(expectedYaml));
			});
		});

		suite('when json lines are long and line width is limited', () => {
			let vscodeWorkspaceStub: sinon.SinonStub;
			suiteSetup(() => vscodeWorkspaceStub = mockWorkspaceGetConfigurationMethod({
				[ConfigId.YamlLineWidth]: 100,
			}))

			suiteTeardown(() => vscodeWorkspaceStub.restore());

			test('should convert json to yaml and apply line breaks', async () => {
				const [inputJson, expectedYaml] = await loadFixtures('longLinesInput.json', 'longLinesExpectedLimited.yaml');

				const actualYaml = getYamlFromJson(inputJson);

				assert.deepStrictEqual(stripNewLines(actualYaml), stripNewLines(expectedYaml));
			});
		});
	});

	suite('getJsonFromYaml', async () => {
		test('should convert yaml to json', async () => {
			const [yamlInput, expectedJson] = await loadFixtures('input.yaml', 'expected.json');

			const actualJson = getJsonFromYaml(yamlInput);

			assert.deepStrictEqual(stripNewLines(actualJson), stripNewLines(expectedJson));
		});

		test('should convert json to yaml with merge tags', async () => {
			const [yamlInput, expectedJson] = await loadFixtures('inputMergeTag.yaml', 'expectedMergeTag.json');

			const actualJson = getJsonFromYaml(yamlInput);

			assert.deepStrictEqual(stripNewLines(actualJson), stripNewLines(expectedJson));
		});
	});
});
