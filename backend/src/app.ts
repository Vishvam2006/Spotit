import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import authRoutes from './routes/auth.routes';
import parkingRoutes from './modules/parking/parking.routes';
import bookingRoutes from './modules/booking/booking.routes';
import ownerRoutes from './modules/owner/owner.routes';
import vehicleRoutes from './modules/vehicle/vehicle.routes';
import uploadsRoutes from './modules/uploads/uploads.routes';
import verificationRoutes from './modules/verification/verification.routes';
import adminRoutes from './modules/admin/admin.routes';
import complaintRoutes from './modules/complaints/complaint.routes';
import continuityRoutes from './modules/continuity/continuity.routes';
import userRoutes from './modules/user/user.routes';
import { AuthError } from './services/auth.service';
import { BookingError } from './modules/booking/booking.service';
import { ParkingError } from './modules/parking/parking.service';
import { OwnerError } from './modules/owner/owner.service';
import { VehicleError } from './modules/vehicle/vehicle.service';
import { VerificationError } from './modules/verification/verification.service';
import { AdminError } from './modules/admin/admin.service';
import { ComplaintError } from './modules/complaints/complaint.service';
import { ContinuityError } from './modules/continuity/continuity.states';

const app = express();

app.use(helmet());
app.set("trust proxy", 1);

const corsOrigins = process.env.CORS_ORIGINS ?? process.env.WEB_APP_URL ?? 'http://localhost:5173';
const allowedOrigins = corsOrigins
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);
app.use(express.json({ limit: '50mb' }));

app.get('/', (_req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Spotit API is running' });
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    message: 'Spotit API is healthy',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/parking-lots', parkingRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/owner', ownerRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/uploads', uploadsRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/continuity', continuityRoutes);
app.use('/api/users', userRoutes);

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    code: 'NOT_FOUND',
  });
});

function isBodyParseError(err: unknown): err is SyntaxError & { status: number; type: string } {
  return (
    err instanceof SyntaxError &&
    (err as { status?: number }).status === 400 &&
    (err as { type?: string }).type === 'entity.parse.failed'
  );
}

function sanitizeErrorForLog(err: Error): Record<string, unknown> {
  const out: Record<string, unknown> = {
    name: err.name,
    message: err.message,
  };
  if (process.env.NODE_ENV !== 'production') {
    out.stack = err.stack;
  }
  return out;
}

function logError(where: string, err: unknown): void {
  if (!(err instanceof Error)) {
    console.error(`[App] Unhandled error in ${where}:`, err);
    return;
  }
  console.error(`[App] Unhandled error in ${where}:`, sanitizeErrorForLog(err));
}

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (isBodyParseError(err)) {
    res.status(400).json({
      success: false,
      message: 'Request body contains invalid JSON.',
      code: 'INVALID_JSON',
    });
    return;
  }

  if (err instanceof ZodError) {
    const issues = err.issues.map((issue) => issue.message);
    res.status(400).json({
      success: false,
      message: issues[0] ?? 'Validation failed',
      errors: issues,
      code: 'VALIDATION_FAILED',
    });
    return;
  }

  if (err instanceof AuthError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: 'AUTH_ERROR',
    });
    return;
  }

  if (err instanceof BookingError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: 'BOOKING_ERROR',
    });
    return;
  }

  if (err instanceof ParkingError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: 'PARKING_ERROR',
    });
    return;
  }

  if (err instanceof OwnerError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: 'OWNER_ERROR',
    });
    return;
  }

  if (err instanceof VehicleError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: 'VEHICLE_ERROR',
    });
    return;
  }

  if (err instanceof VerificationError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: 'VERIFICATION_ERROR',
    });
    return;
  }

  if (err instanceof AdminError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: 'ADMIN_ERROR',
    });
    return;
  }

  if (err instanceof ContinuityError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: 'CONTINUITY_ERROR',
    });
    return;
  }

  if (err instanceof ComplaintError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: 'COMPLAINT_ERROR',
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({
        success: false,
        message: 'A record with the same value already exists.',
        code: 'CONFLICT',
      });
      return;
    }

    if (err.code === 'P2025') {
      res.status(404).json({
        success: false,
        message: 'The requested record could not be found.',
        code: 'NOT_FOUND',
      });
      return;
    }

    if (err.code === 'P2003') {
      res.status(409).json({
        success: false,
        message: 'This action is not allowed because it breaks existing data.',
        code: 'CONFLICT',
      });
      return;
    }

    if (err.code === 'P2034') {
      res.status(409).json({
        success: false,
        message: 'The data changed while saving. Please review and retry.',
        code: 'CONFLICT',
      });
      return;
    }

    console.error('[App] Prisma error:', err.code, err.meta?.target, err.message);
    res.status(500).json({
      success: false,
      message: 'A database error occurred. Please try again.',
      code: 'DATABASE_ERROR',
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    res.status(400).json({
      success: false,
      message: 'The request does not match the expected format.',
      code: 'VALIDATION_FAILED',
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientInitializationError) {
    console.error('[App] Prisma initialization error:', err.message);
    res.status(503).json({
      success: false,
      message: 'The database is temporarily unavailable. Please try again shortly.',
      code: 'SERVICE_UNAVAILABLE',
    });
    return;
  }

  logError('error middleware', err);
  res.status(500).json({
    success: false,
    message: 'Something went wrong on our end. Please try again.',
    code: 'INTERNAL_ERROR',
  });
});

export default app;
