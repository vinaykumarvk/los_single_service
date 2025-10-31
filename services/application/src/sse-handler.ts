/**
 * Server-Sent Events (SSE) Handler for Real-time Updates
 * Provides real-time updates for application status changes
 */

import { Request, Response } from 'express';
import { Pool } from 'pg';
import { createLogger } from '@los/shared-libs';

const logger = createLogger('application-sse');

// Store active SSE connections
const activeConnections = new Map<string, Set<Response>>();

/**
 * Setup SSE connection for application updates
 */
export function setupApplicationSSE(req: Request, res: Response, pool: Pool): void {
  const applicationId = req.params.id;
  const connectionId = `${applicationId}-${Date.now()}`;
  
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
  
  // Store connection
  if (!activeConnections.has(applicationId)) {
    activeConnections.set(applicationId, new Set());
  }
  activeConnections.get(applicationId)!.add(res);
  
  // Send initial connection message
  res.write(`id: ${connectionId}\n`);
  res.write(`event: connected\n`);
  res.write(`data: ${JSON.stringify({ applicationId, connected: true, timestamp: new Date().toISOString() })}\n\n`);
  
  // Send current application status
  pool.query(
    'SELECT application_id, status, updated_at FROM applications WHERE application_id = $1',
    [applicationId]
  ).then(({ rows }) => {
    if (rows.length > 0) {
      res.write(`id: ${Date.now()}\n`);
      res.write(`event: status\n`);
      res.write(`data: ${JSON.stringify({ applicationId, status: rows[0].status, updatedAt: rows[0].updated_at })}\n\n`);
    }
  }).catch(err => {
    logger.warn('SSEFetchError', { error: (err as Error).message, applicationId });
  });
  
  // Handle client disconnect
  req.on('close', () => {
    activeConnections.get(applicationId)?.delete(res);
    if (activeConnections.get(applicationId)?.size === 0) {
      activeConnections.delete(applicationId);
    }
    logger.debug('SSEDisconnected', { applicationId, connectionId });
  });
  
  logger.info('SSEConnected', { applicationId, connectionId });
}

/**
 * Broadcast update to all connected clients for an application
 */
export function broadcastApplicationUpdate(
  applicationId: string,
  event: string,
  data: any
): void {
  const connections = activeConnections.get(applicationId);
  if (!connections || connections.size === 0) {
    return;
  }
  
  const message = `id: ${Date.now()}\nevent: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  
  connections.forEach(res => {
    try {
      res.write(message);
    } catch (err) {
      // Remove dead connections
      connections.delete(res);
      logger.warn('SSEWriteError', { error: (err as Error).message, applicationId });
    }
  });
  
  logger.debug('SSEBroadcast', { applicationId, event, connections: connections.size });
}

/**
 * Close all SSE connections for an application
 */
export function closeApplicationSSE(applicationId: string): void {
  const connections = activeConnections.get(applicationId);
  if (connections) {
    connections.forEach(res => {
      try {
        res.end();
      } catch (err) {
        // Ignore errors on close
      }
    });
    activeConnections.delete(applicationId);
    logger.debug('SSEClosed', { applicationId });
  }
}

