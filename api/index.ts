import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../backend/src/index';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        // Pass the request to Express app
        await app(req as any, res as any);
    } catch (error) {
        console.error('Vercel Function Error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
