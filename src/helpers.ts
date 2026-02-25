import * as YAML from 'yaml';
import { visit as jsoncVisit, stripComments, parseTree, findNodeAtLocation } from 'jsonc-parser';

import { contextProvider } from './contextProvider';
import { ConfigId, Configs, getConfig } from './config';

const DEFAULT_ERROR_MESSAGE =
  'Something went wrong, please validate your file and try again or create an issue if the problem persist';

/**
 * prints errors to console and shows its error message to the user.
 */
export function showError(error: unknown) {
  console.error(error);

  const message = error instanceof Error ? error.message : DEFAULT_ERROR_MESSAGE;

  contextProvider.vscode.window.showErrorMessage(message);
}

export function getYamlFromJson(json: string): string {
  const indent = getConfig<Configs['yamlIndent']>(ConfigId.YamlIndent);
  const schema = getConfig<Configs['yamlSchema']>(ConfigId.YamlSchema);
  const lineWidth = getConfig<Configs['yamlLineWidth']>(ConfigId.YamlLineWidth);
  const options = getConfig<Configs['yamlOptions']>(ConfigId.YamlOptions) || {};
  const merge = getConfig<Configs['yamlMerge']>(ConfigId.YamlMerge) ?? true;

  try {
    const jsonObject: unknown = YAML.parse(json, { schema: 'json' });

    return YAML.stringify(jsonObject, {
      ...options, // do first so specific options take precedence
      ...(indent !== undefined && { indent }),
      ...(schema !== undefined && { schema }),
      ...(lineWidth !== undefined && { lineWidth }),
      merge,
    });
  } catch (error) {
    console.error(error);
    throw new Error('Failed to parse JSON. Please make sure it has a valid format and try again.', { cause: error });
  }
}

export { stripComments as stripJsoncComments } from 'jsonc-parser';

export function getYamlFromJsonc(jsoncText: string): string {
  const indent = getConfig<Configs['yamlIndent']>(ConfigId.YamlIndent);
  const schema = getConfig<Configs['yamlSchema']>(ConfigId.YamlSchema);
  const lineWidth = getConfig<Configs['yamlLineWidth']>(ConfigId.YamlLineWidth);
  const options = getConfig<Configs['yamlOptions']>(ConfigId.YamlOptions) || {};
  const merge = getConfig<Configs['yamlMerge']>(ConfigId.YamlMerge) ?? true;

  try {
    // Step 1: Collect comments and their positions from the JSONC text
    const comments = collectJsoncComments(jsoncText);

    // Step 2: Strip comments and parse clean JSON
    const cleanJson = stripComments(jsoncText);
    const jsonObject: unknown = JSON.parse(cleanJson);

    // Step 3: Build a YAML Document and attach comments
    const doc = new YAML.Document(jsonObject, {
      ...options,
      ...(indent !== undefined && { indent }),
      ...(schema !== undefined && { schema }),
      ...(lineWidth !== undefined && { lineWidth }),
      merge,
    });

    // Step 4: Attach collected comments to YAML nodes
    attachCommentsToYamlDoc(doc, comments);

    return doc.toString();
  } catch (error) {
    console.error(error);
    throw new Error('Failed to parse JSONC. Please make sure it has a valid format and try again.', { cause: error });
  }
}

