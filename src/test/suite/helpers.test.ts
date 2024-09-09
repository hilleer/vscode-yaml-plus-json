import * as assert from 'assert';
import * as sinon from 'sinon';;
import * as vscode from 'vscode';

import { getJsonFromYaml, getYamlFromJson } from '../../helpers';
import { loadFixture, stripNewLines } from '../testHelpers';
import { ConfigId } from '../../config';

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

		suite('when json lines are long and line width is not limited', () => {
			let vscodeWorkspaceStub: sinon.SinonStub;
			suiteSetup(() => vscodeWorkspaceStub = createLongLinesConfigStub(0));

			suiteTeardown(() => vscodeWorkspaceStub.restore());

			test('should convert json to yaml without line breaks', async () => {
				const [inputJson, expectedYaml] = await Promise.all([
					loadFixture('longLinesInput.json'),
					loadFixture('longLinesExpectedUnlimited.yaml'),
				]);

				const actualYaml = getYamlFromJson(inputJson);

				assert.deepStrictEqual(stripNewLines(actualYaml), stripNewLines(expectedYaml));
			});
		});

		suite('when json lines are long and line width is limited', () => {
			let vscodeWorkspaceStub: sinon.SinonStub;
			suiteSetup(() => vscodeWorkspaceStub = createLongLinesConfigStub(100));

			suiteTeardown(() => vscodeWorkspaceStub.restore());

			test('should convert json to yaml and apply line breaks', async () => {
				const [inputJson, expectedYaml] = await Promise.all([
					loadFixture('longLinesInput.json'),
					loadFixture('longLinesExpectedLimited.yaml'),
				]);

				const actualYaml = getYamlFromJson(inputJson);

				assert.deepStrictEqual(actualYaml, expectedYaml);
			});
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

		test('should convert json to yaml with merge tags', async () => {
			const [yamlInput, expectedJson] = await Promise.all([
				loadFixture('inputMergeTag.yaml'),
				loadFixture('expectedMergeTag.json'),
			]);

			const actualJson = getJsonFromYaml(yamlInput);

			assert.deepStrictEqual(stripNewLines(actualJson), stripNewLines(expectedJson));
		});
	});
});

function createLongLinesConfigStub(lineWidth: number) {
	const stub = sinon.stub(vscode.workspace, 'getConfiguration');

	const configMock = {
		[ConfigId.YamlLineWidth]: lineWidth,
	};

	stub.returns({
		get: (configKey: ConfigId.YamlLineWidth) => configMock[configKey],
	} as vscode.WorkspaceConfiguration);

	return stub
}
