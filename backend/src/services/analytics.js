/**
 * Analytics Service - Zeni
 *
 * Métricas de uso para demonstrar valor para investidores/compradores:
 * - DAU (Daily Active Users)
 * - MAU (Monthly Active Users)
 * - Retention (cohort analysis)
 * - Feature usage
 * - Engagement metrics
 */

import pool from '../db/connection.js';
import { logger } from './logger.js';

/**
 * Registra evento de analytics
 */
export async function trackEvent(userId, eventType, metadata = {}) {
  try {
    await pool.query(`
      INSERT INTO analytics_events (user_id, event_type, metadata, created_at)
      VALUES ($1, $2, $3, NOW())
    `, [userId, eventType, JSON.stringify(metadata)]);
  } catch (error) {
    // Falha silenciosa - analytics não deve quebrar a app
    logger.error('[Analytics] Error tracking event:', error.message);
  }
}

/**
 * Calcula DAU (Daily Active Users)
 */
export async function getDAU(date = new Date()) {
  const result = await pool.query(`
    SELECT COUNT(DISTINCT user_id) as dau
    FROM analytics_events
    WHERE DATE(created_at) = DATE($1)
  `, [date]);
  return parseInt(result.rows[0]?.dau || 0);
}

/**
 * Calcula MAU (Monthly Active Users)
 */
export async function getMAU(year, month) {
  const result = await pool.query(`
    SELECT COUNT(DISTINCT user_id) as mau
    FROM analytics_events
    WHERE EXTRACT(YEAR FROM created_at) = $1
      AND EXTRACT(MONTH FROM created_at) = $2
  `, [year, month]);
  return parseInt(result.rows[0]?.mau || 0);
}

/**
 * Calcula WAU (Weekly Active Users)
 */
export async function getWAU(date = new Date()) {
  const result = await pool.query(`
    SELECT COUNT(DISTINCT user_id) as wau
    FROM analytics_events
    WHERE created_at >= DATE($1) - INTERVAL '7 days'
      AND created_at < DATE($1) + INTERVAL '1 day'
  `, [date]);
  return parseInt(result.rows[0]?.wau || 0);
}

/**
 * Calcula retention por cohort (usuários que voltaram após N dias)
 */
export async function getRetentionCohort(cohortDate, daysAfter) {
  const result = await pool.query(`
    WITH cohort AS (
      SELECT DISTINCT user_id
      FROM users
      WHERE DATE(created_at) = DATE($1)
    ),
    retained AS (
      SELECT DISTINCT ae.user_id
      FROM analytics_events ae
      JOIN cohort c ON ae.user_id = c.user_id
      WHERE DATE(ae.created_at) = DATE($1) + INTERVAL '${daysAfter} days'
    )
    SELECT
      (SELECT COUNT(*) FROM cohort) as cohort_size,
      (SELECT COUNT(*) FROM retained) as retained_count
  `, [cohortDate]);

  const cohortSize = parseInt(result.rows[0]?.cohort_size || 0);
  const retainedCount = parseInt(result.rows[0]?.retained_count || 0);

  return {
    cohortSize,
    retainedCount,
    retentionRate: cohortSize > 0 ? (retainedCount / cohortSize * 100).toFixed(1) : 0
  };
}

/**
 * Uso por feature (quais agentes são mais usados)
 */
export async function getFeatureUsage(days = 30) {
  const result = await pool.query(`
    SELECT
      metadata->>'agent' as feature,
      COUNT(*) as usage_count,
      COUNT(DISTINCT user_id) as unique_users
    FROM analytics_events
    WHERE event_type = 'chat_message'
      AND created_at >= NOW() - INTERVAL '${days} days'
      AND metadata->>'agent' IS NOT NULL
    GROUP BY metadata->>'agent'
    ORDER BY usage_count DESC
  `);
  return result.rows;
}

/**
 * Métricas de engajamento
 */
export async function getEngagementMetrics(days = 30) {
  const result = await pool.query(`
    SELECT
      COUNT(*) as total_events,
      COUNT(DISTINCT user_id) as unique_users,
      COUNT(DISTINCT DATE(created_at)) as active_days,
      ROUND(COUNT(*)::numeric / NULLIF(COUNT(DISTINCT user_id), 0), 2) as events_per_user,
      ROUND(COUNT(*)::numeric / NULLIF(COUNT(DISTINCT DATE(created_at)), 0), 2) as events_per_day
    FROM analytics_events
    WHERE created_at >= NOW() - INTERVAL '${days} days'
  `);
  return result.rows[0];
}

/**
 * Transações registradas por período
 */
export async function getTransactionMetrics(days = 30) {
  const result = await pool.query(`
    SELECT
      COUNT(*) as total_transactions,
      COUNT(DISTINCT user_id) as users_with_transactions,
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expenses,
      SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
      ROUND(AVG(amount), 2) as avg_transaction_amount
    FROM transactions
    WHERE created_at >= NOW() - INTERVAL '${days} days'
  `);
  return result.rows[0];
}

/**
 * Crescimento de usuários
 */
export async function getUserGrowth(days = 30) {
  const result = await pool.query(`
    SELECT
      DATE(created_at) as date,
      COUNT(*) as new_users,
      SUM(COUNT(*)) OVER (ORDER BY DATE(created_at)) as cumulative_users
    FROM users
    WHERE created_at >= NOW() - INTERVAL '${days} days'
    GROUP BY DATE(created_at)
    ORDER BY date
  `);
  return result.rows;
}

/**
 * DAU trend (últimos N dias)
 */
export async function getDAUTrend(days = 30) {
  const result = await pool.query(`
    SELECT
      DATE(created_at) as date,
      COUNT(DISTINCT user_id) as dau
    FROM analytics_events
    WHERE created_at >= NOW() - INTERVAL '${days} days'
    GROUP BY DATE(created_at)
    ORDER BY date
  `);
  return result.rows;
}

/**
 * Dashboard completo de analytics
 */
export async function getAnalyticsDashboard() {
  const now = new Date();
  const [
    dau,
    wau,
    mau,
    engagement,
    featureUsage,
    transactions,
    userGrowth,
    dauTrend
  ] = await Promise.all([
    getDAU(now),
    getWAU(now),
    getMAU(now.getFullYear(), now.getMonth() + 1),
    getEngagementMetrics(30),
    getFeatureUsage(30),
    getTransactionMetrics(30),
    getUserGrowth(30),
    getDAUTrend(30)
  ]);

  // Calcular retention D1, D7, D30
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
  const [retentionD1, retentionD7, retentionD30] = await Promise.all([
    getRetentionCohort(thirtyDaysAgo, 1),
    getRetentionCohort(thirtyDaysAgo, 7),
    getRetentionCohort(thirtyDaysAgo, 30)
  ]);

  return {
    overview: {
      dau,
      wau,
      mau,
      dauToMauRatio: mau > 0 ? (dau / mau * 100).toFixed(1) : 0
    },
    engagement,
    retention: {
      d1: retentionD1,
      d7: retentionD7,
      d30: retentionD30
    },
    featureUsage,
    transactions,
    trends: {
      userGrowth,
      dauTrend
    }
  };
}

export default {
  trackEvent,
  getDAU,
  getMAU,
  getWAU,
  getRetentionCohort,
  getFeatureUsage,
  getEngagementMetrics,
  getTransactionMetrics,
  getUserGrowth,
  getDAUTrend,
  getAnalyticsDashboard
};
