type Vscode = typeof import('vscode');

/**
 * Singleton class to provide access to the vscode API across the extension without needing to import it in every file.
 * This is an attempt to simplify testing/mocking, while avoiding the need to pass the vscode API through multiple layers of function calls.
 */
class ContextProvider {
  private static instance: ContextProvider;
  private _vscode: Vscode | null = null;

  private constructor() {}

  public static getInstance(): ContextProvider {
    if (!ContextProvider.instance) {
      ContextProvider.instance = new ContextProvider();
    }
    return ContextProvider.instance;
  }

  public setVscode(vscode: Vscode): void {
    this._vscode = vscode;
  }

  public get vscode(): Vscode {
    if (!this._vscode) throw new Error('ContextProvider: vscode not initialized');
    return this._vscode;
  }

  // For test teardown
  public reset(): void {
    this._vscode = null;
  }
}

export const contextProvider = ContextProvider.getInstance();
