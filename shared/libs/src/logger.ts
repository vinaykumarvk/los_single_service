import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

export function correlationIdMiddleware(req: Request, _res: Response, next: NextFunction) {
  const headerId = req.header('x-correlation-id');
  (req as any).correlationId = headerId || randomUUID();
  next();
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export function createLogger(service: string) {
  function log(level: LogLevel, msg: string, fields?: Record<string, unknown>) {
    const record = {
      ts: new Date().toISOString(),
      level,
      service,
      msg,
      ...fields,
    };
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(record));
  }
  return {
    debug: (msg: string, f?: Record<string, unknown>) => log('debug', msg, f),
    info: (msg: string, f?: Record<string, unknown>) => log('info', msg, f),
    warn: (msg: string, f?: Record<string, unknown>) => log('warn', msg, f),
    error: (msg: string, f?: Record<string, unknown>) => log('error', msg, f),
  };
}


