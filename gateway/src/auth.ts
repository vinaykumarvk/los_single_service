import express from 'express';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

const issuer = process.env.KEYCLOAK_ISSUER_URL || '';
const audience = process.env.KEYCLOAK_CLIENT_ID || '';
const jwksUri = process.env.KEYCLOAK_JWKS_URI || (issuer ? `${issuer}/protocol/openid-connect/certs` : '');
const jwtSecret = process.env.JWT_SECRET || 'change-me-in-production-secret-key-min-32-chars';

const client = jwksUri ? jwksClient({ jwksUri, timeout: 3000 }) : null;

function getKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) {
  if (!header.kid) return callback(new Error('No kid in token header'));
  if (!client) return callback(new Error('JWKS client not configured'));
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
  
  // Try to decode the token to determine its type
  let decoded: any;
  try {
    decoded = jwt.decode(token, { complete: true });
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!decoded) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Check if it's a Keycloak token (has 'kid' in header and issuer/audience configured)
  if (decoded.header.kid && issuer && audience) {
    // Try Keycloak verification
    jwt.verify(token, getKey as any, { algorithms: ['RS256'], audience, issuer }, (err, verified) => {
      if (err) {
        // If Keycloak verification fails, try custom JWT
        try {
          const customDecoded = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] });
          (req as any).user = customDecoded;
          return next();
        } catch (customErr) {
          return res.status(401).json({ error: 'Unauthorized' });
        }
      } else {
        (req as any).user = verified;
        return next();
      }
    });
  } else {
    // Try custom JWT verification (HS256)
    try {
      const customDecoded = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] });
      (req as any).user = customDecoded;
      return next();
    } catch (err) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }
}

export function hasRole(required: string) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const user: any = (req as any).user;
    // Support both Keycloak format (realm_access.roles) and custom JWT format (roles)
    const roles: string[] = user?.realm_access?.roles || user?.roles || [];
    if (!roles.includes(required)) return res.status(403).json({ error: 'Forbidden' });
    return next();
  };
}


