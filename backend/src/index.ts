import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Health Check Endpoint (Vercel/Railway needs this)
app.get('/api/health', (_req: Request, res: Response) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// API Routes
app.get('/api', (_req: Request, res: Response) => {
    res.json({
        message: 'FinanceAI Pro API',
        version: '1.0.0',
        endpoints: ['/health', '/api/auth', '/api/transactions']
    });
});

// Placeholder: Auth Routes
app.post('/api/auth/register', (_req: Request, res: Response) => {
    res.status(501).json({ message: 'Not implemented yet' });
});

app.post('/api/auth/login', (_req: Request, res: Response) => {
    res.status(501).json({ message: 'Not implemented yet' });
});

// Placeholder: Transaction Routes
app.get('/api/transactions', (_req: Request, res: Response) => {
    res.status(501).json({ message: 'Not implemented yet' });
});

// 404 Handler
app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not Found' });
});

// Error Handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Error:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
});

// Start Server only if not running in Vercel (local development)
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`🚀 FinanceAI Backend running on port ${PORT}`);
        console.log(`📊 Health check: http://localhost:${PORT}/health`);
    });
}

export default app;
