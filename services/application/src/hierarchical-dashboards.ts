/**
 * Hierarchical Dashboard Service
 * Computes aggregated dashboards dynamically based on reporting hierarchy
 * Mappings stored in database - aggregates computed at runtime
 */

import { Pool } from 'pg';
import { Request, Response } from 'express';
import { Express } from 'express';

interface DashboardMetrics {
  totalApplications: number;
  applicationsByStatus: Record<string, number>;
  totalRequestedAmount: number;
  averageTAT: number;
  pipeline: {
    draft: number;
    submitted: number;
    inProgress: number;
    pendingVerification: number;
    underReview: number;
    approved: number;
    rejected: number;
  };
  reportees?: Array<{
    userId: string;
    username: string;
    email: string;
    designation: string;
    metrics: DashboardMetrics;
  }>;
}

/**
 * Get all direct reportees of a user (recursive not needed - we compute aggregates at each level)
 */
async function getDirectReportees(pool: Pool, managerId: string): Promise<Array<{
  user_id: string;
  username: string;
  email: string;
  designation: string;
  roles: string[];
}>> {
  // Use fully qualified table name to avoid schema visibility issues
  const { rows } = await pool.query(
    `SELECT user_id, username, email, designation, roles
     FROM public.users
     WHERE reports_to = $1::uuid AND COALESCE(is_active, true) = true
     ORDER BY username`,
    [managerId]
  );
  return rows;
}

/**
 * Get all users in a manager's hierarchy (all levels below)
 * Used for computing aggregates across entire team
 */
async function getAllSubordinates(pool: Pool, managerId: string): Promise<string[]> {
  // Recursive query to get all subordinates at all levels
  // Use fully qualified table names to avoid schema visibility issues
  try {
    const { rows } = await pool.query(
      `WITH RECURSIVE subordinates AS (
        SELECT user_id, reports_to, 1 as depth, ARRAY[user_id] as path
        FROM public.users
        WHERE reports_to = $1::uuid AND COALESCE(is_active, true) = true
        UNION ALL
        SELECT u.user_id, u.reports_to, s.depth + 1, s.path || u.user_id
        FROM public.users u
        INNER JOIN subordinates s ON u.reports_to::uuid = s.user_id::uuid
        WHERE COALESCE(u.is_active, true) = true
          AND u.user_id != ALL(s.path)  -- Prevent cycles: don't revisit nodes in path
          AND s.depth < 100  -- Safety limit: max depth to prevent infinite recursion
      )
      SELECT DISTINCT user_id FROM subordinates`,
      [managerId]
    );
    console.log('getAllSubordinates result', { managerId, rowCount: rows.length, sampleRow: rows[0], userIds: rows.map(r => r.user_id) });
    return rows.map(r => r.user_id);
  } catch (err) {
    console.error('getAllSubordinatesError', { managerId, error: (err as Error).message });
    throw err;
  }
}

/**
 * Compute dashboard metrics for a user (based on their assigned applications)
 */
async function computeUserMetrics(
  pool: Pool,
  userId: string
): Promise<DashboardMetrics> {
  const { rows } = await pool.query(
    `SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'Draft') as draft,
      COUNT(*) FILTER (WHERE status = 'Submitted') as submitted,
      COUNT(*) FILTER (WHERE status = 'InProgress') as in_progress,
      COUNT(*) FILTER (WHERE status = 'PendingVerification') as pending_verification,
      COUNT(*) FILTER (WHERE status = 'UnderReview') as under_review,
      COUNT(*) FILTER (WHERE status = 'Approved') as approved,
      COUNT(*) FILTER (WHERE status = 'Rejected') as rejected,
      COALESCE(SUM(requested_amount), 0) as total_amount,
      AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/86400) as avg_tat_days
    FROM applications
    WHERE assigned_to = $1`,
    [userId]
  );

  const metrics = rows[0] || {};

  return {
    totalApplications: parseInt(metrics.total || '0', 10),
    applicationsByStatus: {
      Draft: parseInt(metrics.draft || '0', 10),
      Submitted: parseInt(metrics.submitted || '0', 10),
      InProgress: parseInt(metrics.in_progress || '0', 10),
      PendingVerification: parseInt(metrics.pending_verification || '0', 10),
      UnderReview: parseInt(metrics.under_review || '0', 10),
      Approved: parseInt(metrics.approved || '0', 10),
      Rejected: parseInt(metrics.rejected || '0', 10),
    },
    totalRequestedAmount: parseFloat(metrics.total_amount || '0'),
    averageTAT: parseFloat(metrics.avg_tat_days || '0'),
    pipeline: {
      draft: parseInt(metrics.draft || '0', 10),
      submitted: parseInt(metrics.submitted || '0', 10),
      inProgress: parseInt(metrics.in_progress || '0', 10),
      pendingVerification: parseInt(metrics.pending_verification || '0', 10),
      underReview: parseInt(metrics.under_review || '0', 10),
      approved: parseInt(metrics.approved || '0', 10),
      rejected: parseInt(metrics.rejected || '0', 10),
    },
  };
}

