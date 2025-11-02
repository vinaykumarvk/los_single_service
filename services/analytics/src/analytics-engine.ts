/**
 * Advanced Analytics Engine
 * 
 * Implements:
 * - Custom report builder
 * - Predictive analytics
 * - Portfolio risk analysis
 * - Trend analysis
 */

import { Pool } from 'pg';
import { createLogger } from '@los/shared-libs';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

const logger = createLogger('analytics-engine');

export interface CustomReportConfig {
  name: string;
  description?: string;
  filters?: Record<string, any>;
  metrics: string[];
  dimensions: string[];
  dateRange?: {
    startDate?: string;
    endDate?: string;
  };
  groupBy?: string[];
  orderBy?: string;
  limit?: number;
}

export interface CustomReportResult {
  reportId: string;
  name: string;
  data: any[];
  summary: {
    totalRows: number;
    metrics: Record<string, number>;
  };
  metadata: {
    generatedAt: string;
    queryTime: number;
  };
}

/**
 * Build custom report based on user-defined configuration
 */
export async function buildCustomReport(
  pool: Pool,
  config: CustomReportConfig
): Promise<CustomReportResult> {
  const startTime = Date.now();

  logger.info('BuildingCustomReport', {
    name: config.name,
    metrics: config.metrics,
    dimensions: config.dimensions
  });

  // Build SQL query dynamically
  const query = buildReportQuery(config);

  // Execute query
  const { rows } = await pool.query(query.sql, query.params);

  // Calculate summary metrics
  const summary = calculateSummaryMetrics(rows, config.metrics);

  const queryTime = Date.now() - startTime;

  return {
    reportId: `report_${Date.now()}`,
    name: config.name,
    data: rows,
    summary: {
      totalRows: rows.length,
      metrics: summary
    },
    metadata: {
      generatedAt: new Date().toISOString(),
      queryTime
    }
  };
}

function buildReportQuery(config: CustomReportConfig): { sql: string; params: any[] } {
  const params: any[] = [];
  let paramCount = 1;

  // Build SELECT clause
  const selectFields: string[] = [];
  
  // Add dimensions
  config.dimensions.forEach(dim => {
    selectFields.push(`${dim} as "${dim}"`);
  });

  // Add metrics
  config.metrics.forEach(metric => {
    selectFields.push(`${getMetricExpression(metric)} as "${metric}"`);
  });

  // Build FROM clause
  const fromClause = getFromClause(config);

  // Build WHERE clause
  const whereConditions: string[] = [];
  
  if (config.dateRange?.startDate) {
    whereConditions.push(`created_at >= $${paramCount++}`);
    params.push(config.dateRange.startDate);
  }
  
  if (config.dateRange?.endDate) {
    whereConditions.push(`created_at <= $${paramCount++}`);
    params.push(config.dateRange.endDate);
  }

  // Add custom filters
  if (config.filters) {
    Object.entries(config.filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        whereConditions.push(`${key} = $${paramCount++}`);
        params.push(value);
      }
    });
  }

  // Build GROUP BY clause
  const groupByClause = config.groupBy && config.groupBy.length > 0
    ? `GROUP BY ${config.groupBy.join(', ')}`
    : '';

  // Build ORDER BY clause
  const orderByClause = config.orderBy ? `ORDER BY ${config.orderBy}` : '';

  // Build LIMIT clause
  const limitClause = config.limit ? `LIMIT ${config.limit}` : '';

  const whereClause = whereConditions.length > 0
    ? `WHERE ${whereConditions.join(' AND ')}`
    : '';

  const sql = `
    SELECT ${selectFields.join(', ')}
    FROM ${fromClause}
    ${whereClause}
    ${groupByClause}
    ${orderByClause}
    ${limitClause}
  `;

  return { sql: sql.trim(), params };
}

