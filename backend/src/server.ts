import 'dotenv/config';
import app from './app';
import { prisma } from './config/prisma';

const port = process.env.PORT || 5000;

const server = app.listen(Number(port), '0.0.0.0', () => {
  console.log(`ParkMitra server running on port ${port}`);
});

function shutdown(signal: string) {
  console.log(`${signal} received, shutting down gracefully`);
  server.close(() => {
    prisma
      .$disconnect()
      .catch(() => { })
      .finally(() => process.exit(0));
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