export function getJsoncFromYaml(yamlText: string): string {
  const schema = getConfig<Configs['yamlSchema']>(ConfigId.YamlSchema);
  const options = getConfig<Configs['jsonOptions']>(ConfigId.JsonOptions) || {};

  try {
    const docs = YAML.parseAllDocuments(yamlText, {
      ...options,
      merge: true,
      ...(schema && { schema }),
    });

    const errors = docs.flatMap((doc) => doc.errors);
    if (errors.length > 0) throw errors[0];

    // Multi-document YAML: fall back to plain JSON (no comment preservation possible)
    if (docs.length > 1) {
      const values: unknown[] = docs.map((doc) => doc.toJS() as unknown);
      return JSON.stringify(values, undefined, 2);
    }

    const doc = docs[0];
    const json = JSON.stringify(doc.toJSON(), null, 2);
    const comments = collectYamlComments(doc.contents as YAML.Node, []);
    let result = insertCommentsIntoJson(json, comments);
    if (doc.commentBefore) {
      result =
        doc.commentBefore
          .split('\n')
          .map((line) => {
            const trimmed = line.replace(/^\s+/, '');
            return trimmed ? `// ${trimmed}` : '//';
          })
          .join('\n') +
        '\n' +
        result;
    }
    if (doc.comment) {
      const afterLines = doc.comment
        .split('\n')
        .map((line) => {
          const trimmed = line.replace(/^\s+/, '');
          return trimmed ? `// ${trimmed}` : '//';
        })
        .join('\n');
      result = result + '\n' + afterLines;
    }
    return result + '\n';
  } catch (error) {
    console.error(error);
    throw new Error('Failed to parse YAML. Please make sure it has a valid format and try again.', { cause: error });
  }
}

type CommentInfo = {
  path: (string | number)[];
  commentBefore?: string;
  commentAfter?: string;
};

function collectJsoncComments(text: string): CommentInfo[] {
  const comments: CommentInfo[] = [];

  // Track inline comments (comments on the same line as a value)
  const inlineComments = new Map<string, string>();

  // Collect all comment offsets and their text
  const commentEntries: { offset: number; length: number; startLine: number; text: string }[] = [];

  jsoncVisit(text, {
    onComment(offset, length, startLine) {
      const raw = text.substring(offset, offset + length);
      let commentText: string;
      if (raw.startsWith('//')) {
        commentText = raw.substring(2);
      } else if (raw.startsWith('/*')) {
        commentText = raw.substring(2, raw.length - 2);
      } else {
        commentText = raw;
      }
      // Preserve leading space for YAML comment formatting (# comment vs #comment)
      // Trim trailing whitespace only
      commentText = commentText.replace(/\s+$/, '');
      commentEntries.push({ offset, length, startLine, text: commentText });
    },
  });

  // Now do a second pass to associate comments with nodes
  // We track which comments are "inline" (on the same line as the preceding value)
  // and which are "before" (on their own line before the next property)
  const tokenLines: { line: number; path: (string | number)[] }[] = [];

  jsoncVisit(text, {
    onObjectProperty(property, _offset, _length, startLine, _startChar, pathSupplier) {
      const path = [...pathSupplier(), property];
      tokenLines.push({ line: startLine, path });
    },
    onLiteralValue(_value, _offset, _length, startLine, _startChar, pathSupplier) {
      const path = [...pathSupplier()];
      tokenLines.push({ line: startLine, path });
    },
  });

  // Sort tokens by line
  tokenLines.sort((a, b) => a.line - b.line);

  // For each comment, determine if it's inline (same line as previous token) or before (next token)
  for (const ce of commentEntries) {
    // Check if this comment is on the same line as a preceding token
    const prevToken = findLastTokenOnOrBeforeLine(tokenLines, ce.startLine);
    const nextToken = findFirstTokenAfterLine(tokenLines, ce.startLine);

    if (prevToken && prevToken.line === ce.startLine) {
      // Inline comment — attach to the previous token's path
      const key = JSON.stringify(prevToken.path);
      const existing = inlineComments.get(key);
      inlineComments.set(key, existing ? existing + '\n' + ce.text : ce.text);
    } else if (nextToken) {
      // Comment before the next token
      const key = JSON.stringify(nextToken.path);
      // We'll collect these as commentBefore
      const existing = comments.find((c) => JSON.stringify(c.path) === key);
      if (existing) {
        existing.commentBefore = existing.commentBefore ? existing.commentBefore + '\n' + ce.text : ce.text;
      } else {
        comments.push({ path: nextToken.path, commentBefore: ce.text });
      }
    }
  }

  // Merge inline comments
  for (const [key, text] of inlineComments) {
    const path = JSON.parse(key) as (string | number)[];
    const existing = comments.find((c) => JSON.stringify(c.path) === key);
    if (existing) {
      existing.commentAfter = text;
    } else {
      comments.push({ path, commentAfter: text });
    }
  }

  return comments;
}