function getFromClause(config: CustomReportConfig): string {
  // Determine which tables to join based on metrics/dimensions
  const tables = new Set<string>(['applications']);

  // Check if we need to join other tables
  const allFields = [...config.dimensions, ...config.metrics];
  
  if (allFields.some(f => f.includes('decision') || f.includes('underwriting'))) {
    tables.add('underwriting_decisions');
  }
  
  if (allFields.some(f => f.includes('sanction') || f.includes('offer'))) {
    tables.add('sanctions');
  }
  
  if (allFields.some(f => f.includes('disbursement'))) {
    tables.add('disbursements');
  }

  // Build JOIN clauses
  let fromClause = 'applications';
  
  if (tables.has('underwriting_decisions')) {
    fromClause += ' LEFT JOIN underwriting_decisions ON applications.application_id = underwriting_decisions.application_id';
  }
  
  if (tables.has('sanctions')) {
    fromClause += ' LEFT JOIN sanctions ON applications.application_id = sanctions.application_id';
  }
  
  if (tables.has('disbursements')) {
    fromClause += ' LEFT JOIN disbursements ON applications.application_id = disbursements.application_id';
  }

  return fromClause;
}

function getMetricExpression(metric: string): string {
  const metricMap: Record<string, string> = {
    'totalApplications': 'COUNT(DISTINCT applications.application_id)',
    'totalAmount': 'SUM(applications.requested_amount)',
    'averageAmount': 'AVG(applications.requested_amount)',
    'approvalRate': `COUNT(DISTINCT CASE WHEN underwriting_decisions.decision = 'AUTO_APPROVE' THEN applications.application_id END) * 100.0 / NULLIF(COUNT(DISTINCT applications.application_id), 0)`,
    'rejectionRate': `COUNT(DISTINCT CASE WHEN underwriting_decisions.decision = 'DECLINE' THEN applications.application_id END) * 100.0 / NULLIF(COUNT(DISTINCT applications.application_id), 0)`,
    'totalDisbursed': 'SUM(disbursements.amount)',
    'avgTAT': 'AVG(EXTRACT(EPOCH FROM (applications.updated_at - applications.created_at)) / 86400)',
    'conversionRate': `COUNT(DISTINCT CASE WHEN applications.status = 'Disbursed' THEN applications.application_id END) * 100.0 / NULLIF(COUNT(DISTINCT applications.application_id), 0)`
  };

  return metricMap[metric] || `COUNT(${metric})`;
}

function calculateSummaryMetrics(rows: any[], metrics: string[]): Record<string, number> {
  const summary: Record<string, number> = {};

  metrics.forEach(metric => {
    const values = rows.map(row => parseFloat(row[metric] || 0)).filter(v => !isNaN(v));
    
    if (values.length > 0) {
      if (metric.includes('Rate') || metric.includes('Rate')) {
        summary[`avg_${metric}`] = values.reduce((a, b) => a + b, 0) / values.length;
      } else {
        summary[`total_${metric}`] = values.reduce((a, b) => a + b, 0);
        summary[`avg_${metric}`] = values.reduce((a, b) => a + b, 0) / values.length;
      }
    }
  });

  return summary;
}

/**
 * Predict approval rate based on historical data
 */
