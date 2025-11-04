import { Pool } from 'pg';
import { Request, Response } from 'express';
import { createLogger } from '@los/shared-libs';

const logger = createLogger('application-service:rm-dashboard');

/**
 * RM Dashboard endpoint handler
 * Returns statistics and recent applications for the current RM user
 */
export function setupRMDashboardEndpoint(app: any, pool: Pool) {
  app.get('/api/applications/rm/dashboard', async (req: Request, res: Response) => {
    try {
      // Get current user from request (set by API gateway auth middleware)
      // Check both req.user (if middleware populated it) and headers (if gateway forwarded it)
      const userId = (req as any).user?.id || 
                     (req as any).user?.sub || 
                     req.headers['x-user-id'] as string ||
                     req.headers['X-User-Id'] as string;
      
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized. User ID required.' });
      }

      // Calculate statistics for applications assigned to this RM
      // Aligned with Svatantra requirements:
      // - Draft: Applications being created by RM
      // - Submitted: Applications submitted by RM, awaiting processing/verification
      // - Active/In Progress: Applications actively being processed (PendingVerification, UnderReview, InProgress)
      // - Approved: Applications approved for disbursement
      // - Rejected: Applications rejected during review
      const statsQuery = `
        SELECT 
          COUNT(*) FILTER (WHERE status = 'Draft') as draft_count,
          COUNT(*) FILTER (WHERE status = 'Submitted') as submitted_count,
          COUNT(*) FILTER (WHERE status IN ('PendingVerification', 'UnderReview', 'InProgress')) as in_progress_count,
          COUNT(*) FILTER (WHERE status = 'Approved') as approved_count,
          COUNT(*) FILTER (WHERE status = 'Rejected') as rejected_count,
          COUNT(*) as total_count
        FROM applications
        WHERE assigned_to = $1
      `;

      const statsResult = await pool.query(statsQuery, [userId]);
      const statsRow = statsResult.rows[0];

      // Get recent applications (last 10, ordered by creation date)
      const recentQuery = `
        SELECT 
          application_id,
          applicant_id,
          status,
          requested_amount,
          product_code,
          channel,
          created_at,
          updated_at
        FROM applications
        WHERE assigned_to = $1
        ORDER BY created_at DESC
        LIMIT 10
      `;

      const recentResult = await pool.query(recentQuery, [userId]);

      // Calculate total loan amount for assigned applications
      const amountQuery = `
        SELECT 
          COALESCE(SUM(requested_amount), 0) as total_amount,
          COALESCE(AVG(requested_amount), 0) as avg_amount
        FROM applications
        WHERE assigned_to = $1 AND status NOT IN ('Rejected', 'Withdrawn')
      `;

      const amountResult = await pool.query(amountQuery, [userId]);
      const amountRow = amountResult.rows[0];

      // Calculate conversion metrics
      const conversionQuery = `
        SELECT 
          COUNT(*) FILTER (WHERE status = 'Disbursed') as disbursed_count,
          COUNT(*) FILTER (WHERE status = 'Approved') as approved_count,
          COUNT(*) FILTER (WHERE status = 'Rejected') as rejected_count,
          COUNT(*) FILTER (WHERE status = 'Submitted') as submitted_count
        FROM applications
        WHERE assigned_to = $1
      `;

      const conversionResult = await pool.query(conversionQuery, [userId]);
      const conversionRow = conversionResult.rows[0];

      const totalSubmitted = parseInt(conversionRow.submitted_count || 0, 10);
      const totalApproved = parseInt(conversionRow.approved_count || 0, 10);
      const totalRejected = parseInt(conversionRow.rejected_count || 0, 10);
      const totalDisbursed = parseInt(conversionRow.disbursed_count || 0, 10);
      
      const approvalRate = totalSubmitted > 0 ? ((totalApproved / totalSubmitted) * 100).toFixed(1) : '0.0';
      const rejectionRate = totalSubmitted > 0 ? ((totalRejected / totalSubmitted) * 100).toFixed(1) : '0.0';

      const stats = {
        total: parseInt(statsRow.total_count || 0, 10),
        draft: parseInt(statsRow.draft_count || 0, 10),
        submitted: parseInt(statsRow.submitted_count || 0, 10),
        inProgress: parseInt(statsRow.in_progress_count || 0, 10),
        approved: parseInt(statsRow.approved_count || 0, 10),
        rejected: parseInt(statsRow.rejected_count || 0, 10),
        disbursed: totalDisbursed,
        totalLoanAmount: parseFloat(amountRow.total_amount || 0),
        avgLoanAmount: parseFloat(amountRow.avg_amount || 0),
        approvalRate: parseFloat(approvalRate),
        rejectionRate: parseFloat(rejectionRate),
      };

      const recentApplications = recentResult.rows.map(row => ({
        application_id: row.application_id,
        applicant_id: row.applicant_id,
        status: row.status,
        requested_amount: parseFloat(row.requested_amount || 0),
        product_code: row.product_code,
        channel: row.channel,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));

      logger.debug('RMDashboard', { 
        correlationId: (req as any).correlationId, 
        userId,
        stats
      });

      return res.status(200).json({
        stats,
        recentApplications,
        userId,
      });
    } catch (err) {
      logger.error('RMDashboardError', { error: (err as Error).message, correlationId: (req as any).correlationId });
      return res.status(500).json({ error: 'Failed to fetch RM dashboard data' });
    }
  });
}

