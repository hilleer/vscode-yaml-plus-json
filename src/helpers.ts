import * as vscode from 'vscode';
import * as YAML from 'yaml';

import { ConfigId, getConfig } from './config';

const DEFAULT_ERROR_MESSAGE = 'Something went wrong, please validate your file and try again or create an issue if the problem persist';

/**
 * prints errors to console and shows its error message to the user.
 */
export function showError(error: any) {
	console.error(error);

	const message = error.message || DEFAULT_ERROR_MESSAGE;
	vscode.window.showErrorMessage(message);
}

type YamlSchema = YAML.Options['schema'];

export function getYamlFromJson(json: string): string {
	const indent = getConfig<number>(ConfigId.YamlIndent);
	const schema = getConfig<YamlSchema>(ConfigId.YamlSchema);

	const options: YAML.Options = {
		...(indent && { indent }),
		...(schema && { schema })
	};

	try {
		return YAML.stringify(JSON.parse(json), options);
	} catch (error) {
		console.error(error);
		throw new Error('Failed to parse YAML. Please make sure it has a valid format and try again.');
	}
}

export function getJsonFromYaml(yaml: string): string {
	try {
		const json = YAML.parse(yaml, {});
		return JSON.stringify(json, undefined, 2);
	} catch (error) {
		console.error(error);
		throw new Error('Failed to parse JSON. Please make sure it has a valid format and try again.');
	}
}