import { execSync } from 'node:child_process';
import path from 'node:path';

export default function setup() {
  const backendDir = path.resolve(__dirname, '..');
  // DB reset disabled alongside the commented-out test suite (does not wipe the dev DB).
  // execSync('npx prisma migrate reset --force --skip-generate', {
  //   cwd: backendDir,
  //   stdio: 'inherit',
  // });
  void backendDir;
  void execSync;
}
