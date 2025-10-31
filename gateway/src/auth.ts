import express from 'express';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

const issuer = process.env.KEYCLOAK_ISSUER_URL || '';
const audience = process.env.KEYCLOAK_CLIENT_ID || '';
const jwksUri = process.env.KEYCLOAK_JWKS_URI || (issuer ? `${issuer}/protocol/openid-connect/certs` : '');

const client = jwksClient({ jwksUri, timeout: 3000 });

function getKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) {
  if (!header.kid) return callback(new Error('No kid in token header'));
  client.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    const signingKey = key.getPublicKey();
    return callback(null, signingKey);
  });
}

export function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const auth = req.header('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  const token = auth.substring('Bearer '.length);
  jwt.verify(token, getKey as any, { algorithms: ['RS256'], audience: audience || undefined, issuer: issuer || undefined }, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Unauthorized' });
    (req as any).user = decoded;
    return next();
  });
}

export function hasRole(required: string) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const user: any = (req as any).user;
    const roles: string[] = user?.realm_access?.roles || [];
    if (!roles.includes(required)) return res.status(403).json({ error: 'Forbidden' });
    return next();
  };
}


