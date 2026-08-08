import { execSync } from 'node:child_process';
import path from 'node:path';

export default function setup() {
  const backendDir = path.resolve(__dirname, '..');
  execSync('npx prisma migrate reset --force --skip-generate', {
    cwd: backendDir,
    stdio: 'inherit',
  });
}
