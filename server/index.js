// server/index.js
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import authRoutes from './routes/authRoutes.js';
import slotRoutes from './routes/slotRoutes.js';
import queueRoutes from './routes/queueRoutes.js';
import procurementRoutes from './routes/procurementRoutes.js';
import centreRoutes from './routes/centreRoutes.js';
import smsRoutes from './routes/smsRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import buyerRoutes from './routes/buyerRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
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
    service: 'KrishiSlot Backend API',
    version: '2.0.0',
    time: new Date().toISOString()
  });
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
      res.status(200).send('KrishiSlot Backend Running. Start Vite dev server for frontend.');
    }
  });
});

app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🌾 KrishiSlot API Server running on port ${PORT}`);
  console.log(`🔗 API Base: http://localhost:${PORT}/api`);
  console.log(`📡 SSE Queue Stream: http://localhost:${PORT}/api/queue/stream`);
  console.log(`======================================================\n`);
});
