import * as Sinon from 'sinon';
import * as vscode from 'vscode';
import { ConfigId, Configs } from '../config';

type ConfigInput = Partial<Configs>;

export class WorkspaceConfigurationMock {
  private stub: Sinon.SinonStub;

  constructor(configMock: ConfigInput = {}) {
    this.stub = Sinon.stub(vscode.workspace, 'getConfiguration');

    this.stub.returns({
      get: (configKey: ConfigId) => configMock[configKey],
    } as vscode.WorkspaceConfiguration);
  }

  restore() {
    this.stub.restore();
  }
}
