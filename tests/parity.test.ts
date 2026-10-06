import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
test.each(['config.ts', 'types.ts', 'validation.ts'])(
  '%s matches the existing web contract',
  (file) => {
    const source = readFileSync(
      resolve(__dirname, 'fixtures/web-contract', file),
      'utf8',
    ).replace(/\r\n/g, '\n');
    const mobile = readFileSync(
      resolve(__dirname, '../src/lib', file),
      'utf8',
    ).replace(/\r\n/g, '\n');
    expect(mobile).toBe(source);
  },
);

