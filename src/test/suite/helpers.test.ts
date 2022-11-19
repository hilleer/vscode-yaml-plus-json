import * as assert from 'assert';
import { promises as fs } from 'fs';
import * as path from 'path';

import { getJsonFromYaml, getYamlFromJson } from '../../helpers';

// __dirname points to compiled file in "out/" folder
const fixturesRoot = path.join(__dirname, '..', '..', '..', 'src', 'test', 'fixtures');

const readFixture = async (fileName: string) => fs.readFile(path.join(fixturesRoot, fileName), 'utf-8');

suite('helpers', () => {
	suite('getYamlFromJson()', () => {
		test('should convert json to yaml', async () => {
			const [inputJson, expectedYaml] = await Promise.all([
				readFixture('input.json'),
				readFixture('expected.yaml'),
			]);

			const actualYaml = getYamlFromJson(inputJson);

			assert.deepStrictEqual(actualYaml, expectedYaml);
		});
	});

	suite('getJsonFromYaml', async () => {
		test('should convert yaml to json', async () => {
			const [yamlInput, expectedJson] = await Promise.all([
				readFixture('input.yaml'),
				readFixture('expected.json'),
			]);
	
			const actualJson = getJsonFromYaml(yamlInput);
	
			assert.deepStrictEqual(actualJson, expectedJson);
		});
	});
});