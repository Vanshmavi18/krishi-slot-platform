// server/index.js
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import dns from 'dns';
import { db } from './data/db.js';

// Force IPv4 resolution for cloud platforms (Render/AWS/Heroku) where IPv6 routes are unreachable
try {
  dns.setDefaultResultOrder('ipv4first');
} catch (e) {
  // Ignored if older Node
}

import authRoutes from './routes/authRoutes.js';
import slotRoutes from './routes/slotRoutes.js';
import queueRoutes from './routes/queueRoutes.js';
import procurementRoutes from './routes/procurementRoutes.js';
import centreRoutes from './routes/centreRoutes.js';
import smsRoutes from './routes/smsRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import buyerRoutes from './routes/buyerRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Production & Local CORS Configuration
const allowedOrigins = [
  'https://agriqueue-1-d4x0.onrender.com',
  'https://krishi-slot-platform.onrender.com',
  'http://localhost:5173',
  'http://localhost:5000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5000'
];

if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL.replace(/\/$/, ''));
}

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.onrender.com')) {
      callback(null, true);
    } else {
      callback(null, true); // Permissive for onrender cloud deployment
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Preflight options handling for all routes
app.options(/.*/, cors());

app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/slots', slotRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/procurements', procurementRoutes);
app.use('/api/centre', centreRoutes);
app.use('/api/sms', smsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/buyer', buyerRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'AgriQueue Backend API',
    version: '2.0.0',
    time: new Date().toISOString(),
    database: db.isMongoConnected ? 'MongoDB Atlas (Connected)' : 'Persistent Storage (Active)'
  });
});

// Database status endpoint
app.get('/api/db/status', (req, res) => {
  res.json(db.getDbStatus());
});

// Serve frontend static build in production
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// Fallback for SPA routing
app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  const indexHtml = path.join(distPath, 'index.html');
  res.sendFile(indexHtml, (err) => {
    if (err) {
      res.status(200).send('AgriQueue Backend Running. Start Vite dev server for frontend.');
    }
  });
});

// Connect to database before accepting traffic
await db.connectMongo();

const server = app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🌱 AgriQueue API Server running on port ${PORT}`);
  console.log(`🔗 API Base: http://localhost:${PORT}/api`);
  console.log(`📡 SSE Queue Stream: http://localhost:${PORT}/api/queue/stream`);
  console.log(`📊 DB Health Check: http://localhost:${PORT}/api/db/status`);
  console.log(`======================================================\n`);
});

export { app, server };
export default app;
