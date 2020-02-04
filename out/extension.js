"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const YAML = require("yaml");
const fs_1 = require("fs");
const util_1 = require("util");
const readFileAsync = util_1.promisify(fs_1.readFile);
function activate(context) {
    vscode.workspace.onDidRenameFiles(onRename);
}
exports.activate = activate;
// this method is called when your extension is deactivated
function deactivate() { }
exports.deactivate = deactivate;
function onRename(e) {
    e.files.forEach((change) => {
        const { oldUri, newUri } = change;
        const oldPath = oldUri.path;
        const newPath = newUri.path;
        const wasJson = oldPath.endsWith('.json');
        const isYml = newPath.endsWith('.yml') || newPath.endsWith('.yaml');
        if (wasJson && isYml) {
            convertJsonToYml(newUri);
        }
        const wasYml = oldPath.endsWith('.yml') || oldPath.endsWith('.yaml');
        const isJson = newPath.endsWith('json');
        if (wasYml && isJson) {
            convertYmlToJson(newUri);
        }
    });
}
function convertJsonToYml(uri) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const json = yield readFileAsync(uri.path, 'utf8');
            const jsonString = JSON.parse(json);
            const yml = YAML.stringify(jsonString);
            yield replace(uri, yml);
        }
        catch (error) {
            console.error(error);
            vscode.window.showErrorMessage('Something went wrong, please try again. Please create an issue if the problem persist');
        }
    });
}
function convertYmlToJson(uri) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const yml = yield readFileAsync(uri.path, 'utf8');
            const json = YAML.parse(yml);
            const jsonString = JSON.stringify(json, undefined, 2);
            yield replace(uri, jsonString);
        }
        catch (error) {
            console.error(error);
            vscode.window.showErrorMessage('Something went wrong, please try again. Please create an issue if the problem persist');
        }
    });
}
function replace(uri, newText) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const document = yield vscode.workspace.openTextDocument(uri);
            const lastLine = document.lineCount;
            const range = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(lastLine, Number.MAX_VALUE));
            const edit = new vscode.WorkspaceEdit();
            edit.replace(uri, range, newText);
            yield vscode.workspace.applyEdit(edit);
        }
        catch (error) {
            vscode.window.showErrorMessage('Something went wrong, please try again. Please create an issue if the problem persist');
        }
    });
}
//# sourceMappingURL=extension.js.map