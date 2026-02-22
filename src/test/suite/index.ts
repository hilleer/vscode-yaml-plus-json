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
  return new Promise((c, e) => {
    glob('**/**.test.js', { cwd: testsRoot })
      .then((files) => {
        // Add files to the test suite
        files.forEach((f) => mocha.addFile(path.resolve(testsRoot, f)));

        try {
          // Run the mocha test
          mocha.run((failures) => {
            if (failures > 0) {
              e(new Error(`${failures} tests failed.`));
            } else {
              c();
            }
          });
        } catch (err) {
          console.error(err);
          if (err instanceof Error) {
            e(err);
          } else {
            e(new Error(String(err)));
          }
        }
      })
      .catch((err) => {
        console.error(err);
        if (err instanceof Error) {
          e(err);
        } else {
          e(new Error(String(err)));
        }
      });
  });
}
