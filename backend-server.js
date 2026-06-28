const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Relational Pool Integration Connectors
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// --- MODULE 4: EVENTS CORE ENDPOINTS ---
app.get('/api/events', async (req, res) => {
  try {
    const events = await pool.query('SELECT e.*, p.username FROM platform_events e JOIN profiles p ON e.creator_id = p.profile_id ORDER BY e.slt_start_time ASC');
    res.json(events.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});


// --- MODULE 4: MARKETPLACE MERCHANDISE ENDPOINTS ---
app.get('/api/marketplace/items', async (req, res) => {
  try {
    const items = await pool.query(`
      SELECT i.*, s.shop_name, s.bg_media_url, s.bg_music_url 
      FROM catalog_items i 
      JOIN merchant_shops s ON i.shop_id = s.shop_id 
      ORDER BY i.created_at DESC
    `);
    res.json(items.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});


// Setup Combined Server Architecture Pipes
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Allows browser calls straight from your GitHub Pages live web URL
    methods: ["GET", "POST"]
  }
});

// --- EXISTING CORES: IDENTITY VERIFICATION ---
app.post('/api/auth/connect', async (req, res) => {
  const { google_id, email, sl_username, display_name } = req.body;
  try {
    const formattedSLName = sl_username.trim().toLowerCase().replace(/\s+/g, '.');
    const result = await pool.query(`
      INSERT INTO profiles (profile_id, username, profile_name) 
      VALUES ($1, $2, $3)
      ON CONFLICT (profile_id) DO UPDATE SET profile_name = EXCLUDED.profile_name
      RETURNING *
    `, [google_id, formattedSLName, display_name || sl_username]);
    res.json({ success: true, user: result.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/profile-tabs/:username', async (req, res) => {
  const { username } = req.params; const { type } = req.query;
  try {
    const profileRes = await pool.query('SELECT profile_id FROM profiles WHERE username = $1', [username]);
    if (profileRes.rows.length === 0) return res.status(404).json({ error: "No profile verified" });
    const userId = profileRes.rows[0].profile_id;
    if (type === 'wishlist') {
      const r = await pool.query('SELECT * FROM saved_wishlists WHERE user_id = $1', [userId]); return res.json({ tabType: 'wishlist', items: r.rows });
    } else {
      const r = await pool.query('SELECT * FROM user_content WHERE author_id = $1', [userId]); return res.json({ tabType: 'posts', items: r.rows });
    }
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- CHATROOM REST ENDPOINTS ---
app.get('/api/chatrooms', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM chatrooms ORDER BY room_id ASC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/chatrooms/:roomId/messages', async (req, res) => {
  try {
    const messages = await pool.query(`
      SELECT m.*, p.username, p.profile_name FROM chat_messages m
      JOIN profiles p ON m.sender_id = p.profile_id
      WHERE m.room_id = $1 ORDER BY m.created_at ASC LIMIT 50
    `, [req.params.roomId]);
    res.json(messages.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- WEBSOCKET EVENT MANAGER ROUTER ---
io.on('connection', (socket) => {
  console.log(`🔌 User connected via Socket Line: ${socket.id}`);

  // When a platform member moves inside a specific room target channel
  socket.on('join_room', (roomId) => {
    socket.join(roomId);
    console.log(`👤 Socket ${socket.id} tunnel active inside Room: ${roomId}`);
  });

  // Intercepting and broadcasting incoming message frames instantly
  socket.on('send_message', async (data) => {
    const { room_id, sender_id, message_text } = data;
    try {
      // Save message records seamlessly straight down into PostgreSQL table memory maps
      const savedMsg = await pool.query(`
        INSERT INTO chat_messages (room_id, sender_id, message_text)
        VALUES ($1, $2, $3) RETURNING *
      `, [room_id, sender_id, message_text]);

      const profileLookup = await pool.query('SELECT username, profile_name FROM profiles WHERE profile_id = $1', [sender_id]);
      
      const outboundPayload = {
        ...savedMsg.rows[0],
        username: profileLookup.rows[0].username,
        profile_name: profileLookup.rows[0].profile_name
      };

      // Blast packet out instantly to all active sockets currently in that room tunnel
      io.to(room_id).emit('receive_message', outboundPayload);
    } catch (err) {
      console.error("WebSocket DB sync crash: ", err.message);
    }
  });

  socket.on('disconnect', () => {
    console.log(`❌ User socket tunnel severed: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => console.log(`🚀 Complete Fullstack Engine executing on Port ${PORT}`));
