import { contextProvider } from './contextProvider';
import { getYamlFromJson, getJsonFromYaml } from './helpers';

type Direction = 'json-to-yaml' | 'yaml-to-json';

let panel: import('vscode').WebviewPanel | undefined;

/** Generates a random one-time token for the CSP header and matching script/style tags,
 * so the browser only executes inline content from this render — not anything injected by a third party. */
function generateNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function detectDirection(input: string): Direction {
  const trimmed = input.trimStart();
  return trimmed.startsWith('{') || trimmed.startsWith('[') ? 'json-to-yaml' : 'yaml-to-json';
}

function getEditorContent(editor: import('vscode').TextEditor): { input: string; direction: Direction } | null {
  const langId = editor.document.languageId;
  if (langId === 'json' || langId === 'jsonc') {
    return { input: editor.document.getText(), direction: 'json-to-yaml' };
  }
  if (langId === 'yaml') {
    return { input: editor.document.getText(), direction: 'yaml-to-json' };
  }
  const text = editor.document.getText();
  if (text) {
    return { input: text, direction: detectDirection(text) };
  }
  return null;
}

export function onInteractiveConverter(): void {
  const vscode = contextProvider.vscode;

  // Read editor before reveal() so we capture it while the file is still focused
  const editorContent = vscode.window.activeTextEditor ? getEditorContent(vscode.window.activeTextEditor) : null;

  if (panel) {
    panel.reveal();
    if (editorContent) {
      panel.webview.postMessage({ type: 'init', input: editorContent.input, direction: editorContent.direction });
    }
    return;
  }

  const initialInput = editorContent?.input ?? '';
  const initialDirection: Direction = editorContent?.direction ?? 'json-to-yaml';

  panel = vscode.window.createWebviewPanel('yamlPlusJsonConverter', 'YAML ↔ JSON Converter', vscode.ViewColumn.Beside, {
    enableScripts: true,
    retainContextWhenHidden: true,
  });

  panel.webview.html = getWebviewHtml();

  panel.webview.onDidReceiveMessage(
    async (msg: { type: string; input?: string; direction?: Direction; text?: string }) => {
      if (!panel) return;

      switch (msg.type) {
        case 'ready':
          panel.webview.postMessage({ type: 'init', input: initialInput, direction: initialDirection });
          break;

        case 'convert': {
          const { input = '', direction = 'json-to-yaml' } = msg;
          try {
            const output = direction === 'json-to-yaml' ? getYamlFromJson(input) : getJsonFromYaml(input);
            panel.webview.postMessage({ type: 'result', output });
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Conversion failed.';
            panel.webview.postMessage({ type: 'error', message: errorMessage });
          }
          break;
        }

        case 'copy':
          if (msg.text !== undefined) {
            void contextProvider.vscode.env.clipboard.writeText(msg.text);
          }
          break;

        case 'saveAs': {
          if (msg.text === undefined) break;
          const isJsonToYaml = msg.direction === 'json-to-yaml';
          const filename = isJsonToYaml ? 'output.yaml' : 'output.json';
          const workspaceUri = contextProvider.vscode.workspace.workspaceFolders?.[0]?.uri;
          const defaultUri = workspaceUri
            ? contextProvider.vscode.Uri.joinPath(workspaceUri, filename)
            : contextProvider.vscode.Uri.file(filename);
          const uri = await contextProvider.vscode.window.showSaveDialog({
            defaultUri,
            filters: isJsonToYaml ? { 'YAML files': ['yaml', 'yml'] } : { 'JSON files': ['json', 'jsonc'] },
          });
          if (uri) {
            await contextProvider.vscode.workspace.fs.writeFile(uri, Buffer.from(msg.text, 'utf8'));
          }
          break;
        }
      }
    },
  );

  panel.onDidDispose(() => {
    panel = undefined;
  });
}

