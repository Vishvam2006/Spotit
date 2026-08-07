import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import { ZodError } from 'zod';
import authRoutes from './routes/auth.routes';
import parkingLotRoutes from './modules/parkingLot/parkingLot.routes';
import { AuthError } from './services/auth.service';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (_req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'ParkMitra API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/parking-lots', parkingLotRoutes);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ZodError) {
    const message = err.issues[0]?.message ?? 'Validation failed';
    res.status(400).json({ success: false, message });
    return;
  }

  if (err instanceof AuthError) {
    res.status(err.statusCode).json({ success: false, message: err.message });
    return;
  }

  console.error(err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

export default app;