import * as Sinon from 'sinon';
import { Uri, FileSystemError, FileType, Position, Range, WorkspaceEdit, Selection, workspace } from 'vscode';
import type { TextDocument, TextEditor, WorkspaceConfiguration } from 'vscode';
import { ConfigId, Configs } from '../config';

type ConfigInput = Partial<Configs>;

export class WorkspaceConfigurationMock {
  private stub: Sinon.SinonStub;

  constructor(configMock: ConfigInput = {}) {
    this.stub = Sinon.stub(workspace, 'getConfiguration');

    this.stub.returns({
      get: (configKey: ConfigId) => configMock[configKey],
    } as WorkspaceConfiguration);
  }

  restore() {
    this.stub.restore();
  }
}

export type MockFs = {
  readFile: Sinon.SinonStub;
  writeFile: Sinon.SinonStub;
  delete: Sinon.SinonStub;
  stat: Sinon.SinonStub;
  readDirectory: Sinon.SinonStub;
};

export function createMockFs(fileType = FileType.File): MockFs {
  return {
    readFile: Sinon.stub().rejects(FileSystemError.FileNotFound()),
    writeFile: Sinon.stub().resolves(),
    delete: Sinon.stub().resolves(),
    stat: Sinon.stub().resolves({
      type: fileType,
      ctime: Date.now(),
      mtime: Date.now(),
      size: 100,
    }),
    readDirectory: Sinon.stub().resolves([]),
  };
}

export function createMockEditor(
  text: string,
  selection: Selection,
  options: { selectedText?: string } = {},
): TextEditor {
  const document = {
    getText: (range?: Range) => {
      if (!range) return text;
      if (options.selectedText !== undefined) return options.selectedText;
      if (range.start.line === range.end.line && range.start.character === range.end.character) return '';
      return text;
    },
    uri: Uri.file('/fake/file'),
  } as unknown as TextDocument;

  return {
    document,
    selection,
    edit: Sinon.stub().resolves(true),
  } as unknown as TextEditor;
}

export function createMockDocument(
  options: {
    text?: string;
    fsPath?: string;
    languageId?: string;
    isDirty?: boolean;
  } = {},
): TextDocument {
  const { text = '', fsPath = '/fake/file', languageId = 'plaintext', isDirty = false } = options;
  return {
    getText: () => text,
    uri: Uri.file(fsPath),
    languageId,
    lineCount: text.split('\n').length,
    isDirty,
    save: Sinon.stub().resolves(true),
  } as unknown as TextDocument;
}

export type MockVscodeOptions = {
  fs?: MockFs;
  window?: {
    showInformationMessage?: Sinon.SinonStub;
    showErrorMessage?: Sinon.SinonStub;
    activeTextEditor?: TextEditor | undefined;
  };
  workspace?: {
    openTextDocument?: Sinon.SinonStub;
    applyEdit?: Sinon.SinonStub;
  };
};

/**
 * Creates a mock vscode module for use with contextProvider in tests.
 * Pass in stubs you want to track for assertions.
 * Constants like Uri, FileSystemError, FileType etc. are taken from the real vscode.
 */
export function createMockVscode(options: MockVscodeOptions = {}): typeof import('vscode') {
  return {
    workspace: {
      fs: options.fs ?? {},
      openTextDocument: options.workspace?.openTextDocument,
      applyEdit: options.workspace?.applyEdit,
    },
    window: {
      showInformationMessage: options.window?.showInformationMessage,
      showErrorMessage: options.window?.showErrorMessage,
      activeTextEditor: options.window?.activeTextEditor,
    },
    Uri,
    FileSystemError,
    FileType,
    Position,
    Range,
    WorkspaceEdit,
    Selection,
  } as unknown as typeof import('vscode');
}
