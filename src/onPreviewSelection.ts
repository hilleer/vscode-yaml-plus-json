import * as vscode from 'vscode';

import { ConvertFromType } from './converter';

export function onPreviewSelection(fromType: ConvertFromType) {
	console.log('preview selection handler, from type:', fromType);

	return async (args: any) => {
		console.log('args:::', args);
		try {
			const editor = vscode.window.activeTextEditor;
			if (!editor) {
				throw new Error('editor not found');
			}

			const { selection, document } = editor;
			const text = document.getText(selection);

			const newDocument = await vscode.workspace.openTextDocument({
				content: 'fake',
				language: getTextDocumentLanguage(fromType)
			});

			await vscode.window.showTextDocument(newDocument);
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