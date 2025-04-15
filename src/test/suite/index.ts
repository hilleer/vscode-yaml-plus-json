import * as path from 'path';
import * as Mocha from 'mocha';
import { glob } from 'glob';

// Create the mocha test
const mocha = new Mocha({
  ui: 'tdd',
  color: true,
});

const testsRoot = path.resolve(__dirname, '..');

export function run(): Promise<void> {
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (c, e) => {
    const files = await glob('**/**.test.js', { cwd: testsRoot });
    // Add files to the test suite
    files.forEach((f) => mocha.addFile(path.resolve(testsRoot, f)));

    try {
      // Run the mocha test
      mocha.run((failures) => {
        if (failures > 0) {
          return e(new Error(`${failures} tests failed.`));
        }

        c();
      });
    } catch (err) {
      console.error(err);
      e(err);
    }
  });
}
