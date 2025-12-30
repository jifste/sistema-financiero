import { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../backend/src/index';

export default async (req: VercelRequest, res: VercelResponse) => {
    await app(req as any, res as any);
};
