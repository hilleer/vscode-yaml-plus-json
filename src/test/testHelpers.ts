import { promises as fs } from 'fs';
import * as path from 'path';

// __dirname points to compiled folder in "out/" folder
const fixturesRootDir = path.join(__dirname, '..', '..', 'src', 'test', 'fixtures');
export const loadFixture = (fixtureFileName: string) => fs.readFile(path.join(fixturesRootDir, fixtureFileName), 'utf-8');