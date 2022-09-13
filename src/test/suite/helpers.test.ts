import * as assert from 'assert';
import { promises as fs } from 'fs';
import * as path from 'path';
import { getJsonFromYaml } from '../../helpers';

const fixturesRoot = path.join(__dirname, '..', '..', '..', 'src', 'test', 'fixtures');

console.log('dirname::', __dirname);	
console.log('fixtures root', fixturesRoot);

suite('helpers', () => {
	suite('getYamlFromJson()', () => {
		test('should convert yaml to json', async () => {
			// const [input, expected] = await Promise.all([
			// 	fs.readFile(path.join(fixturesRoot, 'input.yaml'), 'utf-8'),
			// 	fs.readFile(path.join(fixturesRoot, 'expected.json'), 'utf-8'),
			// ]);

			// const actual = getYamlFromJson()

			// console.log('input:::', input);
			// console.log('expected', expected);
		});
	});

	suite('getJsonFromYaml', async () => {
		const [yamlInput, expected] = await Promise.all([
			fs.readFile(path.join(fixturesRoot, 'input.yaml'), 'utf-8'),
			fs.readFile(path.join(fixturesRoot, 'expected.json'), 'utf-8'),
		]);

		const actual = getJsonFromYaml(yamlInput);

		assert.deepStrictEqual(actual, expected);
	});
});