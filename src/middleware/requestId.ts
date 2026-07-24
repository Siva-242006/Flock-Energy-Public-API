import { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'crypto';

export interface RequestWithId extends Request {
  requestId?: string;
}

export function requestIdMiddleware(req: RequestWithId, res: Response, next: NextFunction): void {
  const existingId = req.header('x-request-id') || req.header('X-Request-ID');
  const requestId = existingId || `req_${randomBytes(8).toString('hex')}`;
  
  req.requestId = requestId;
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);
  
  next();
}
