const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// AUTH ENDPOINT: Saves or logs in a user using Google Data + SL Name
app.post('/api/auth/connect', async (req, res) => {
  const { google_id, email, sl_username, display_name } = req.body;
  
  if (!google_id || !sl_username) {
    return res.status(400).json({ error: "Missing required authentication payloads." });
  }

  try {
    // 1. Format Second Life name cleanly (replace spaces with dots if needed)
    const formattedSLName = sl_username.trim().toLowerCase().replace(/\s+/g, '.');

    // 2. Check if this Second Life name is already claimed by someone else
    const nameCheck = await pool.query('SELECT * FROM profiles WHERE username = $1', [formattedSLName]);
    if (nameCheck.rows.length > 0 && nameCheck.rows[0].profile_id !== google_id) {
        return res.status(400).json({ error: "This Second Life account is already linked to another user." });
    }

    // 3. Upsert user: If google_id exists, log them in. If not, register them.
    const result = await pool.query(`
      INSERT INTO profiles (profile_id, username, profile_name) 
      VALUES ($1, $2, $3)
      ON CONFLICT (profile_id) 
      DO UPDATE SET profile_name = EXCLUDED.profile_name
      RETURNING *
    `, [google_id, formattedSLName, display_name || sl_username]);

    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PROFILE FETCH ENDPOINT: Pulls a specific profile's customization fields
app.get('/api/profile/:username', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM profiles WHERE username = $1', [req.params.username]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Profile not found" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server operating on port ${PORT}`));
