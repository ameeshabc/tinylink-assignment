const express = require('express');
const cors = require('cors');
const validator = require('validator');
const pool = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*'
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Helper function to generate random code
function generateShortCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const length = Math.floor(Math.random() * 3) + 6; // 6-8 characters
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Helper function to validate custom code
function isValidCode(code) {
  return /^[A-Za-z0-9]{6,8}$/.test(code);
}

// ===== HEALTH CHECK ENDPOINT =====
app.get('/healthz', (req, res) => {
  res.status(200).json({ 
    ok: true, 
    version: '1.0',
    timestamp: new Date().toISOString()
  });
});

// ===== REDIRECT ENDPOINT (NOT IN /api) =====
app.get('/:code', async (req, res) => {
  const { code } = req.params;

  // Validate code format
  if (!isValidCode(code)) {
    return res.status(404).json({ error: 'Link not found' });
  }

  try {
    // Find the link
    const result = await pool.query(
      'SELECT * FROM links WHERE code = $1',
      [code]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Link not found' });
    }

    const link = result.rows[0];

    // Increment clicks and update last_clicked
    await pool.query(
      'UPDATE links SET clicks = clicks + 1, last_clicked = CURRENT_TIMESTAMP WHERE code = $1',
      [code]
    );

    // 302 redirect to target URL
    return res.redirect(302, link.target_url);

  } catch (err) {
    console.error('Redirect error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== API ENDPOINTS =====

// CREATE LINK
app.post('/api/links', async (req, res) => {
  const { target_url, custom_code } = req.body;

  // Validate target URL
  if (!target_url || !validator.isURL(target_url, { require_protocol: true })) {
    return res.status(400).json({ error: 'Invalid URL format. Must include protocol (http:// or https://)' });
  }

  let code = custom_code;

  // If custom code provided, validate it
  if (custom_code) {
    if (!isValidCode(custom_code)) {
      return res.status(400).json({ error: 'Custom code must be 6-8 alphanumeric characters' });
    }
    code = custom_code;
  } else {
    // Generate unique code
    let attempts = 0;
    while (attempts < 10) {
      code = generateShortCode();
      const existing = await pool.query('SELECT code FROM links WHERE code = $1', [code]);
      if (existing.rows.length === 0) break;
      attempts++;
    }
    if (attempts === 10) {
      return res.status(500).json({ error: 'Failed to generate unique code' });
    }
  }

  try {
    // Check if code already exists
    const existing = await pool.query('SELECT code FROM links WHERE code = $1', [code]);
    
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Short code already exists' });
    }

    // Insert new link
    const result = await pool.query(
      'INSERT INTO links (code, target_url, clicks, created_at, last_clicked) VALUES ($1, $2, 0, CURRENT_TIMESTAMP, NULL) RETURNING *',
      [code, target_url]
    );

    const link = result.rows[0];
    
    return res.status(201).json({
      code: link.code,
      target_url: link.target_url,
      clicks: link.clicks,
      created_at: link.created_at,
      last_clicked: link.last_clicked
    });

  } catch (err) {
    console.error('Create link error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET ALL LINKS
app.get('/api/links', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT code, target_url, clicks, created_at, last_clicked FROM links ORDER BY created_at DESC'
    );
    
    return res.status(200).json(result.rows);
  } catch (err) {
    console.error('Get links error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET SINGLE LINK STATS
app.get('/api/links/:code', async (req, res) => {
  const { code } = req.params;

  try {
    const result = await pool.query(
      'SELECT code, target_url, clicks, created_at, last_clicked FROM links WHERE code = $1',
      [code]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Link not found' });
    }

    return res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Get link error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE LINK
app.delete('/api/links/:code', async (req, res) => {
  const { code } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM links WHERE code = $1 RETURNING code',
      [code]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Link not found' });
    }

    return res.status(204).send();
  } catch (err) {
    console.error('Delete link error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`✓ Server running on http://localhost:${PORT}`);
  console.log(`✓ Health check: http://localhost:${PORT}/healthz`);
});