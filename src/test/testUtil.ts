import * as Sinon from 'sinon';
import * as vscode from 'vscode';
import { ConfigId, Configs } from '../config';

type ConfigInput = Partial<Configs>;

export function mockWorkspaceGetConfigurationMethod(configMock: ConfigInput) {
  const stub = Sinon.stub(vscode.workspace, 'getConfiguration');

  stub.returns({
    get: (configKey: ConfigId) => configMock[configKey],
  } as vscode.WorkspaceConfiguration);

  return stub;
}
