import { SupabaseClient, querySupabase } from '@los/shared-libs';
import { Request, Response } from 'express';
import { createLogger } from '@los/shared-libs';

const logger = createLogger('application-service:rm-dashboard');

/**
 * RM Dashboard endpoint handler
 * Returns statistics and recent applications for the current RM user
 */
export function setupRMDashboardEndpoint(app: any, pool: any, supabaseClient: SupabaseClient | null) {
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

      // Calculate statistics and metrics for applications assigned to this RM
      // Use Supabase SDK REST API (HTTP) instead of direct PostgreSQL to avoid Docker networking issues
      logger.debug('RMDashboardStatsQuery', { userId, method: 'Supabase SDK REST API' });
      
      let statsRow: any;
      let totalAmount = 0;
      let avgAmount = 0;
      let totalSubmitted = 0;
      let totalApproved = 0;
      let totalRejected = 0;
      let totalDisbursed = 0;

      try {
        // Single fetch for all applications for this RM
        const { data: allApps, error: fetchError } = await supabaseClient
          .from('applications')
          .select('status, requested_amount')
          .eq('assigned_to', userId);
        
        if (fetchError) {
          logger.error('RMDashboardFetchError', { error: fetchError.message, userId });
          throw fetchError;
        }
        
        const apps = allApps || [];

        // Basic status counts
        statsRow = {
          draft_count: apps.filter((a: any) => a.status === 'Draft').length,
          submitted_count: apps.filter((a: any) => a.status === 'Submitted').length,
          in_progress_count: apps.filter((a: any) => 
            ['PendingVerification', 'UnderReview', 'InProgress'].includes(a.status)
          ).length,
          approved_count: apps.filter((a: any) => a.status === 'Approved').length,
          rejected_count: apps.filter((a: any) => a.status === 'Rejected').length,
          total_count: apps.length
        };

        // Amount metrics (exclude rejected/withdrawn)
        const validApps = apps.filter((a: any) => 
          a.requested_amount && !['Rejected', 'Withdrawn'].includes(a.status)
        );
        totalAmount = validApps.reduce(
          (sum: number, a: any) => sum + (parseFloat(a.requested_amount) || 0),
          0
        );
        avgAmount = validApps.length > 0 ? totalAmount / validApps.length : 0;

        // Conversion metrics from same data
        totalSubmitted = apps.filter((a: any) => a.status === 'Submitted').length;
        totalApproved = apps.filter((a: any) => a.status === 'Approved').length;
        totalRejected = apps.filter((a: any) => a.status === 'Rejected').length;
        totalDisbursed = apps.filter((a: any) => a.status === 'Disbursed').length;
      } catch (queryError: any) {
        logger.error('RMDashboardStatsQueryError', { error: queryError.message, stack: queryError.stack, userId });
        throw queryError;
      }

      // Get recent applications (last 10, ordered by creation date)
      // Use Supabase SDK REST API (HTTP) instead of direct PostgreSQL
      const { data: recentApps, error: recentError } = await supabaseClient
        .from('applications')
        .select('application_id, applicant_id, status, requested_amount, product_code, channel, created_at, updated_at')
        .eq('assigned_to', userId)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (recentError) {
        logger.error('RMDashboardRecentError', { error: recentError.message, userId });
        throw recentError;
      }
      
      const recentRows = recentApps || [];

      const amountRow = {
        total_amount: totalAmount,
        avg_amount: avgAmount
      };
      
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

      const recentApplications = recentRows.map(row => ({
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