export async function predictApprovalRate(
  pool: Pool,
  options: {
    productCode?: string;
    channel?: string;
    timeframe?: string;
  }
): Promise<{
  predictedRate: number;
  confidence: number;
  historicalRate: number;
  trend: 'INCREASING' | 'DECREASING' | 'STABLE';
  factors: Array<{ factor: string; impact: number }>;
}> {
  logger.info('PredictingApprovalRate', options);

  // Get historical approval rates
  const days = parseTimeframe(options.timeframe || '30d');
  const startDate = subDays(new Date(), days);

  let query = `
    SELECT 
      COUNT(*) FILTER (WHERE ud.decision = 'AUTO_APPROVE') * 100.0 / NULLIF(COUNT(*), 0) as approval_rate,
      COUNT(*) as total_decisions
    FROM underwriting_decisions ud
    JOIN applications a ON ud.application_id = a.application_id
    WHERE ud.evaluated_at >= $1
  `;
  const params: any[] = [startDate.toISOString()];
  let paramCount = 2;

  if (options.productCode) {
    query += ` AND a.product_code = $${paramCount++}`;
    params.push(options.productCode);
  }

  if (options.channel) {
    query += ` AND a.channel = $${paramCount++}`;
    params.push(options.channel);
  }

  const { rows } = await pool.query(query, params);
  const historicalRate = parseFloat(rows[0]?.approval_rate || '0');

  // Simple prediction model (in production, use ML model)
  // Trend: compare recent vs older data
  const recentDays = Math.min(days / 2, 7);
  const recentStartDate = subDays(new Date(), recentDays);

  let recentQuery = query.replace('$1', `$${paramCount}`);
  params.push(recentStartDate.toISOString());

  const { rows: recentRows } = await pool.query(recentQuery, params);
  const recentRate = parseFloat(recentRows[0]?.approval_rate || '0');

  // Predict future rate (simple moving average trend)
  const trend = recentRate > historicalRate ? 'INCREASING' :
    recentRate < historicalRate ? 'DECREASING' : 'STABLE';

  const predictedRate = recentRate + (recentRate - historicalRate) * 0.3; // Extrapolate trend
  const predictedRateClamped = Math.max(0, Math.min(100, predictedRate));

  // Calculate confidence based on data volume
  const totalDecisions = parseInt(rows[0]?.total_decisions || '0', 10);
  const confidence = Math.min(1, totalDecisions / 100); // Higher confidence with more data

  // Identify factors
  const factors = [
    {
      factor: 'Historical Trend',
      impact: trend === 'INCREASING' ? 0.2 : trend === 'DECREASING' ? -0.2 : 0
    },
    {
      factor: 'Data Volume',
      impact: Math.min(0.15, totalDecisions / 1000)
    }
  ];

  return {
    predictedRate: Math.round(predictedRateClamped * 100) / 100,
    confidence: Math.round(confidence * 100) / 100,
    historicalRate: Math.round(historicalRate * 100) / 100,
    trend,
    factors
  };
}

/**
 * Predict application volume
 */
export async function predictApplicationVolume(
  pool: Pool,
  options: {
    days: number;
    channel?: string;
    productCode?: string;
  }
): Promise<{
  predictedVolume: number;
  confidence: number;
  dailyBreakdown: Array<{ date: string; predicted: number; historical?: number }>;
  factors: Array<{ factor: string; impact: number }>;
}> {
  logger.info('PredictingApplicationVolume', options);

  // Get historical volume
  const startDate = subDays(new Date(), options.days * 2); // Get 2x data for trend

  let query = `
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as volume
    FROM applications
    WHERE created_at >= $1
  `;
  const params: any[] = [startDate.toISOString()];
  let paramCount = 2;

  if (options.channel) {
    query += ` AND channel = $${paramCount++}`;
    params.push(options.channel);
  }

  if (options.productCode) {
    query += ` AND product_code = $${paramCount++}`;
    params.push(options.productCode);
  }

  query += ` GROUP BY DATE(created_at) ORDER BY date`;

  const { rows } = await pool.query(query, params);

  // Calculate average daily volume
  const historicalAvg = rows.length > 0
    ? rows.reduce((sum, row) => sum + parseInt(row.volume, 10), 0) / rows.length
    : 0;

  // Simple prediction: use moving average with trend
  const recentAvg = rows.length >= 7
    ? rows.slice(-7).reduce((sum, row) => sum + parseInt(row.volume, 10), 0) / 7
    : historicalAvg;

  const trend = recentAvg > historicalAvg ? 1.1 : recentAvg < historicalAvg ? 0.9 : 1.0;
  const predictedDailyVolume = recentAvg * trend;

  // Generate daily breakdown
  const dailyBreakdown: Array<{ date: string; predicted: number; historical?: number }> = [];
  for (let i = 0; i < options.days; i++) {
    const date = format(addDays(new Date(), i), 'yyyy-MM-dd');
    const historical = rows.find(r => r.date === date);
    
    dailyBreakdown.push({
      date,
      predicted: Math.round(predictedDailyVolume * (1 + (Math.random() - 0.5) * 0.2)), // Add some variation
      historical: historical ? parseInt(historical.volume, 10) : undefined
    });
  }

  const totalPredicted = dailyBreakdown.reduce((sum, day) => sum + day.predicted, 0);

  return {
    predictedVolume: totalPredicted,
    confidence: Math.min(1, rows.length / 30), // Higher confidence with more historical data
    dailyBreakdown,
    factors: [
      {
        factor: 'Historical Average',
        impact: historicalAvg
      },
      {
        factor: 'Recent Trend',
        impact: trend > 1 ? (trend - 1) * 10 : (1 - trend) * -10
      }
    ]
  };
}

