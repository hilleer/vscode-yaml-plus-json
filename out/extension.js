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
const jsonToYaml = require('json-to-pretty-yaml');
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
        const jsonPath = oldUri.path;
        const ymlPath = newUri.path;
        const wasJson = jsonPath.endsWith('.json');
        const isYml = ymlPath.endsWith('.yml');
        if (wasJson && isYml) {
            convertJsonToYml(newUri);
        }
        console.log('was json', wasJson);
        console.log('isyml', isYml);
    });
}
function convertJsonToYml(uri) {
    return __awaiter(this, void 0, void 0, function* () {
        const json = yield readFileAsync(uri.path, 'utf8');
        const yml = jsonToYaml.stringify(json);
        console.log('file content', json);
        console.log('yml', yml);
        const edit = {};
        vscode.workspace.applyEdit({ replace: (uri, new vscode.Range(new vscode.Position(0, 0), new vscode.Position(9999, 9999)), yml) });
    });
}
// JSON --> yml
//# sourceMappingURL=extension.js.map