/**
 * Compute aggregated metrics for a manager (sum of all subordinates)
 */
async function computeManagerMetrics(
  pool: Pool,
  managerId: string,
  includeReportees: boolean = false
): Promise<DashboardMetrics> {
  try {
    // Get all subordinates (recursive)
    const subordinateIds = await getAllSubordinates(pool, managerId);
    
    console.log('computeManagerMetrics', { managerId, subordinateCount: subordinateIds.length, subordinateIds });

    if (subordinateIds.length === 0) {
      // Manager has no subordinates, return empty metrics
      return {
        totalApplications: 0,
        applicationsByStatus: {},
        totalRequestedAmount: 0,
        averageTAT: 0,
        pipeline: {
          draft: 0,
          submitted: 0,
          inProgress: 0,
          pendingVerification: 0,
          underReview: 0,
          approved: 0,
          rejected: 0,
        },
        reportees: [],
      };
    }

    // Aggregate all applications assigned to subordinates
    const { rows } = await pool.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'Draft') as draft,
        COUNT(*) FILTER (WHERE status = 'Submitted') as submitted,
        COUNT(*) FILTER (WHERE status = 'InProgress') as in_progress,
        COUNT(*) FILTER (WHERE status = 'PendingVerification') as pending_verification,
        COUNT(*) FILTER (WHERE status = 'UnderReview') as under_review,
        COUNT(*) FILTER (WHERE status = 'Approved') as approved,
        COUNT(*) FILTER (WHERE status = 'Rejected') as rejected,
        COALESCE(SUM(requested_amount), 0) as total_amount,
        AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/86400) as avg_tat_days
      FROM applications
      WHERE assigned_to = ANY($1::uuid[])`,
      [subordinateIds]
    );

    const metrics = rows[0] || {};
    
    console.log('computeManagerMetrics', { managerId, metrics: metrics.total, subordinateIds });

    // Get direct reportees if requested (for drill-down)
    let reportees: DashboardMetrics['reportees'] = [];
    if (includeReportees) {
      const directReportees = await getDirectReportees(pool, managerId);
      
      // Get metrics for each reportee
      const reporteesWithMetrics = await Promise.all(
        directReportees.map(async (reportee) => {
          let reporteeMetrics: DashboardMetrics;
          // If reportee is a manager (has their own reportees), compute manager metrics
          // For RMs, check if they have any direct reportees (not recursive check to avoid infinite loop)
          const directReportees = await getDirectReportees(pool, reportee.user_id);
          if (directReportees.length > 0 && reportee.designation !== 'Relationship Manager') {
            // Only SRMs and above have reportees, RMs are always leaf nodes
            reporteeMetrics = await computeManagerMetrics(pool, reportee.user_id, false);
          } else {
            reporteeMetrics = await computeUserMetrics(pool, reportee.user_id);
          }
          return {
            userId: reportee.user_id,
            username: reportee.username,
            email: reportee.email,
            designation: reportee.designation,
            roles: reportee.roles,
            metrics: reporteeMetrics,
          };
        })
      );

      reportees = reporteesWithMetrics;
    }

    return {
      totalApplications: parseInt(metrics.total || '0', 10),
      applicationsByStatus: {
        Draft: parseInt(metrics.draft || '0', 10),
        Submitted: parseInt(metrics.submitted || '0', 10),
        InProgress: parseInt(metrics.in_progress || '0', 10),
        PendingVerification: parseInt(metrics.pending_verification || '0', 10),
        UnderReview: parseInt(metrics.under_review || '0', 10),
        Approved: parseInt(metrics.approved || '0', 10),
        Rejected: parseInt(metrics.rejected || '0', 10),
      },
      totalRequestedAmount: parseFloat(metrics.total_amount || '0'),
      averageTAT: parseFloat(metrics.avg_tat_days || '0'),
      pipeline: {
        draft: parseInt(metrics.draft || '0', 10),
        submitted: parseInt(metrics.submitted || '0', 10),
        inProgress: parseInt(metrics.in_progress || '0', 10),
        pendingVerification: parseInt(metrics.pending_verification || '0', 10),
        underReview: parseInt(metrics.under_review || '0', 10),
        approved: parseInt(metrics.approved || '0', 10),
        rejected: parseInt(metrics.rejected || '0', 10),
      },
      reportees,
    };
  } catch (err) {
    console.error('computeManagerMetricsError', { managerId, error: (err as Error).message, stack: (err as Error).stack });
    throw err;
  }
}

/**
 * Setup hierarchical dashboard endpoints
 */
export function setupHierarchicalDashboards(app: Express, pool: Pool) {
  // GET /api/dashboard/rm/:userId - RM's own dashboard
  app.get('/api/dashboard/rm/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId)) {
        return res.status(400).json({ error: 'Invalid user ID format' });
      }
      
      const metrics = await computeUserMetrics(pool, userId);
      res.json({ userId, ...metrics });
    } catch (err) {
      console.error('RMDashboardError', err);
      res.status(500).json({ error: 'Failed to fetch RM dashboard' });
    }
  });

  // GET /api/dashboard/srm/:srmId - SRM's aggregated dashboard (all their RMs)
  app.get('/api/dashboard/srm/:srmId', async (req: Request, res: Response) => {
    try {
      const { srmId } = req.params;
      
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(srmId)) {
        return res.status(400).json({ error: 'Invalid SRM ID format' });
      }
      
      const includeReportees = req.query.includeReportees === 'true';
      console.log('SRMDashboardRequest', { srmId, includeReportees });
      const metrics = await computeManagerMetrics(pool, srmId, includeReportees);
      res.json({ srmId, ...metrics });
    } catch (err) {
      const error = err as Error;
      console.error('SRMDashboardError', { srmId: req.params.srmId, error: error.message, stack: error.stack });
      res.status(500).json({ error: 'Failed to fetch SRM dashboard', details: error.message });
    }
  });

  // GET /api/dashboard/regional-head/:headId - Regional Head's aggregated dashboard (all SRMs)
  app.get('/api/dashboard/regional-head/:headId', async (req: Request, res: Response) => {
    try {
      const { headId } = req.params;
      
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(headId)) {
        return res.status(400).json({ error: 'Invalid Regional Head ID format' });
      }
      
      const includeReportees = req.query.includeReportees === 'true';
      const metrics = await computeManagerMetrics(pool, headId, includeReportees);
      res.json({ regionalHeadId: headId, ...metrics });
    } catch (err) {
      console.error('RegionalHeadDashboardError', err);
      res.status(500).json({ error: 'Failed to fetch Regional Head dashboard' });
    }
  });

  // GET /api/hierarchy/reportees/:managerId - Get direct reportees (for drill-down)
  app.get('/api/hierarchy/reportees/:managerId', async (req: Request, res: Response) => {
    try {
      const { managerId } = req.params;
      
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(managerId)) {
        return res.status(400).json({ error: 'Invalid manager ID format' });
      }
      
      const reportees = await getDirectReportees(pool, managerId);
      
      // Get metrics for each reportee
      const reporteesWithMetrics = await Promise.all(
        reportees.map(async (reportee) => {
          let metrics: DashboardMetrics;
          // If reportee is a manager (has their own reportees), compute manager metrics
          const hasSubordinates = (await getAllSubordinates(pool, reportee.user_id)).length > 0;
          if (hasSubordinates) {
            metrics = await computeManagerMetrics(pool, reportee.user_id, false);
          } else {
            metrics = await computeUserMetrics(pool, reportee.user_id);
          }
          return {
            userId: reportee.user_id,
            username: reportee.username,
            email: reportee.email,
            designation: reportee.designation,
            roles: reportee.roles,
            metrics,
          };
        })
      );

      res.json({ managerId, reportees: reporteesWithMetrics });
    } catch (err) {
      console.error('GetReporteesError', err);
      res.status(500).json({ error: 'Failed to fetch reportees' });
    }
  });
}

