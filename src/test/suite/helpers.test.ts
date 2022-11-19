import * as assert from 'assert';

import { getJsonFromYaml, getYamlFromJson } from '../../helpers';
import { loadFixture, stripNewLines } from '../testHelpers';

suite('helpers', () => {
	suite('getYamlFromJson()', () => {
		test('should convert json to yaml', async () => {
			const [inputJson, expectedYaml] = await Promise.all([
				loadFixture('input.json'),
				loadFixture('expected.yaml'),
			]);

			const actualYaml = getYamlFromJson(inputJson);

			assert.deepStrictEqual(stripNewLines(actualYaml), stripNewLines(expectedYaml));
		});
	});

	suite('getJsonFromYaml', async () => {
		test('should convert yaml to json', async () => {
			const [yamlInput, expectedJson] = await Promise.all([
				loadFixture('input.yaml'),
				loadFixture('expected.json'),
			]);
	
			const actualJson = getJsonFromYaml(yamlInput);
	
			assert.deepStrictEqual(stripNewLines(actualJson), stripNewLines(expectedJson));
		});
	});
});