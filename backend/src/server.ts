import 'dotenv/config';
import app from './app';
import { prisma } from './config/prisma';
import { startSessionSweeper } from './services/sessionSweeper';
import { startReassignmentSweeper } from './services/reassignmentSweeper';

const port = Number(process.env.PORT) || 5001;

const sweeper = startSessionSweeper();
const reassignmentSweeper = startReassignmentSweeper();

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`Spotit server running on port ${port}`);
});

function shutdown(signal: string) {
  console.log(`${signal} received, shutting down gracefully`);
  sweeper.stop();
  reassignmentSweeper.stop();
  server.close(() => {
    prisma
      .$disconnect()
      .catch(() => { })
      .finally(() => process.exit(0));
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
