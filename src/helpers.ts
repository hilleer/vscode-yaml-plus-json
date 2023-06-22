import * as vscode from 'vscode';
import * as YAML from 'yaml';

import { ConfigId, Configs, getConfig } from './config';
import { getConventionFunction, changeObjectKeys } from './conventions';

const DEFAULT_ERROR_MESSAGE = 'Something went wrong, please validate your file and try again or create an issue if the problem persist';

/**
 * prints errors to console and shows its error message to the user.
 */
export function showError(error: any) {
	console.error(error);

	const message = error.message || DEFAULT_ERROR_MESSAGE;
	vscode.window.showErrorMessage(message);
}

export function getYamlFromJson(json: string): string {
	const indent = getConfig<Configs['YamlIndent']>(ConfigId.YamlIndent);
	const schema = getConfig<Configs['YamlSchema']>(ConfigId.YamlSchema);
	const convention = getConfig<Configs['EnforceNamingConvention']>(ConfigId.EnforceNamingConventionYaml);
	
	try {
		let jsonObject = JSON.parse(json);

		if(convention !== undefined) {
			let cFunc = getConventionFunction(convention!);
			jsonObject = changeObjectKeys(jsonObject, cFunc);
		}
		
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
	const convention = getConfig<Configs['EnforceNamingConvention']>(ConfigId.EnforceNamingConventionJson);
	
	try {
		let json = YAML.parse(yaml, {
			merge: true,
			...(schema && { schema })
		});

		if(convention !== undefined) {
			let cFunc = getConventionFunction(convention!);
			json = changeObjectKeys(json, cFunc);
		}

		return JSON.stringify(json, undefined, 2);
	} catch (error) {
		console.error(error);
		throw new Error('Failed to parse JSON. Please make sure it has a valid format and try again.');
	}
}


