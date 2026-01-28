import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { AppError } from './utils/AppError';
// Import routes here later

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

import authRouter from './routes/auth.routes';
import userRouter from './routes/user.routes';

// Routes
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

app.get('/', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'Multi-Provider OAuth Service is running 🚀',
        endpoints: {
            health: '/health',
            docs: 'See README.md'
        }
    });
});

app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);

// 404 Handler
app.all('*', (req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
});

export default app;