function findLastTokenOnOrBeforeLine(
  tokens: { line: number; path: (string | number)[] }[],
  line: number,
): { line: number; path: (string | number)[] } | undefined {
  let result: { line: number; path: (string | number)[] } | undefined;
  for (const t of tokens) {
    if (t.line <= line) {
      result = t;
    } else {
      break;
    }
  }
  return result;
}

function findFirstTokenAfterLine(
  tokens: { line: number; path: (string | number)[] }[],
  line: number,
): { line: number; path: (string | number)[] } | undefined {
  for (const t of tokens) {
    if (t.line > line) {
      return t;
    }
  }
  return undefined;
}

function findPairByPath(doc: YAML.Document, path: (string | number)[]): { key?: YAML.Node; value?: YAML.Node } | null {
  let current: YAML.Node | null = doc.contents as YAML.Node;
  for (let i = 0; i < path.length; i++) {
    const seg = path[i];
    if (YAML.isMap(current)) {
      const pair = current.items.find((p) => String((p.key as YAML.Scalar).value) === String(seg));
      if (!pair) return null;
      if (i === path.length - 1) {
        return { key: pair.key as YAML.Node, value: pair.value as YAML.Node };
      }
      current = pair.value as YAML.Node;
    } else if (YAML.isSeq(current)) {
      const idx = Number(seg);
      if (i === path.length - 1) {
        return { value: current.items[idx] as YAML.Node };
      }
      current = current.items[idx] as YAML.Node;
    } else {
      return null;
    }
  }
  return null;
}

function attachCommentsToYamlDoc(doc: YAML.Document, comments: CommentInfo[]): void {
  for (const ci of comments) {
    if (ci.path.length === 0) {
      // Root-level comment
      if (ci.commentBefore) {
        doc.commentBefore = doc.commentBefore ? doc.commentBefore + '\n' + ci.commentBefore : ci.commentBefore;
      }
      continue;
    }

    const nodes = findPairByPath(doc, ci.path);
    if (!nodes) continue;

    // commentBefore goes on the key node (so it appears before the key in YAML)
    if (ci.commentBefore) {
      const target = nodes.key || nodes.value;
      if (target) {
        target.commentBefore = target.commentBefore ? target.commentBefore + '\n' + ci.commentBefore : ci.commentBefore;
      }
    }

    // commentAfter (inline) goes on the value node
    if (ci.commentAfter) {
      const target = nodes.value || nodes.key;
      if (target) {
        target.comment = target.comment ? target.comment + '\n' + ci.commentAfter : ci.commentAfter;
      }
    }
  }
}

type YamlCollectedComment = {
  path: (string | number)[];
  commentBefore?: string;
  inlineComment?: string;
};

