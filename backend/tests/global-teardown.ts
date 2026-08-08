import { execSync } from 'node:child_process';
import path from 'node:path';

export default function teardown() {
  const backendDir = path.resolve(__dirname, '..');
  // Reseed disabled alongside the commented-out test suite.
  // execSync('npm run prisma:seed', {
  //   cwd: backendDir,
  //   stdio: 'inherit',
  // });
  void backendDir;
  void execSync;
}
