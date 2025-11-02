/**
 * Advanced Analytics Module
 * Predictive analytics, custom reports, and business intelligence
 */

import { Pool } from 'pg';
import { createLogger } from '@los/shared-libs';

const logger = createLogger('reporting-advanced-analytics');

export interface ReportBuilderConfig {
  reportId?: string;
  name: string;
  description?: string;
  dimensions: string[]; // e.g., ['status', 'channel', 'productCode']
  metrics: string[]; // e.g., ['count', 'totalAmount', 'avgScore']
  filters?: {
    field: string;
    operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'like';
    value: any;
  }[];
  groupBy?: string[];
  orderBy?: { field: string; direction: 'ASC' | 'DESC' }[];
  dateRange?: {
    startDate: string;
    endDate: string;
    field: string; // 'created_at', 'updated_at', etc.
  };
}

/**
 * Predict approval rate for upcoming period
 */
export async function predictApprovalRate(
  pool: Pool,
  days: number = 30
): Promise<{
  predictedApprovalRate: number;
  confidence: number;
  factors: Array<{ name: string; impact: number }>;
  historicalData: Array<{ date: string; approvalRate: number }>;
}> {
  try {
    // Get historical approval rates (last 90 days)
    const historicalQuery = `
      SELECT 
        DATE(ud.evaluated_at) as date,
        COUNT(*) FILTER (WHERE decision = 'AUTO_APPROVE') * 100.0 / COUNT(*) as approval_rate,
        COUNT(*) as total_decisions
      FROM underwriting_decisions ud
      WHERE ud.evaluated_at >= NOW() - INTERVAL '90 days'
        AND ud.override_request_id IS NULL
      GROUP BY DATE(ud.evaluated_at)
      ORDER BY date ASC
    `;

    const { rows } = await pool.query(historicalQuery);

    // Simple linear regression for prediction
    const historicalData = rows.map((row: any) => ({
      date: row.date,
      approvalRate: parseFloat(row.approval_rate || 0),
      totalDecisions: parseInt(row.total_decisions, 10)
    }));

    // Calculate trend (simple moving average)
    const recentRates = historicalData.slice(-30).map(d => d.approvalRate);
    const avgRate = recentRates.length > 0
      ? recentRates.reduce((a, b) => a + b, 0) / recentRates.length
      : 65; // Default if no data

    // Predict based on trend
    const trend = historicalData.length >= 2
      ? (historicalData[historicalData.length - 1].approvalRate - historicalData[0].approvalRate) / historicalData.length
      : 0;

    const predictedApprovalRate = Math.max(0, Math.min(100, avgRate + (trend * days)));

    // Calculate confidence based on data volume
    const totalRecentDecisions = historicalData.slice(-30).reduce((sum, d) => sum + d.totalDecisions, 0);
    const confidence = Math.min(0.95, 0.5 + (totalRecentDecisions / 1000) * 0.45);

    const factors = [
      { name: 'Historical Average', impact: avgRate },
      { name: 'Trend', impact: trend * days },
      { name: 'Data Volume', impact: confidence * 10 }
    ];

    return {
      predictedApprovalRate: +predictedApprovalRate.toFixed(2),
      confidence: +confidence.toFixed(2),
      factors,
      historicalData: historicalData.map(d => ({
        date: d.date,
        approvalRate: +d.approvalRate.toFixed(2)
      }))
    };
  } catch (err) {
    logger.error('PredictApprovalRateError', { error: (err as Error).message });
    throw err;
  }
}

/**
 * Predict application volume for upcoming period
 */
