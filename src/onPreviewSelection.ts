import * as vscode from 'vscode';

import { ConvertFromType } from './converter';
import { getSelectionConverter } from './onConvertSelection';

export function onPreviewSelection(fromType: ConvertFromType) {
	console.log('preview selection handler, from type:', fromType);
	const converter = getSelectionConverter(fromType);

	return async (args: any) => {
		console.log('args:::', args);
		try {
			const editor = vscode.window.activeTextEditor;
			if (!editor) {
				throw new Error('editor not found');
			}

			const { selection, document } = editor;
			const text = document.getText(selection);

			const previewText = converter(text);

			const previewDocument = await vscode.workspace.openTextDocument({
				content: previewText,
				language: getTextDocumentLanguage(fromType)
			});

			await vscode.window.showTextDocument(previewDocument);
		} catch (error) {
			console.log('error:::', error);
		}
	};
}

function getTextDocumentLanguage(fromType: ConvertFromType) {
	return {
		[ConvertFromType.Json]: 'yaml',
		[ConvertFromType.Yaml]: 'json'
	}[fromType];
}