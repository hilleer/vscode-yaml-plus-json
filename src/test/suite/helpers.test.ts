import * as assert from 'assert';

import { getJsonFromYaml, getJsoncFromYaml, getYamlFromJson, getYamlFromJsonc } from '../../helpers';
import { loadFixture, loadFixtures, stripNewLines } from '../testHelpers';
import { ConfigId, Configs } from '../../config';
import { WorkspaceConfigurationMock } from '../testUtil';

type Test = {
  inputFilePath: string;
  expectedFilePath: string;
  description: string;
  /**
   * enable mocking of vscode.workspace.getConfiguration
   */
  configMock?: Partial<Configs>;
};

suite('helpers', () => {
  suite('getYamlFromJson()', () => {
    const tests: Test[] = [
      {
        description: 'should convert json to yaml',
        inputFilePath: 'input.json',
        expectedFilePath: 'expected.yaml',
      },
      {
        description: 'should convert json with trailing commas to yaml',
        inputFilePath: 'trailingCommaInput.json',
        expectedFilePath: 'trailingCommaExpected.yaml',
      },
      {
        description: 'should convert complex json with trailing commas at multiple levels to yaml',
        inputFilePath: 'trailingCommaComplexInput.json',
        expectedFilePath: 'trailingCommaComplexExpected.yaml',
      },
      {
        description: 'when json lines are long and line width is not limited',
        inputFilePath: 'longLinesInput.json',
        expectedFilePath: 'longLinesExpectedUnlimited.yaml',
        configMock: {
          [ConfigId.YamlLineWidth]: 0, // 0 means unlimited
        },
      },
      {
        description: 'when json lines are long and line width is limited',
        inputFilePath: 'longLinesInput.json',
        expectedFilePath: 'longLinesExpectedLimited.yaml',
        configMock: {
          [ConfigId.YamlLineWidth]: 100,
        },
      },
      {
        description: 'should convert a json array to a yaml sequence',
        inputFilePath: 'jsonArrayInput.json',
        expectedFilePath: 'jsonArrayExpected.yaml',
      },
    ];

    for (const t of tests) {
      suite(t.description, () => {
        let workspaceConfigMock: WorkspaceConfigurationMock;
        suiteSetup(() => (workspaceConfigMock = new WorkspaceConfigurationMock(t.configMock)));

        suiteTeardown(() => workspaceConfigMock.restore());

        test('should return expected yaml', async () => assertTest(t, getYamlFromJson));
      });
    }

    suite('error handling', () => {
      let workspaceConfigMock: WorkspaceConfigurationMock;
      suiteSetup(() => (workspaceConfigMock = new WorkspaceConfigurationMock()));
      suiteTeardown(() => workspaceConfigMock.restore());

      test('should throw an error with correct message when given invalid json', async () => {
        const invalidJson = await loadFixture('input.yaml'); // YAML is not valid JSON flow syntax
        assert.throws(
          () => getYamlFromJson(invalidJson),
          (err: Error) => {
            assert.ok(err instanceof Error);
            assert.strictEqual(
              err.message,
              'Failed to parse JSON. Please make sure it has a valid format and try again.',
            );
            assert.ok(err.cause instanceof Error, 'error should have a cause');
            return true;
          },
        );
      });
    });
  });

  suite('getJsonFromYaml', () => {
    const TESTS: Test[] = [
      {
        inputFilePath: 'input.yaml',
        expectedFilePath: 'expected.json',
        description: 'should convert basic yaml to json',
      },
      {
        inputFilePath: 'mergeTagInput.yaml',
        expectedFilePath: 'mergeTagExpected.json',
        description: 'should convert yaml with merge tags to json',
      },
      {
        inputFilePath: 'multiDocumentInput.yaml',
        expectedFilePath: 'multiDocumentExpected.json',
        description: 'should convert multi-document yaml (--- separator) to a json array',
      },
    ];

    TESTS.forEach((t) => {
      suite(t.description, () => {
        test('should return expected json', () => assertTest(t, getJsonFromYaml));
      });
    });

    suite('error handling', () => {
      test('should throw an error with correct message when given invalid yaml', () => {
        const invalidYaml = 'key: [unclosed bracket';
        assert.throws(
          () => getJsonFromYaml(invalidYaml),
          (err: Error) => {
            assert.ok(err instanceof Error);
            assert.strictEqual(
              err.message,
              'Failed to parse YAML. Please make sure it has a valid format and try again.',
            );
            assert.ok(err.cause instanceof Error, 'error should have a cause');
            return true;
          },
        );
      });
    });
  });

  suite('getYamlFromJsonc()', () => {
    let workspaceConfigMock: WorkspaceConfigurationMock;
    suiteSetup(() => (workspaceConfigMock = new WorkspaceConfigurationMock()));
    suiteTeardown(() => workspaceConfigMock.restore());

    test('should convert jsonc with comments to yaml with comments', async () => {
      const [input, expected] = await loadFixtures('commentInput.jsonc', 'commentExpected.yaml');
      const actual = getYamlFromJsonc(input);
      assert.deepStrictEqual(stripNewLines(actual), stripNewLines(expected));
    });

    test('should handle jsonc with only line comments', () => {
      const input = '{\n  // a comment\n  "key": "value"\n}';
      const result = getYamlFromJsonc(input);
      assert.ok(result.includes('# a comment'), 'should contain yaml comment');
      assert.ok(result.includes('key: value'), 'should contain the key-value');
    });

    test('should handle jsonc with inline comments', () => {
      const input = '{\n  "key": "value" // inline\n}';
      const result = getYamlFromJsonc(input);
      assert.ok(result.includes('# inline'), 'should contain inline comment');
    });

    test('should handle jsonc with block comments', () => {
      const input = '{\n  /* block comment */\n  "key": "value"\n}';
      const result = getYamlFromJsonc(input);
      assert.ok(result.includes('# block comment'), 'should contain block comment');
    });

    test('should throw on invalid jsonc', () => {
      assert.throws(
        () => getYamlFromJsonc('{invalid'),
        (err: Error) => {
          assert.ok(err instanceof Error);
          assert.strictEqual(
            err.message,
            'Failed to parse JSONC. Please make sure it has a valid format and try again.',
          );
          return true;
        },
      );
    });

    test('should handle multiple consecutive comments before a key', () => {
      const input = '{\n  // first comment\n  // second comment\n  "key": "value"\n}';
      const result = getYamlFromJsonc(input);
      assert.ok(result.includes('# first comment'), 'should contain first comment');
      assert.ok(result.includes('# second comment'), 'should contain second comment');
      assert.ok(result.includes('key: value'), 'should contain the key-value');
    });

    test('should handle nested object with comments at multiple levels', () => {
      const input = [
        '{',
        '  // outer comment',
        '  "outer": {',
        '    // inner comment',
        '    "inner": "value"',
        '  }',
        '}',
      ].join('\n');
      const result = getYamlFromJsonc(input);
      assert.ok(result.includes('# outer comment'), 'should contain outer comment');
      assert.ok(result.includes('# inner comment'), 'should contain inner comment');
      assert.ok(result.includes('inner: value'), 'should contain nested key-value');
    });

    test('should handle comment at document start before first property', () => {
      const input = '{\n  // top-level comment\n  "key": "value"\n}';
      const result = getYamlFromJsonc(input);
      assert.ok(result.includes('# top-level comment'), 'should contain top-level comment');
      assert.ok(result.includes('key: value'), 'should contain the key-value');
    });

    test('should handle empty comment lines without crashing', () => {
      const input = '{\n  //\n  "key": "value"\n}';
      const result = getYamlFromJsonc(input);
      // Empty comments (bare //) are collected but the YAML library silently
      // drops empty commentBefore strings, so we just verify it doesn't crash
      // and the data is preserved
      assert.ok(result.includes('key: value'), 'should contain the key-value');
    });

    test('should handle comments in arrays with mixed types', () => {
      const input = [
        '{',
        '  "items": [',
        '    // comment on object',
        '    { "name": "a" },',
        '    // comment on primitive',
        '    42',
        '  ]',
        '}',
      ].join('\n');
      const result = getYamlFromJsonc(input);
      assert.ok(result.includes('# comment on object'), 'should contain comment on object');
      assert.ok(result.includes('# comment on primitive'), 'should contain comment on primitive');
    });

    test('should handle plain JSON with no comments (regression guard)', () => {
      const input = '{\n  "name": "test",\n  "count": 42\n}';
      const result = getYamlFromJsonc(input);
      assert.ok(result.includes('name: test'), 'should contain name');
      assert.ok(result.includes('count: 42'), 'should contain count');
      assert.ok(!result.includes('#'), 'should not contain any comments');
    });

    test('should handle inline comment after value', () => {
      const input = '{\n  "a": 1, // comment on a\n  "b": 2\n}';
      const result = getYamlFromJsonc(input);
      assert.ok(result.includes('# comment on a'), 'should contain inline comment');
      assert.ok(result.includes('a: 1'), 'should contain a');
      assert.ok(result.includes('b: 2'), 'should contain b');
    });
  });

  suite('getJsoncFromYaml()', () => {
    let workspaceConfigMock: WorkspaceConfigurationMock;
    suiteSetup(() => (workspaceConfigMock = new WorkspaceConfigurationMock()));
    suiteTeardown(() => workspaceConfigMock.restore());

    test('should convert yaml with comments to jsonc with comments', async () => {
      const [input, expected] = await loadFixtures('commentYamlInput.yaml', 'commentJsoncExpected.jsonc');
      const actual = getJsoncFromYaml(input);
      assert.deepStrictEqual(stripNewLines(actual), stripNewLines(expected));
    });

    test('should handle yaml with comment before key', () => {
      const input = '# a comment\nkey: value\n';
      const result = getJsoncFromYaml(input);
      assert.ok(result.includes('// a comment'), 'should contain jsonc comment');
      assert.ok(result.includes('"key": "value"'), 'should contain the key-value');
    });

    test('should handle yaml with inline comments', () => {
      const input = 'key: value # inline\n';
      const result = getJsoncFromYaml(input);
      assert.ok(result.includes('// inline'), 'should contain inline comment');
    });

    test('should fall back to plain JSON for multi-document yaml', () => {
      const input = '---\nname: first\n---\nname: second\n';
      const result = getJsoncFromYaml(input);
      // Should produce a JSON array, not JSONC with comments
      const parsed: unknown[] = JSON.parse(result) as unknown[];
      assert.ok(Array.isArray(parsed), 'should be an array');
      assert.strictEqual(parsed.length, 2);
    });

    test('should throw on invalid yaml', () => {
      assert.throws(
        () => getJsoncFromYaml('key: [unclosed bracket'),
        (err: Error) => {
          assert.ok(err instanceof Error);
          assert.strictEqual(
            err.message,
            'Failed to parse YAML. Please make sure it has a valid format and try again.',
          );
          return true;
        },
      );
    });

    test('should handle multiple consecutive comments before a key', () => {
      const input = '# first line\n# second line\nkey: value\n';
      const result = getJsoncFromYaml(input);
      assert.ok(result.includes('// first line'), 'should contain first comment');
      assert.ok(result.includes('// second line'), 'should contain second comment');
      assert.ok(result.includes('"key": "value"'), 'should contain the key-value');
    });

    test('should handle nested object with comment on outer key', () => {
      const input = ['# outer comment', 'outer:', '  inner: value', ''].join('\n');
      const result = getJsoncFromYaml(input);
      assert.ok(result.includes('// outer comment'), 'should contain outer comment');
      assert.ok(result.includes('"inner": "value"'), 'should contain nested key-value');
    });

    test('should handle comment before first key', () => {
      const input = '# file header\nkey: value\n';
      const result = getJsoncFromYaml(input);
      assert.ok(result.includes('// file header'), 'should contain header comment');
      assert.ok(result.includes('"key": "value"'), 'should contain key-value');
    });

    test('should handle comment at document end (comment on doc)', () => {
      const input = 'key: value # footer\n';
      const result = getJsoncFromYaml(input);
      assert.ok(result.includes('// footer'), 'should contain footer comment');
    });

    test('should handle empty comment lines', () => {
      const input = '#\nkey: value\n';
      const result = getJsoncFromYaml(input);
      assert.ok(result.includes('//'), 'should contain a bare comment marker');
      assert.ok(result.includes('"key": "value"'), 'should contain the key-value');
    });

    test('should handle plain YAML with no comments (regression guard)', () => {
      const input = 'name: test\ncount: 42\n';
      const result = getJsoncFromYaml(input);
      assert.ok(result.includes('"name": "test"'), 'should contain name');
      assert.ok(result.includes('"count": 42'), 'should contain count');
      assert.ok(!result.includes('//'), 'should not contain any comments');
    });

    test('should handle array items with comments', () => {
      const input = ['items:', '  # comment on first', '  - first', '  # comment on second', '  - second', ''].join(
        '\n',
      );
      const result = getJsoncFromYaml(input);
      assert.ok(result.includes('// comment on first'), 'should contain first item comment');
      assert.ok(result.includes('// comment on second'), 'should contain second item comment');
    });

    test('should preserve comments before first key in nested maps', () => {
      const input = ['# hello', 'world:', '  # can you', '  you:', '    # read this?', '    this: true', ''].join('\n');
      const result = getJsoncFromYaml(input);
      assert.ok(result.includes('// hello'), 'should contain top-level comment');
      assert.ok(result.includes('// can you'), 'should contain first nested map comment');
      assert.ok(result.includes('// read this?'), 'should contain second nested map comment');
      assert.ok(result.includes('"this": true'), 'should contain the leaf value');
    });

    test('should handle special characters in comments (colons, hashes, quotes)', () => {
      const input = ['# this: has a colon', '# has ## multiple hashes', "# and 'quotes'", 'key: value', ''].join('\n');
      const result = getJsoncFromYaml(input);
      assert.ok(result.includes('// this: has a colon'), 'should preserve colon in comment');
      assert.ok(result.includes('// has ## multiple hashes'), 'should preserve multiple hashes');
      assert.ok(result.includes("// and 'quotes'"), 'should preserve quotes in comment');
    });

    test('should handle multi-line block comment before a single key', () => {
      const input = ['# line 1', '# line 2', '# line 3', 'key: value', ''].join('\n');
      const result = getJsoncFromYaml(input);
      assert.ok(result.includes('// line 1'), 'should contain first line');
      assert.ok(result.includes('// line 2'), 'should contain second line');
      assert.ok(result.includes('// line 3'), 'should contain third line');
      // All comment lines should appear before the key
      const keyIndex = result.indexOf('"key"');
      const line1Index = result.indexOf('// line 1');
      const line3Index = result.indexOf('// line 3');
      assert.ok(line1Index < line3Index && line3Index < keyIndex, 'comments should appear in order before key');
    });

    test('should handle comments on array elements containing objects', () => {
      const input = [
        'items:',
        '  # first obj',
        '  - name: a',
        '    val: 1',
        '  # second obj',
        '  - name: b',
        '    val: 2',
        '',
      ].join('\n');
      const result = getJsoncFromYaml(input);
      assert.ok(result.includes('// first obj'), 'should contain comment on first object');
      assert.ok(result.includes('// second obj'), 'should contain comment on second object');
      assert.ok(result.includes('"name": "a"'), 'should contain first object data');
      assert.ok(result.includes('"name": "b"'), 'should contain second object data');
    });

    test('should handle trailing inline comment on last array item', () => {
      const input = ['items:', '  - first', '  - last # trailing', 'after: true', ''].join('\n');
      const result = getJsoncFromYaml(input);
      assert.ok(result.includes('// trailing'), 'should contain trailing comment on last item');
      assert.ok(result.includes('"after": true'), 'should contain key after array');
    });

    test('should handle deeply nested structure with top-level comment', () => {
      const input = ['# top comment', 'a:', '  b:', '    c: deep', ''].join('\n');
      const result = getJsoncFromYaml(input);
      assert.ok(result.includes('// top comment'), 'should contain top-level comment');
      assert.ok(result.includes('"c": "deep"'), 'should contain deeply nested value');
    });
  });

  suite('round-trip comment preservation', () => {
    let workspaceConfigMock: WorkspaceConfigurationMock;
    suiteSetup(() => (workspaceConfigMock = new WorkspaceConfigurationMock()));
    suiteTeardown(() => workspaceConfigMock.restore());

    test('JSONC → YAML → JSONC round-trip preserves comment text', () => {
      const originalJsonc = ['{', '  // header comment', '  "name": "test",', '  "value": 42 // inline note', '}'].join(
        '\n',
      );
      const yaml = getYamlFromJsonc(originalJsonc);
      const roundTripped = getJsoncFromYaml(yaml);
      assert.ok(roundTripped.includes('header comment'), 'should preserve header comment text');
      assert.ok(roundTripped.includes('inline note'), 'should preserve inline comment text');
      assert.ok(roundTripped.includes('"name"'), 'should preserve name key');
      assert.ok(roundTripped.includes('42'), 'should preserve value');
    });

    test('YAML → JSONC → YAML round-trip preserves comment text', () => {
      const originalYaml = ['# file comment', 'name: test', '# before value', 'value: 42', ''].join('\n');
      const jsonc = getJsoncFromYaml(originalYaml);
      const roundTripped = getYamlFromJsonc(jsonc);
      assert.ok(roundTripped.includes('file comment'), 'should preserve file comment text');
      assert.ok(roundTripped.includes('before value'), 'should preserve before-value comment text');
      assert.ok(roundTripped.includes('name: test'), 'should preserve name');
      assert.ok(roundTripped.includes('value: 42'), 'should preserve value');
    });
  });
});

async function assertTest(t: Test, converter: (input: string) => string) {
  const [yaml, expected] = await loadFixtures(t.inputFilePath, t.expectedFilePath);

  const actual = converter(yaml);

  assert.deepStrictEqual(stripNewLines(actual), stripNewLines(expected));
}
