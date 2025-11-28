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

      // Calculate statistics for applications assigned to this RM
      // Use Supabase SDK or pool
      let statsRow: any;
      
      if (supabaseClient) {
        // Use Supabase SDK - get counts for each status
        try {
          const [draft, submitted, inProgress, approved, rejected, total] = await Promise.all([
            supabaseClient.from('applications').select('*', { count: 'exact', head: true }).eq('assigned_to', userId).eq('status', 'Draft'),
            supabaseClient.from('applications').select('*', { count: 'exact', head: true }).eq('assigned_to', userId).eq('status', 'Submitted'),
            supabaseClient.from('applications').select('*', { count: 'exact', head: true }).eq('assigned_to', userId).in('status', ['PendingVerification', 'UnderReview', 'InProgress']),
            supabaseClient.from('applications').select('*', { count: 'exact', head: true }).eq('assigned_to', userId).eq('status', 'Approved'),
            supabaseClient.from('applications').select('*', { count: 'exact', head: true }).eq('assigned_to', userId).eq('status', 'Rejected'),
            supabaseClient.from('applications').select('*', { count: 'exact', head: true }).eq('assigned_to', userId),
          ]);
          
          statsRow = {
            draft_count: draft.count || 0,
            submitted_count: submitted.count || 0,
            in_progress_count: inProgress.count || 0,
            approved_count: approved.count || 0,
            rejected_count: rejected.count || 0,
            total_count: total.count || 0,
          };
        } catch (sdkError: any) {
          logger.error('RMDashboardSDKError', { error: sdkError.message, userId });
          // Fallback to pool if SDK fails
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
          const statsResult = await querySupabase(supabaseClient, statsQuery, [userId]);
          statsRow = statsResult.rows[0];
        }
      } else {
        throw new Error('Supabase client is required');
      }

      // Get recent applications (last 10, ordered by creation date)
      let recentRows: any[];
      
      if (supabaseClient) {
        try {
          const { data, error } = await supabaseClient
            .from('applications')
            .select('application_id, applicant_id, status, requested_amount, product_code, channel, created_at, updated_at')
            .eq('assigned_to', userId)
            .order('created_at', { ascending: false })
            .limit(10);
          
          if (error) throw error;
          recentRows = data || [];
        } catch (sdkError: any) {
          logger.error('RMDashboardRecentSDKError', { error: sdkError.message, userId });
          // Fallback to pool
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
          const recentResult = await querySupabase(supabaseClient, recentQuery, [userId]);
          recentRows = recentResult.rows;
        }
      } else {
        throw new Error('Supabase client is required');
      }

      // Calculate total loan amount and conversion metrics
      let amountRow: any;
      let conversionRow: any;
      
      if (supabaseClient) {
        try {
          // Get applications for calculations
          const { data: apps, error: appsError } = await supabaseClient
            .from('applications')
            .select('requested_amount, status')
            .eq('assigned_to', userId);
          
          if (appsError) throw appsError;
          
          const activeApps = (apps || []).filter(a => !['Rejected', 'Withdrawn'].includes(a.status));
          const totalAmount = activeApps.reduce((sum, a) => sum + parseFloat(a.requested_amount || 0), 0);
          const avgAmount = activeApps.length > 0 ? totalAmount / activeApps.length : 0;
          
          amountRow = {
            total_amount: totalAmount,
            avg_amount: avgAmount,
          };
          
          const allApps = apps || [];
          conversionRow = {
            disbursed_count: allApps.filter(a => a.status === 'Disbursed').length,
            approved_count: allApps.filter(a => a.status === 'Approved').length,
            rejected_count: allApps.filter(a => a.status === 'Rejected').length,
            submitted_count: allApps.filter(a => a.status === 'Submitted').length,
          };
        } catch (sdkError: any) {
          logger.error('RMDashboardAmountSDKError', { error: sdkError.message, userId });
          // Fallback to pool
          const amountQuery = `
            SELECT 
              COALESCE(SUM(requested_amount), 0) as total_amount,
              COALESCE(AVG(requested_amount), 0) as avg_amount
            FROM applications
            WHERE assigned_to = $1 AND status NOT IN ('Rejected', 'Withdrawn')
          `;
          const amountResult = await querySupabase(supabaseClient, amountQuery, [userId]);
          amountRow = amountResult.rows[0];

          const conversionQuery = `
            SELECT 
              COUNT(*) FILTER (WHERE status = 'Disbursed') as disbursed_count,
              COUNT(*) FILTER (WHERE status = 'Approved') as approved_count,
              COUNT(*) FILTER (WHERE status = 'Rejected') as rejected_count,
              COUNT(*) FILTER (WHERE status = 'Submitted') as submitted_count
            FROM applications
            WHERE assigned_to = $1
          `;
          const conversionResult = await querySupabase(supabaseClient, conversionQuery, [userId]);
          conversionRow = conversionResult.rows[0];
        }
      } else {
        const amountQuery = `
          SELECT 
            COALESCE(SUM(requested_amount), 0) as total_amount,
            COALESCE(AVG(requested_amount), 0) as avg_amount
          FROM applications
          WHERE assigned_to = $1 AND status NOT IN ('Rejected', 'Withdrawn')
        `;
        const amountResult = await querySupabase(supabaseClient, amountQuery, [userId]);
        amountRow = amountResult.rows[0];

        const conversionQuery = `
          SELECT 
            COUNT(*) FILTER (WHERE status = 'Disbursed') as disbursed_count,
            COUNT(*) FILTER (WHERE status = 'Approved') as approved_count,
            COUNT(*) FILTER (WHERE status = 'Rejected') as rejected_count,
            COUNT(*) FILTER (WHERE status = 'Submitted') as submitted_count
          FROM applications
          WHERE assigned_to = $1
        `;
        const conversionResult = await querySupabase(supabaseClient, conversionQuery, [userId]);
        conversionRow = conversionResult.rows[0];
      }

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

