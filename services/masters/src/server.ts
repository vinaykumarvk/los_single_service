import express from 'express';
import { json } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createPgPool } from '@los/shared-libs';

const app = express();
app.use(json());

const pool = createPgPool();

app.get('/health', (_req, res) => res.status(200).send('OK'));

// GET /api/masters/products - list all products
app.get('/api/masters/products', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT product_code, name, min_amount, max_amount, min_tenure_months, max_tenure_months, max_foir, age_at_maturity_limit, created_at FROM products ORDER BY product_code'
    );
    return res.status(200).json(rows);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// GET /api/masters/products/:productCode - get product by code
app.get('/api/masters/products/:productCode', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT product_code, name, min_amount, max_amount, min_tenure_months, max_tenure_months, max_foir, age_at_maturity_limit, created_at FROM products WHERE product_code = $1',
      [req.params.productCode]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    return res.status(200).json(rows[0]);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// POST /api/masters/calendar/holidays - add business holiday
app.post('/api/masters/calendar/holidays', async (req, res) => {
  try {
    const { holidayDate, holidayName, holidayType, applicableStates } = req.body || {};
    if (!holidayDate || !holidayName || !holidayType) {
      return res.status(400).json({ error: 'holidayDate, holidayName, and holidayType required' });
    }
    
    const holidayId = uuidv4();
    await pool.query(
      'INSERT INTO business_calendar (holiday_id, holiday_date, holiday_name, holiday_type, applicable_states) VALUES ($1, $2, $3, $4, $5)',
      [holidayId, holidayDate, holidayName, holidayType, applicableStates ? JSON.stringify(applicableStates) : null]
    );
    
    return res.status(201).json({ holidayId, holidayDate, holidayName });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to add holiday' });
  }
});

// GET /api/masters/calendar/is-business-day - check if date is a business day
app.get('/api/masters/calendar/is-business-day', async (req, res) => {
  try {
    const date = req.query.date as string;
    const state = req.query.state as string | undefined;
    
    if (!date) {
      return res.status(400).json({ error: 'date parameter required (YYYY-MM-DD)' });
    }
    
    // Check if date is a weekend (Saturday = 6, Sunday = 0)
    const checkDate = new Date(date);
    const dayOfWeek = checkDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    // Check if date is a holiday
    let holidayQuery = `
      SELECT holiday_id, holiday_name, holiday_type
      FROM business_calendar
      WHERE holiday_date = $1 AND is_active = true
    `;
    const queryParams: any[] = [date];
    
    if (state) {
      holidayQuery += ` AND (applicable_states IS NULL OR $2 = ANY(applicable_states))`;
      queryParams.push(state);
    } else {
      holidayQuery += ` AND (applicable_states IS NULL OR holiday_type = 'NATIONAL' OR holiday_type = 'BANK')`;
    }
    
    const { rows: holidays } = await pool.query(holidayQuery, queryParams);
    const isHoliday = holidays.length > 0;
    
    const isBusinessDay = !isWeekend && !isHoliday;
    
    return res.status(200).json({
      date,
      isBusinessDay,
      isWeekend,
      isHoliday,
      holidays: holidays.map(h => ({ name: h.holiday_name, type: h.holiday_type }))
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to check business day' });
  }
});

// GET /api/masters/calendar/holidays - list holidays
app.get('/api/masters/calendar/holidays', async (req, res) => {
  try {
    const year = req.query.year ? parseInt(req.query.year as string, 10) : new Date().getFullYear();
    const state = req.query.state as string | undefined;
    
    let query = `
      SELECT holiday_id, holiday_date, holiday_name, holiday_type, applicable_states
      FROM business_calendar
      WHERE is_active = true
      AND EXTRACT(YEAR FROM holiday_date) = $1
    `;
    const queryParams: any[] = [year];
    
    if (state) {
      query += ` AND (applicable_states IS NULL OR $2 = ANY(applicable_states))`;
      queryParams.push(state);
    }
    
    query += ` ORDER BY holiday_date ASC`;
    
    const { rows } = await pool.query(query, queryParams);
    return res.status(200).json({ holidays: rows, year });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch holidays' });
  }
});

// POST /api/masters/blacklist - add entry to blacklist
app.post('/api/masters/blacklist', async (req, res) => {
  try {
    const { entityType, entityValue, reason, source, expiresAt } = req.body || {};
    if (!entityType || !entityValue || !reason) {
      return res.status(400).json({ error: 'entityType, entityValue, and reason required' });
    }
    
    const { addToBlacklist } = await import('@los/shared-libs');
    const entryId = await addToBlacklist(entityType, entityValue, reason, source, expiresAt ? new Date(expiresAt) : undefined);
    
    return res.status(201).json({ entryId, entityType, entityValue });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to add blacklist entry' });
  }
});

// POST /api/masters/whitelist - add entry to whitelist
app.post('/api/masters/whitelist', async (req, res) => {
  try {
    const { entityType, entityValue, reason, source, expiresAt } = req.body || {};
    if (!entityType || !entityValue) {
      return res.status(400).json({ error: 'entityType and entityValue required' });
    }
    
    const { addToWhitelist } = await import('@los/shared-libs');
    const entryId = await addToWhitelist(entityType, entityValue, reason, source, expiresAt ? new Date(expiresAt) : undefined);
    
    return res.status(201).json({ entryId, entityType, entityValue });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to add whitelist entry' });
  }
});

// GET /api/masters/blacklist/check - check if entity is blacklisted
app.get('/api/masters/blacklist/check', async (req, res) => {
  try {
    const { entityType, entityValue } = req.query;
    if (!entityType || !entityValue) {
      return res.status(400).json({ error: 'entityType and entityValue query parameters required' });
    }
    
    const { checkBlacklistWhitelist } = await import('@los/shared-libs');
    const result = await checkBlacklistWhitelist(entityType as any, entityValue as string);
    
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to check blacklist' });
  }
});

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3004;
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Masters service listening on ${port}`);
});