function collectYamlComments(node: YAML.Node, path: (string | number)[]): YamlCollectedComment[] {
  const comments: YamlCollectedComment[] = [];

  if (YAML.isMap(node)) {
    // Handle commentBefore on the Map node itself (comments before first pair)
    if (node.commentBefore && node.items.length > 0) {
      const firstKey = node.items[0].key as YAML.Scalar;
      comments.push({ path: [...path, String(firstKey.value)], commentBefore: node.commentBefore });
    }
    for (const pair of node.items) {
      const key = pair.key as YAML.Scalar;
      const keyPath = [...path, String(key.value)];
      if (key.commentBefore) comments.push({ path: keyPath, commentBefore: key.commentBefore });
      if (pair.value) {
        const valueNode = pair.value as YAML.Node;
        if (valueNode.comment) comments.push({ path: keyPath, inlineComment: valueNode.comment });
        if (!key.commentBefore && key.comment) comments.push({ path: keyPath, inlineComment: key.comment });
        comments.push(...collectYamlComments(valueNode, keyPath));
      }
    }
  } else if (YAML.isSeq(node)) {
    if (node.commentBefore && node.items.length > 0) {
      comments.push({ path: [...path, 0], commentBefore: node.commentBefore });
    }
    node.items.forEach((item, i) => {
      const n = item as YAML.Node;
      const itemPath = [...path, i];
      if (n.commentBefore) comments.push({ path: itemPath, commentBefore: n.commentBefore });
      if (n.comment) comments.push({ path: itemPath, inlineComment: n.comment });
      comments.push(...collectYamlComments(n, itemPath));
    });
  }

  return comments;
}

function formatYamlCommentLine(text: string): string {
  const trimmed = text.replace(/^\s+/, '');
  return trimmed ? `// ${trimmed}` : '//';
}

function insertCommentsIntoJson(json: string, comments: YamlCollectedComment[]): string {
  const tree = parseTree(json);
  if (!tree) return json;

  const insertions: { offset: number; text: string }[] = [];

  for (const c of comments) {
    const jsonNode = findNodeAtLocation(tree, c.path);
    if (!jsonNode) continue;

    if (c.commentBefore) {
      // For a property node, we want the property (parent), not the value
      const propNode = jsonNode.parent?.type === 'property' ? jsonNode.parent : jsonNode;
      const lineStart = json.lastIndexOf('\n', propNode.offset - 1) + 1;
      const indent = json.substring(lineStart, propNode.offset);
      const commentLines = c.commentBefore
        .split('\n')
        .map((line) => `${indent}${formatYamlCommentLine(line)}`)
        .join('\n');
      insertions.push({ offset: lineStart, text: commentLines + '\n' });
    }

    if (c.inlineComment) {
      const valueEnd = jsonNode.offset + jsonNode.length;
      const nextNewline = json.indexOf('\n', valueEnd);
      const commentText = c.inlineComment
        .split('\n')
        .map((line) => formatYamlCommentLine(line))
        .join(' ');
      if (nextNewline !== -1) {
        insertions.push({ offset: nextNewline, text: ` ${commentText}` });
      } else {
        // Last line, no trailing newline
        insertions.push({ offset: json.length, text: ` ${commentText}` });
      }
    }
  }

  // Apply from bottom to top to preserve offsets
  insertions.sort((a, b) => b.offset - a.offset);
  let result = json;
  for (const ins of insertions) {
    result = result.substring(0, ins.offset) + ins.text + result.substring(ins.offset);
  }
  return result;
}

export function getJsonFromYaml(yaml: string): string {
  const schema = getConfig<Configs['yamlSchema']>(ConfigId.YamlSchema);
  const options = getConfig<Configs['jsonOptions']>(ConfigId.JsonOptions) || {};

  try {
    // parseAllDocuments supports multi-document YAML files using "---" separators.
    // YAML.parse() does not support multiple documents and throws an error if they are encountered.
    const docs = YAML.parseAllDocuments(yaml, {
      ...options, // do first so specific options take precedence
      merge: true,
      ...(schema && { schema }),
    });

    // parseAllDocuments never throws — errors are stored on each doc and must be re-thrown manually
    const errors = docs.flatMap((doc) => doc.errors);
    if (errors.length > 0) throw errors[0];

    // One document: return as is
    // multiple documents: return as JSON-array
    const values: unknown[] = docs.map((doc) => doc.toJS() as unknown);
    const json = values.length === 1 ? values[0] : values;

    return JSON.stringify(json, undefined, 2);
  } catch (error) {
    console.error(error);
    throw new Error('Failed to parse YAML. Please make sure it has a valid format and try again.', { cause: error });
  }
}
