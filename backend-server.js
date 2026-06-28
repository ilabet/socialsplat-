const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Connects securely to a hosted PostgreSQL database via an environment variable
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Explore Feed API: Handles search parameters or keyword tags
app.get('/api/posts', async (req, res) => {
  try {
    const { search } = req.query;
    let queryText = 'SELECT * FROM posts';
    let queryParams = [];

    if (search) {
      queryText += ' WHERE username ILIKE $1 OR $2 = ANY(keywords)';
      queryParams = [`%${search}%`, search];
    }
    
    queryText += ' ORDER BY created_at DESC';
    const result = await pool.query(queryText, queryParams);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Profile API: Updates custom MySpace HTML layouts for a user profile
app.post('/api/profile/save', async (req, res) => {
  const { username, custom_html_css } = req.body;
  try {
    await pool.query(
      'INSERT INTO profiles (username, custom_html_css) VALUES ($1, $2) ON CONFLICT (username) DO UPDATE SET custom_html_css = $2',
      [username, custom_html_css]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