/**
 * Analyze portfolio risk
 */
export async function analyzePortfolioRisk(
  pool: Pool,
  options: {
    productCode?: string;
    channel?: string;
  }
): Promise<{
  overallRiskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  riskFactors: Array<{ factor: string; risk: number; explanation: string }>;
  recommendations: string[];
}> {
  logger.info('AnalyzingPortfolioRisk', options);

  let query = `
    SELECT 
      COUNT(*) as total_applications,
      COUNT(*) FILTER (WHERE status = 'Disbursed') as disbursed,
      COUNT(*) FILTER (WHERE ud.decision = 'DECLINE') as declined,
      AVG(a.requested_amount) as avg_amount,
      SUM(CASE WHEN ud.decision = 'DECLINE' THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0) as decline_rate
    FROM applications a
    LEFT JOIN underwriting_decisions ud ON a.application_id = ud.application_id
    WHERE a.status NOT IN ('Withdrawn', 'Closed')
  `;
  const params: any[] = [];
  let paramCount = 1;

  if (options.productCode) {
    query += ` AND a.product_code = $${paramCount++}`;
    params.push(options.productCode);
  }

  if (options.channel) {
    query += ` AND a.channel = $${paramCount++}`;
    params.push(options.channel);
  }

  const { rows } = await pool.query(query, params);
  const data = rows[0];

  const totalApplications = parseInt(data.total_applications || '0', 10);
  const disbursed = parseInt(data.disbursed || '0', 10);
  const declineRate = parseFloat(data.decline_rate || '0');
  const avgAmount = parseFloat(data.avg_amount || '0');

  // Calculate risk factors
  const riskFactors: Array<{ factor: string; risk: number; explanation: string }> = [];

  // Decline rate risk
  let declineRisk = declineRate > 30 ? 0.8 : declineRate > 20 ? 0.5 : declineRate > 10 ? 0.3 : 0.1;
  riskFactors.push({
    factor: 'High Decline Rate',
    risk: declineRisk,
    explanation: `Decline rate of ${declineRate.toFixed(1)}% indicates ${declineRisk > 0.5 ? 'high' : 'moderate'} risk`
  });

  // Portfolio concentration risk
  const concentrationRisk = totalApplications < 100 ? 0.3 : 0.1;
  riskFactors.push({
    factor: 'Portfolio Concentration',
    risk: concentrationRisk,
    explanation: totalApplications < 100
      ? 'Low portfolio size increases concentration risk'
      : 'Portfolio size is adequate'
  });

  // Average amount risk
  const amountRisk = avgAmount > 10000000 ? 0.4 : avgAmount > 5000000 ? 0.2 : 0.1;
  riskFactors.push({
    factor: 'Average Loan Amount',
    risk: amountRisk,
    explanation: `Average loan amount of ₹${(avgAmount / 100000).toFixed(2)}L ${avgAmount > 10000000 ? 'increases' : 'is within acceptable'} risk`
  });

  // Calculate overall risk score (0-100)
  const overallRiskScore = Math.min(100, Math.round(
    riskFactors.reduce((sum, f) => sum + f.risk * 30, 0)
  ));

  const riskLevel = overallRiskScore >= 70 ? 'HIGH' :
    overallRiskScore >= 40 ? 'MEDIUM' : 'LOW';

  // Generate recommendations
  const recommendations: string[] = [];
  
  if (declineRisk > 0.5) {
    recommendations.push('Review underwriting criteria - decline rate is high');
  }
  
  if (concentrationRisk > 0.2) {
    recommendations.push('Diversify portfolio - increase application volume');
  }
  
  if (overallRiskScore > 60) {
    recommendations.push('Consider tightening approval criteria');
    recommendations.push('Increase monitoring of high-risk segments');
  }

  return {
    overallRiskScore,
    riskLevel,
    riskFactors,
    recommendations
  };
}

/**
 * Generate trend analysis
 */