export async function predictApplicationVolume(
  pool: Pool,
  days: number = 30
): Promise<{
  predictedVolume: number;
  confidence: number;
  dailyBreakdown: Array<{ date: string; predicted: number }>;
}> {
  try {
    // Get historical application volumes (last 90 days)
    const historicalQuery = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as volume
      FROM applications
      WHERE created_at >= NOW() - INTERVAL '90 days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    const { rows } = await pool.query(historicalQuery);

    const historicalData = rows.map((row: any) => ({
      date: row.date,
      volume: parseInt(row.volume, 10)
    }));

    // Calculate average daily volume
    const avgDailyVolume = historicalData.length > 0
      ? historicalData.reduce((sum, d) => sum + d.volume, 0) / historicalData.length
      : 10; // Default if no data

    // Simple seasonality adjustment (could be enhanced with ML)
    const predictedDailyVolume = avgDailyVolume;
    const predictedVolume = Math.round(predictedDailyVolume * days);

    // Calculate confidence
    const dataPoints = historicalData.length;
    const confidence = Math.min(0.95, 0.5 + (dataPoints / 90) * 0.45);

    // Generate daily breakdown
    const dailyBreakdown: Array<{ date: string; predicted: number }> = [];
    const startDate = new Date();
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      dailyBreakdown.push({
        date: date.toISOString().split('T')[0],
        predicted: Math.round(predictedDailyVolume)
      });
    }

    return {
      predictedVolume,
      confidence: +confidence.toFixed(2),
      dailyBreakdown
    };
  } catch (err) {
    logger.error('PredictApplicationVolumeError', { error: (err as Error).message });
    throw err;
  }
}

/**
 * Build custom report based on configuration
 */
export async function buildCustomReport(
  pool: Pool,
  config: ReportBuilderConfig
): Promise<{
  reportId: string;
  data: any[];
  summary: {
    totalRows: number;
    metrics: Record<string, number>;
  };
  generatedAt: string;
}> {
  try {
    // Build SQL query dynamically
    const selectFields: string[] = [];
    const groupByFields: string[] = [];
    const whereConditions: string[] = [];
    const havingConditions: string[] = [];
    const queryParams: any[] = [];
    let paramCount = 1;

    // Add dimensions to SELECT and GROUP BY
    config.dimensions.forEach(dim => {
      selectFields.push(dim);
      groupByFields.push(dim);
    });

    // Add metrics to SELECT
    config.metrics.forEach(metric => {
      switch (metric) {
        case 'count':
          selectFields.push(`COUNT(*) as ${metric}`);
          break;
        case 'totalAmount':
          selectFields.push(`SUM(requested_amount) as ${metric}`);
          break;
        case 'avgAmount':
          selectFields.push(`AVG(requested_amount) as ${metric}`);
          break;
        case 'avgScore':
          selectFields.push(`AVG(score) as ${metric}`);
          break;
        case 'minScore':
          selectFields.push(`MIN(score) as ${metric}`);
          break;
        case 'maxScore':
          selectFields.push(`MAX(score) as ${metric}`);
          break;
        default:
          selectFields.push(`${metric}`);
      }
    });

    // Add filters to WHERE clause
    if (config.filters) {
      config.filters.forEach(filter => {
        const param = `$${paramCount++}`;
        queryParams.push(filter.value);

        switch (filter.operator) {
          case 'eq':
            whereConditions.push(`${filter.field} = ${param}`);
            break;
          case 'ne':
            whereConditions.push(`${filter.field} != ${param}`);
            break;
          case 'gt':
            whereConditions.push(`${filter.field} > ${param}`);
            break;
          case 'lt':
            whereConditions.push(`${filter.field} < ${param}`);
            break;
          case 'gte':
            whereConditions.push(`${filter.field} >= ${param}`);
            break;
          case 'lte':
            whereConditions.push(`${filter.field} <= ${param}`);
            break;
          case 'in':
            whereConditions.push(`${filter.field} = ANY(${param})`);
            break;
          case 'like':
            whereConditions.push(`${filter.field} LIKE ${param}`);
            break;
        }
      });
    }

    // Add date range filter
    if (config.dateRange) {
      const startParam = `$${paramCount++}`;
      const endParam = `$${paramCount++}`;
      queryParams.push(config.dateRange.startDate);
      queryParams.push(config.dateRange.endDate);
      whereConditions.push(`${config.dateRange.field} >= ${startParam} AND ${config.dateRange.field} <= ${endParam}`);
    }

    // Build ORDER BY clause
    const orderByClause = config.orderBy && config.orderBy.length > 0
      ? `ORDER BY ${config.orderBy.map(o => `${o.field} ${o.direction}`).join(', ')}`
      : '';

    // Determine base table (could be enhanced to support joins)
    const baseTable = 'applications'; // Default, could be made configurable

    // Build final query
    let query = `SELECT ${selectFields.join(', ')} FROM ${baseTable}`;

    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    if (config.groupBy && config.groupBy.length > 0) {
      query += ` GROUP BY ${config.groupBy.join(', ')}`;
    } else if (groupByFields.length > 0) {
      query += ` GROUP BY ${groupByFields.join(', ')}`;
    }

    if (havingConditions.length > 0) {
      query += ` HAVING ${havingConditions.join(' AND ')}`;
    }

    if (orderByClause) {
      query += ` ${orderByClause}`;
    }

    // Execute query
    const { rows } = await pool.query(query, queryParams);

    // Calculate summary metrics
    const summaryMetrics: Record<string, number> = {};
    config.metrics.forEach(metric => {
      if (rows.length > 0) {
        const values = rows.map((row: any) => parseFloat(row[metric] || 0));
        if (metric === 'count') {
          summaryMetrics.totalCount = values.reduce((a, b) => a + b, 0);
        } else if (metric.includes('Amount')) {
          summaryMetrics[`total${metric}`] = values.reduce((a, b) => a + b, 0);
          summaryMetrics[`avg${metric}`] = values.reduce((a, b) => a + b, 0) / values.length;
        }
      }
    });

    const reportId = config.reportId || `report-${Date.now()}`;

    logger.info('CustomReportBuilt', {
      reportId,
      rows: rows.length,
      dimensions: config.dimensions.length,
      metrics: config.metrics.length
    });

    return {
      reportId,
      data: rows,
      summary: {
        totalRows: rows.length,
        metrics: summaryMetrics
      },
      generatedAt: new Date().toISOString()
    };
  } catch (err) {
    logger.error('BuildCustomReportError', { error: (err as Error).message });
    throw err;
  }
}

