/**
 * Dashboard SSE Handler for Real-time Dashboard Updates
 * Provides real-time updates for dashboard metrics (RM, SRM, Regional Head)
 */

import { Request, Response } from 'express';
import { Pool } from 'pg';
import { createLogger } from '@los/shared-libs';
import { computeUserMetrics, computeManagerMetrics } from './hierarchical-dashboards';

const logger = createLogger('dashboard-sse');

// Store active SSE connections by user ID and dashboard type
const activeDashboardConnections = new Map<string, Set<Response>>();

/**
 * Setup SSE connection for dashboard updates
 * @param userId - User ID requesting dashboard
 * @param dashboardType - 'rm' | 'srm' | 'regional-head'
 */
export function setupDashboardSSE(
  req: Request,
  res: Response,
  pool: Pool,
  userId: string,
  dashboardType: 'rm' | 'srm' | 'regional-head'
): void {
  const connectionId = `${dashboardType}-${userId}-${Date.now()}`;
  const connectionKey = `${dashboardType}-${userId}`;
  
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  
  // Store connection
  if (!activeDashboardConnections.has(connectionKey)) {
    activeDashboardConnections.set(connectionKey, new Set());
  }
  activeDashboardConnections.get(connectionKey)!.add(res);
  
  // Send initial connection message
  res.write(`id: ${connectionId}\n`);
  res.write(`event: connected\n`);
  res.write(`data: ${JSON.stringify({ 
    dashboardType, 
    userId, 
    connected: true, 
    timestamp: new Date().toISOString() 
  })}\n\n`);
  
  // Send initial dashboard data
  loadAndSendDashboardData(pool, userId, dashboardType, res, connectionId);
  
  // Set up polling interval (every 5 seconds for real-time feel)
  const intervalId = setInterval(async () => {
    if (!res.writableEnded) {
      await loadAndSendDashboardData(pool, userId, dashboardType, res, connectionId);
    } else {
      clearInterval(intervalId);
      cleanupConnection(connectionKey, res);
    }
  }, 5000);
  
  // Handle client disconnect
  req.on('close', () => {
    clearInterval(intervalId);
    cleanupConnection(connectionKey, res);
    logger.debug('DashboardSSEDisconnected', { dashboardType, userId, connectionId });
  });
  
  logger.info('DashboardSSEConnected', { dashboardType, userId, connectionId });
}

/**
 * Load dashboard data and send via SSE
 */
async function loadAndSendDashboardData(
  pool: Pool,
  userId: string,
  dashboardType: 'rm' | 'srm' | 'regional-head',
  res: Response,
  connectionId: string
): Promise<void> {
  try {
    let metrics;
    
    if (dashboardType === 'rm') {
      metrics = await computeUserMetrics(pool, userId);
    } else if (dashboardType === 'srm') {
      metrics = await computeManagerMetrics(pool, userId, false);
    } else if (dashboardType === 'regional-head') {
      metrics = await computeManagerMetrics(pool, userId, false);
    } else {
      return;
    }
    
    const message = `id: ${Date.now()}\nevent: dashboard-update\ndata: ${JSON.stringify({
      dashboardType,
      userId,
      metrics,
      timestamp: new Date().toISOString()
    })}\n\n`;
    
    if (!res.writableEnded) {
      res.write(message);
      logger.debug('DashboardSSEUpdate', { dashboardType, userId });
    }
  } catch (err) {
    logger.error('DashboardSSEError', { 
      error: (err as Error).message, 
      dashboardType, 
      userId 
    });
    
    if (!res.writableEnded) {
      res.write(`id: ${Date.now()}\nevent: error\ndata: ${JSON.stringify({
        error: 'Failed to load dashboard data',
        timestamp: new Date().toISOString()
      })}\n\n`);
    }
  }
}

/**
 * Broadcast dashboard update to all connected clients for a user
 */
export function broadcastDashboardUpdate(
  userId: string,
  dashboardType: 'rm' | 'srm' | 'regional-head',
  metrics: any
): void {
  const connectionKey = `${dashboardType}-${userId}`;
  const connections = activeDashboardConnections.get(connectionKey);
  
  if (!connections || connections.size === 0) {
    return;
  }
  
  const message = `id: ${Date.now()}\nevent: dashboard-update\ndata: ${JSON.stringify({
    dashboardType,
    userId,
    metrics,
    timestamp: new Date().toISOString()
  })}\n\n`;
  
  connections.forEach(res => {
    try {
      if (!res.writableEnded) {
        res.write(message);
      }
    } catch (err) {
      connections.delete(res);
      logger.warn('DashboardSSEWriteError', { 
        error: (err as Error).message, 
        userId, 
        dashboardType 
      });
    }
  });
  
  logger.debug('DashboardSSEBroadcast', { userId, dashboardType, connections: connections.size });
}

/**
 * Cleanup connection
 */
function cleanupConnection(connectionKey: string, res: Response): void {
  const connections = activeDashboardConnections.get(connectionKey);
  if (connections) {
    connections.delete(res);
    if (connections.size === 0) {
      activeDashboardConnections.delete(connectionKey);
    }
  }
}

/**
 * Close all dashboard SSE connections for a user
 */
export function closeDashboardSSE(userId: string, dashboardType: 'rm' | 'srm' | 'regional-head'): void {
  const connectionKey = `${dashboardType}-${userId}`;
  const connections = activeDashboardConnections.get(connectionKey);
  
  if (connections) {
    connections.forEach(res => {
      try {
        if (!res.writableEnded) {
          res.end();
        }
      } catch (err) {
        logger.warn('DashboardSSECloseError', { error: (err as Error).message });
      }
    });
    activeDashboardConnections.delete(connectionKey);
  }
  
  logger.debug('DashboardSSEClosed', { userId, dashboardType });
}

