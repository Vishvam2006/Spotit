import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import { ZodError } from 'zod';
import authRoutes from './routes/auth.routes';
import parkingRoutes from './modules/parking/parking.routes';
import bookingRoutes from './modules/booking/booking.routes';
import { AuthError } from './services/auth.service';
import { BookingError } from './modules/booking/booking.service';
import { ParkingError } from './modules/parking/parking.service';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (_req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'ParkMitra API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/parking-lots', parkingRoutes);
app.use('/api/bookings', bookingRoutes);

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

  if (err instanceof BookingError) {
    res.status(err.statusCode).json({ success: false, message: err.message });
    return;
  }

  if (err instanceof ParkingError) {
    res.status(err.statusCode).json({ success: false, message: err.message });
    return;
  }

  console.error(err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

export default app;