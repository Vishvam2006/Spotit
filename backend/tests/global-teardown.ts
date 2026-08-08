import { execSync } from 'node:child_process';
import path from 'node:path';

export default function teardown() {
  const backendDir = path.resolve(__dirname, '..');
  execSync('npm run prisma:seed', {
    cwd: backendDir,
    stdio: 'inherit',
  });
}
