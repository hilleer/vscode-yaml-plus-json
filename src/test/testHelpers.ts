import { promises as fs } from 'fs';
import * as path from 'path';

// __dirname points to compiled folder in "out/" folder
const fixturesRootDir = path.join(__dirname, '..', '..', 'src', 'test', 'fixtures');
export const loadFixture = (fixtureFileName: string) =>
  fs.readFile(path.join(fixturesRootDir, fixtureFileName), 'utf-8');

export const loadFixtures = async (...fixtures: string[]) =>
  Promise.all(fixtures.map((fixture) => loadFixture(fixture)));

export const stripNewLines = (value: string) => value.replace(/\r?\n|\r/g, '');