function getWebviewHtml(): string {
  const nonce = generateNonce();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>YAML &#8596; JSON Converter</title>
  <style nonce="${nonce}">
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      display: flex;
      flex-direction: column;
      height: 100vh;
      background: var(--vscode-editor-background);
      color: var(--vscode-editor-foreground);
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: var(--vscode-editor-font-size, 13px);
    }
    .toolbar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      background: var(--vscode-editorGroupHeader-tabsBackground, var(--vscode-editor-background));
      border-bottom: 1px solid var(--vscode-editorGroup-border, var(--vscode-panel-border));
      flex-shrink: 0;
    }
    .direction-label {
      flex: 1;
      font-weight: bold;
      font-size: 13px;
    }
    button {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 2px;
      padding: 4px 10px;
      cursor: pointer;
      font-size: 12px;
      font-family: inherit;
    }
    button:hover {
      background: var(--vscode-button-hoverBackground);
    }
    button.secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }
    button.secondary:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }
    .panes {
      display: flex;
      flex: 1;
      overflow: hidden;
    }
    .pane {
      display: flex;
      flex-direction: column;
      flex: 1;
      overflow: hidden;
      min-width: 0;
    }
    .pane + .pane {
      border-left: 1px solid var(--vscode-editorGroup-border, var(--vscode-panel-border));
    }
    .pane-header {
      display: flex;
      align-items: center;
      padding: 4px 12px;
      background: var(--vscode-editorGroupHeader-tabsBackground, var(--vscode-editor-background));
      border-bottom: 1px solid var(--vscode-editorGroup-border, var(--vscode-panel-border));
      font-size: 11px;
      color: var(--vscode-tab-inactiveForeground, var(--vscode-editor-foreground));
      gap: 8px;
      flex-shrink: 0;
    }
    .pane-header span { flex: 1; }
    textarea {
      flex: 1;
      background: var(--vscode-editor-background);
      color: var(--vscode-editor-foreground);
      border: none;
      outline: none;
      resize: none;
      padding: 12px;
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: var(--vscode-editor-font-size, 13px);
      line-height: 1.5;
      width: 100%;
    }
    .output-content {
      flex: 1;
      overflow: auto;
      padding: 12px;
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: var(--vscode-editor-font-size, 13px);
      line-height: 1.5;
      white-space: pre-wrap;
      word-break: break-all;
    }
    .output-content.error {
      color: var(--vscode-inputValidation-errorForeground, #f44747);
      background: var(--vscode-inputValidation-errorBackground, rgba(244, 71, 71, 0.1));
      border-left: 3px solid var(--vscode-inputValidation-errorBorder, #f44747);
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <span class="direction-label" id="dirLabel">JSON &#8594; YAML</span>
    <button id="swapBtn">&#8644; Swap</button>
    <button class="secondary" id="clearBtn">Clear</button>
  </div>
  <div class="panes">
    <div class="pane">
      <div class="pane-header"><span id="inputLabel">Input (JSON)</span></div>
      <textarea id="input" spellcheck="false" placeholder="Paste or type content here..."></textarea>
    </div>
    <div class="pane">
      <div class="pane-header">
        <span id="outputLabel">Output (YAML)</span>
        <button id="saveAsBtn">Save As</button>
        <button id="copyBtn">Copy</button>
      </div>
      <div class="output-content" id="output"></div>
    </div>
  </div>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    let direction = 'json-to-yaml';
    let debounceTimer = null;
    let lastOutput = '';

    function escapeHtml(text) {
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    function updateLabels() {
      const isJsonToYaml = direction === 'json-to-yaml';
      document.getElementById('dirLabel').textContent = isJsonToYaml ? 'JSON \u2192 YAML' : 'YAML \u2192 JSON';
      document.getElementById('inputLabel').textContent = isJsonToYaml ? 'Input (JSON)' : 'Input (YAML)';
      document.getElementById('outputLabel').textContent = isJsonToYaml ? 'Output (YAML)' : 'Output (JSON)';
    }

    function requestConvert() {
      const input = document.getElementById('input').value;
      vscode.postMessage({ type: 'convert', input, direction });
    }

    function scheduleConvert() {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(requestConvert, 300);
    }

    document.getElementById('input').addEventListener('input', scheduleConvert);

    document.getElementById('swapBtn').addEventListener('click', () => {
      direction = direction === 'json-to-yaml' ? 'yaml-to-json' : 'json-to-yaml';
      document.getElementById('input').value = lastOutput;
      lastOutput = '';
      const outputEl = document.getElementById('output');
      outputEl.textContent = '';
      outputEl.classList.remove('error');
      updateLabels();
      requestConvert();
    });

    document.getElementById('clearBtn').addEventListener('click', () => {
      document.getElementById('input').value = '';
      lastOutput = '';
      const outputEl = document.getElementById('output');
      outputEl.textContent = '';
      outputEl.classList.remove('error');
    });

    document.getElementById('saveAsBtn').addEventListener('click', () => {
      vscode.postMessage({ type: 'saveAs', text: lastOutput, direction });
    });

    document.getElementById('copyBtn').addEventListener('click', () => {
      vscode.postMessage({ type: 'copy', text: lastOutput });
    });

    window.addEventListener('message', (event) => {
      const msg = event.data;
      switch (msg.type) {
        case 'init':
          direction = msg.direction || 'json-to-yaml';
          document.getElementById('input').value = msg.input || '';
          updateLabels();
          if (msg.input) requestConvert();
          break;
        case 'result': {
          lastOutput = msg.output || '';
          const outputEl = document.getElementById('output');
          outputEl.textContent = lastOutput;
          outputEl.classList.remove('error');
          break;
        }
        case 'error': {
          lastOutput = '';
          const outputEl = document.getElementById('output');
          outputEl.innerHTML = escapeHtml(msg.message);
          outputEl.classList.add('error');
          break;
        }
      }
    });

    vscode.postMessage({ type: 'ready' });
  </script>
</body>
</html>`;
}
