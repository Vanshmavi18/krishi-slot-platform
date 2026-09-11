// server/middleware/auth.js
import jwt from 'jsonwebtoken';
import { db } from '../data/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'agriqueue_secret_key_2026_sih';

export async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Authorization token required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    let user = db.find('users', u => u.id === decoded.id);
    
    // Check MongoDB if connected and user not in memory
    if (!user && db.isMongoConnected) {
      try {
        const { User } = await import('../data/models/User.js');
        user = await User.findOne({ $or: [{ id: decoded.id }, { email: decoded.email }] }).lean();
      } catch (e) {}
    }

    // Verified JWT claims fallback
    if (!user && decoded.id && decoded.role) {
      user = {
        id: decoded.id,
        role: decoded.role,
        name: decoded.name || 'User',
        phone: decoded.phone || '',
        email: decoded.email || null
      };
    }

    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found or session expired' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Invalid or expired session token' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Forbidden: Insufficient privileges' });
    }
    next();
  };
}
