import { execSync } from 'child_process';
import { resolve } from 'path';

const ROOT = resolve(import.meta.dirname, '../../');

describe('SCSS compilation', () => {
  test('meridian.scss compiles without errors', () => {
    const output = execSync('npx sass scss/meridian.scss --no-source-map', {
      cwd: ROOT,
      encoding: 'utf-8',
      timeout: 30000,
    });
    expect(output.length).toBeGreaterThan(0);
    expect(output).toContain(':root');
  });
});
