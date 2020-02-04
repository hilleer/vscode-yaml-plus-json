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
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const YAML = require("yaml");
const fs_1 = require("fs");
const util_1 = require("util");
const readFileAsync = util_1.promisify(fs_1.readFile);
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
    console.log('Congratulations, your extension "yaml-plus-json" is now active!');
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
        // const wasYml = oldPath.endsWith('.yml') || oldPath.endsWith('.yaml');
        // const isJson = newPath.endsWith('json');
        // if (wasYml && isJson) {
        // 	convertYmlToJson(newUri);
        // }
    });
}
function convertJsonToYml(uri) {
    return __awaiter(this, void 0, void 0, function* () {
        const json = yield readFileAsync(uri.path, 'utf8');
        const yml = YAML.stringify(JSON.parse(json));
        yield replace(uri, yml);
    });
}
function convertYmlToJson(uri) {
    return __awaiter(this, void 0, void 0, function* () {
        const yml = yield readFileAsync(uri.path, 'utf8');
        const json = YAML.parse(yml);
        yield replace(uri, json);
    });
}
function replace(uri, newText) {
    return __awaiter(this, void 0, void 0, function* () {
        const document = yield vscode.workspace.openTextDocument(uri);
        const lastLine = document.lineCount;
        const range = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(lastLine, Number.MAX_VALUE));
        const edit = new vscode.WorkspaceEdit();
        edit.replace(uri, range, newText);
        yield vscode.workspace.applyEdit(edit);
    });
}
//# sourceMappingURL=extension.js.map