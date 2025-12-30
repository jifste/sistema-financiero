import { VercelRequest, VercelResponse } from '@vercel/node';
import app from './index';

export default async (req: VercelRequest, res: VercelResponse) => {
    // Pass the request to Express
    await app(req as any, res as any);
};
