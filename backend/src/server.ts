import 'dotenv/config';
import app from './app';
import { prisma } from './config/prisma';
import { startSessionSweeper } from './services/sessionSweeper';

const port = Number(process.env.PORT) || 5001;

const sweeper = startSessionSweeper();

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`Spotit server running on port ${port}`);
});

function shutdown(signal: string) {
  console.log(`${signal} received, shutting down gracefully`);
  sweeper.stop();
  server.close(() => {
    prisma
      .$disconnect()
      .catch(() => { })
      .finally(() => process.exit(0));
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
