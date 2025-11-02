import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { createLogger } from '@los/shared-libs';

const logger = createLogger('application-service:rm-access-control');

/**
 * Middleware to ensure RM users can only access applications assigned to them
 */
export function rmAccessControl(pool: Pool) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Extract user from request (set by API gateway or auth middleware)
      const userId = (req as any).user?.id || (req as any).user?.sub;
      const userRoles = (req as any).user?.roles || [];

      // If no user, skip access control (will be handled by auth middleware)
      if (!userId) {
        return next();
      }

      // Check if user is an RM
      const isRM = userRoles.some((role: string) => 
        role.toLowerCase() === 'rm' || role.toLowerCase() === 'relationship_manager'
      );

      // If not an RM, allow access (admins, ops, etc. can see all)
      if (!isRM) {
        return next();
      }

      // For RM users, check access to specific application
      if (req.params.id) {
        const { rows } = await pool.query(
          'SELECT assigned_to FROM applications WHERE application_id = $1',
          [req.params.id]
        );

        if (rows.length === 0) {
          return res.status(404).json({ error: 'Application not found' });
        }

        // If application is assigned to this RM, allow access
        if (rows[0].assigned_to === userId) {
          return next();
        }

        // If application exists but not assigned to this RM, deny access
        logger.warn('RMUnauthorizedAccess', {
          userId,
          applicationId: req.params.id,
          assignedTo: rows[0].assigned_to
        });
        return res.status(403).json({ 
          error: 'Access denied. This application is not assigned to you.' 
        });
      }

      // For list endpoints, filtering by assigned_to will happen in the query
      return next();
    } catch (err) {
      logger.error('RMAccessControlError', { error: (err as Error).message });
      return res.status(500).json({ error: 'Access control check failed' });
    }
  };
}

/**
 * Helper function to add RM filter to WHERE clause for list queries
 */
export function addRmFilter(conditions: string[], values: any[], paramCount: number, userId: string): number {
  const userRoles = (global as any).currentUserRoles || []; // Would be set by middleware
  const isRM = userRoles.some((role: string) => 
    role.toLowerCase() === 'rm' || role.toLowerCase() === 'relationship_manager'
  );

  if (isRM) {
    conditions.push(`assigned_to = $${paramCount++}`);
    values.push(userId);
  }

  return paramCount;
}

