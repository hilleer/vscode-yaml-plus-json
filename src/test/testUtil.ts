import * as Sinon from 'sinon';
import { Uri, FileSystemError, FileType, Position, Range, WorkspaceEdit, Selection, workspace } from 'vscode';
import type { TextEditor, WorkspaceConfiguration } from 'vscode';
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
  readDirectory?: Sinon.SinonStub;
};

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
