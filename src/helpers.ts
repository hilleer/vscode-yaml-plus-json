import * as YAML from 'yaml';

import { contextProvider } from './contextProvider';
import { ConfigId, Configs, getConfig } from './config';

const DEFAULT_ERROR_MESSAGE =
  'Something went wrong, please validate your file and try again or create an issue if the problem persist';

/**
 * prints errors to console and shows its error message to the user.
 */
export function showError(error: unknown) {
  console.error(error);

  const message = error instanceof Error ? error.message : DEFAULT_ERROR_MESSAGE;

  contextProvider.vscode.window.showErrorMessage(message);
}

export function getYamlFromJson(json: string): string {
  const indent = getConfig<Configs['yamlIndent']>(ConfigId.YamlIndent);
  const schema = getConfig<Configs['yamlSchema']>(ConfigId.YamlSchema);
  const lineWidth = getConfig<Configs['yamlLineWidth']>(ConfigId.YamlLineWidth);
  const options = getConfig<Configs['yamlOptions']>(ConfigId.YamlOptions) || {};
  const merge = getConfig<Configs['yamlMerge']>(ConfigId.YamlMerge) ?? true;

  try {
    const jsonObject: unknown = YAML.parse(json, { schema: 'json' });

    return YAML.stringify(jsonObject, {
      ...options, // do first so specific options take precedence
      ...(indent !== undefined && { indent }),
      ...(schema !== undefined && { schema }),
      ...(lineWidth !== undefined && { lineWidth }),
      merge,
    });
  } catch (error) {
    console.error(error);
    throw new Error('Failed to parse JSON. Please make sure it has a valid format and try again.', { cause: error });
  }
}

export function getJsonFromYaml(yaml: string): string {
  const schema = getConfig<Configs['yamlSchema']>(ConfigId.YamlSchema);
  const options = getConfig<Configs['jsonOptions']>(ConfigId.JsonOptions) || {};

  try {
    // parseAllDocuments supports multi-document YAML files using "---" separators.
    // YAML.parse() does not support multiple documents and throws an error if they are encountered.
    const docs = YAML.parseAllDocuments(yaml, {
      ...options, // do first so specific options take precedence
      merge: true,
      ...(schema && { schema }),
    });

    // parseAllDocuments never throws — errors are stored on each doc and must be re-thrown manually
    const errors = docs.flatMap((doc) => doc.errors);
    if (errors.length > 0) throw errors[0];

    // One document: return as is
    // multiple documents: return as JSON-array
    const values: unknown[] = docs.map((doc) => doc.toJS() as unknown);
    const json = values.length === 1 ? values[0] : values;

    return JSON.stringify(json, undefined, 2);
  } catch (error) {
    console.error(error);
    throw new Error('Failed to parse YAML. Please make sure it has a valid format and try again.', { cause: error });
  }
}
