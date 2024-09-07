import * as vscode from 'vscode';
import * as YAML from 'yaml';

import { ConfigId, Configs, getConfig } from './config';

const DEFAULT_ERROR_MESSAGE = 'Something went wrong, please validate your file and try again or create an issue if the problem persist';

/**
 * prints errors to console and shows its error message to the user.
 */
export function showError(error: unknown) {
	console.error(error);

	const message = error instanceof Error ? error.message : DEFAULT_ERROR_MESSAGE;

	vscode.window.showErrorMessage(message);
}

export function getYamlFromJson(json: string): string {
	const indent = getConfig<Configs['YamlIndent']>(ConfigId.YamlIndent);
	const schema = getConfig<Configs['YamlSchema']>(ConfigId.YamlSchema);

	try {
		const jsonObject = JSON.parse(json);

		return YAML.stringify(jsonObject, {
			...(indent && { indent }),
			...(schema && { schema }),
			merge: true
		});
	} catch (error) {
		console.error(error);
		throw new Error('Failed to parse YAML. Please make sure it has a valid format and try again.');
	}
}

export function getJsonFromYaml(yaml: string): string {
	const schema = getConfig<Configs['YamlSchema']>(ConfigId.YamlSchema);

	try {
		const json = YAML.parse(yaml, {
			merge: true,
			...(schema && { schema })
		});

		return JSON.stringify(json, undefined, 2);
	} catch (error) {
		console.error(error);
		throw new Error('Failed to parse JSON. Please make sure it has a valid format and try again.');
	}
}
