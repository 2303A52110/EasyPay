const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── API ROUTES ──────────────────────────────────

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'EasyPay', version: '4.0' });
});

// Serve the frontend for all other routes (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ EasyPay running at http://localhost:${PORT}`);
});
