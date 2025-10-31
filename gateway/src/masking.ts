import express from 'express';

export function maskingMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const originalJson = res.json.bind(res);
  res.json = function(body: any) {
    const user: any = (req as any).user;
    const roles: string[] = user?.realm_access?.roles || [];
    const canSeePii = roles.includes('pii:read');
    const masked = canSeePii ? body : deepRedact(body);
    return originalJson(masked);
  };
  next();
}

function deepRedact(obj: any): any {
  if (obj == null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(deepRedact);
  const copy: any = {};
  for (const [k, v] of Object.entries(obj)) {
    if (['pan', 'aadhaar', 'beneficiaryAccount'].includes(k)) copy[k] = 'REDACTED';
    else copy[k] = deepRedact(v);
  }
  return copy;
}


