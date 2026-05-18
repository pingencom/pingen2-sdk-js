import { readFileSync } from 'fs';
import { join } from 'path';

const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8')) as {
  name: string;
  version: string;
};

export const SDK_NAME = pkg.name;
export const SDK_VERSION = pkg.version;