/**
 * Risk analytics - portfolio risk assessment
 */
export async function analyzePortfolioRisk(
  pool: Pool
): Promise<{
  overallRiskScore: number;
  riskDistribution: Record<string, number>;
  highRiskApplications: number;
  recommendations: string[];
}> {
  try {
    // Get risk distribution from scoring results
    const riskQuery = `
      SELECT 
        risk_level,
        COUNT(*) as count,
        AVG(score) as avg_score
      FROM scoring_results
      WHERE evaluated_at >= NOW() - INTERVAL '90 days'
      GROUP BY risk_level
    `;

    const { rows } = await pool.query(riskQuery);

    const riskDistribution: Record<string, number> = {};
    let totalApplications = 0;
    let weightedRisk = 0;

    rows.forEach((row: any) => {
      const count = parseInt(row.count, 10);
      totalApplications += count;
      riskDistribution[row.risk_level] = count;

      // Weight risk levels
      let riskWeight = 0;
      if (row.risk_level === 'LOW') riskWeight = 1;
      else if (row.risk_level === 'MEDIUM') riskWeight = 3;
      else if (row.risk_level === 'HIGH') riskWeight = 6;
      else if (row.risk_level === 'VERY_HIGH') riskWeight = 10;

      weightedRisk += riskWeight * count;
    });

    const overallRiskScore = totalApplications > 0
      ? (weightedRisk / totalApplications) * 10 // Normalize to 0-100
      : 50;

    const highRiskApplications = (riskDistribution['HIGH'] || 0) + (riskDistribution['VERY_HIGH'] || 0);
    const highRiskPercentage = totalApplications > 0
      ? (highRiskApplications / totalApplications) * 100
      : 0;

    const recommendations: string[] = [];
    if (highRiskPercentage > 20) {
      recommendations.push('High risk applications exceed 20% - consider stricter underwriting criteria');
    }
    if (overallRiskScore > 60) {
      recommendations.push('Portfolio risk score is elevated - review approval thresholds');
    }
    if (riskDistribution['VERY_HIGH'] && riskDistribution['VERY_HIGH'] > 10) {
      recommendations.push('Very high risk applications detected - enhance fraud detection');
    }

    return {
      overallRiskScore: +overallRiskScore.toFixed(2),
      riskDistribution,
      highRiskApplications,
      recommendations
    };
  } catch (err) {
    logger.error('PortfolioRiskAnalysisError', { error: (err as Error).message });
    throw err;
  }
}