export async function generateTrendAnalysis(
  pool: Pool,
  options: {
    metric: string;
    period: 'daily' | 'weekly' | 'monthly';
    days: number;
  }
): Promise<{
  trends: Array<{ period: string; value: number; change?: number }>;
  overallTrend: 'INCREASING' | 'DECREASING' | 'STABLE';
  averageValue: number;
  peakValue: number;
  lowValue: number;
}> {
  logger.info('GeneratingTrendAnalysis', options);

  const startDate = subDays(new Date(), options.days);

  // Build query based on metric
  let dateFormat = "DATE(created_at)";
  let groupByFormat = "DATE(created_at)";
  
  if (options.period === 'weekly') {
    dateFormat = "DATE_TRUNC('week', created_at)";
    groupByFormat = "DATE_TRUNC('week', created_at)";
  } else if (options.period === 'monthly') {
    dateFormat = "DATE_TRUNC('month', created_at)";
    groupByFormat = "DATE_TRUNC('month', created_at)";
  }

  let query = '';
  
  switch (options.metric) {
    case 'applications':
      query = `
        SELECT ${dateFormat} as period, COUNT(*) as value
        FROM applications
        WHERE created_at >= $1
        GROUP BY ${groupByFormat}
        ORDER BY period
      `;
      break;
    case 'approvals':
      query = `
        SELECT ${dateFormat} as period, COUNT(*) as value
        FROM underwriting_decisions
        WHERE decision = 'AUTO_APPROVE' AND evaluated_at >= $1
        GROUP BY ${groupByFormat}
        ORDER BY period
      `;
      break;
    case 'amount':
      query = `
        SELECT ${dateFormat} as period, SUM(requested_amount) as value
        FROM applications
        WHERE created_at >= $1
        GROUP BY ${groupByFormat}
        ORDER BY period
      `;
      break;
    default:
      query = `
        SELECT ${dateFormat} as period, COUNT(*) as value
        FROM applications
        WHERE created_at >= $1
        GROUP BY ${groupByFormat}
        ORDER BY period
      `;
  }

  const { rows } = await pool.query(query, [startDate.toISOString()]);

  const trends = rows.map((row: any, index: number) => {
    const value = parseFloat(row.value || 0);
    const prevValue = index > 0 ? parseFloat(rows[index - 1].value || 0) : value;
    const change = prevValue > 0 ? ((value - prevValue) / prevValue) * 100 : 0;

    return {
      period: format(new Date(row.period), 'yyyy-MM-dd'),
      value,
      change: index > 0 ? Math.round(change * 100) / 100 : undefined
    };
  });

  const values = trends.map(t => t.value);
  const averageValue = values.length > 0
    ? values.reduce((a, b) => a + b, 0) / values.length
    : 0;
  const peakValue = Math.max(...values, 0);
  const lowValue = Math.min(...values, 0);

  // Determine overall trend
  if (trends.length < 2) {
    return {
      trends,
      overallTrend: 'STABLE',
      averageValue,
      peakValue,
      lowValue
    };
  }

  const recentTrend = trends.slice(-3);
  const recentAvg = recentTrend.reduce((sum, t) => sum + (t.value || 0), 0) / recentTrend.length;
  const earlierTrend = trends.slice(0, Math.min(3, trends.length - 3));
  const earlierAvg = earlierTrend.length > 0
    ? earlierTrend.reduce((sum, t) => sum + (t.value || 0), 0) / earlierTrend.length
    : recentAvg;

  const overallTrend = recentAvg > earlierAvg * 1.1 ? 'INCREASING' :
    recentAvg < earlierAvg * 0.9 ? 'DECREASING' : 'STABLE';

  return {
    trends,
    overallTrend,
    averageValue: Math.round(averageValue * 100) / 100,
    peakValue,
    lowValue
  };
}

// Helper functions
function parseTimeframe(timeframe: string): number {
  const match = timeframe.match(/(\d+)([dwmy])/);
  if (!match) return 30;
  
  const value = parseInt(match[1], 10);
  const unit = match[2];
  
  switch (unit) {
    case 'd': return value;
    case 'w': return value * 7;
    case 'm': return value * 30;
    case 'y': return value * 365;
    default: return 30;
  }
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

