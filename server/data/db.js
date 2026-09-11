// server/data/db.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { initialData } from './seed.js';

// Import Mongoose models
import User from './models/User.js';
import Booking from './models/Booking.js';
import Procurement from './models/Procurement.js';
import Centre from './models/Centre.js';
import Crop from './models/Crop.js';
import Notification from './models/Notification.js';
import BuyerOrder from './models/BuyerOrder.js';
import Otp from './models/Otp.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'store.json');

const MODEL_MAP = {
  users: User,
  bookings: Booking,
  procurements: Procurement,
  centres: Centre,
  crops: Crop,
  notifications: Notification,
  buyerOrders: BuyerOrder
};

class Database {
  constructor() {
    this.data = null;
    this.isMongoConnected = false;
    this.mongoUri = null;
    this.initLocalStore();
  }

  initLocalStore() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        // Ensure collections from initialData exist
        let changed = false;
        for (const [key, val] of Object.entries(initialData)) {
          if (!this.data[key]) {
            this.data[key] = JSON.parse(JSON.stringify(val));
            changed = true;
          }
        }
        // Ensure seed users (e.g. buyers) exist
        if (Array.isArray(this.data.users)) {
          for (const u of initialData.users) {
            if (!this.data.users.some(existing => existing.id === u.id)) {
              this.data.users.push(u);
              changed = true;
            }
          }
        }
        if (changed) this.saveLocal();
      } else {
        this.data = JSON.parse(JSON.stringify(initialData));
        this.saveLocal();
      }
    } catch (err) {
      console.error('[DB WARNING] Error loading store.json file, falling back to initial data:', err.message);
      this.data = JSON.parse(JSON.stringify(initialData));
      this.saveLocal();
    }
  }

  saveLocal() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      try {
        const tempFile = `${DB_FILE}.tmp`;
        fs.writeFileSync(tempFile, JSON.stringify(this.data, null, 2), 'utf-8');
        fs.copyFileSync(tempFile, DB_FILE);
        try { fs.unlinkSync(tempFile); } catch (_) {}
      } catch (fallbackErr) {
        console.error('[DB ERROR] Failed to write local DB file:', fallbackErr.message);
      }
    }
  }

  // Connect to MongoDB if MONGODB_URI is provided
  async connectMongo() {
    dotenv.config();
    const uri = (process.env.MONGODB_URI || '').trim();

    if (!uri) {
      console.log('ℹ️  [DATABASE] MONGODB_URI environment variable is not configured in .env or Render.');
      console.log('ℹ️  [DATABASE] Operating in persistent local storage mode (store.json).');
      console.log('ℹ️  [DATABASE] To connect to MongoDB Atlas in production, set MONGODB_URI in Render dashboard.');
      this.isMongoConnected = false;
      return false;
    }

    try {
      console.log(`[DATABASE] Connecting to MongoDB Atlas: ${this.maskUri(uri)}...`);
      
      // Attach persistent connection listeners once
      if (!this.hasAttachedListeners) {
        mongoose.connection.on('connected', () => {
          this.isMongoConnected = true;
          console.log('✅ [DATABASE] MongoDB connected successfully.');
        });
        mongoose.connection.on('error', (err) => {
          this.isMongoConnected = false;
          console.error('❌ [DATABASE] MongoDB connection error:', err.message);
        });
        mongoose.connection.on('disconnected', () => {
          this.isMongoConnected = false;
          console.warn('⚠️  [DATABASE] MongoDB disconnected. Falling back to persistent disk store.');
        });
        this.hasAttachedListeners = true;
      }

      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 8000,
        connectTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        family: 4 // Force IPv4 resolution
      });

      this.isMongoConnected = true;
      this.mongoUri = uri;
      console.log('✅ [DATABASE] MongoDB connected successfully.');

      // Synchronize data between MongoDB and local store
      await this.syncWithMongo();
      return true;
    } catch (err) {
      this.isMongoConnected = false;
      console.error(`❌ [DATABASE] MongoDB connection failed: ${err.message}`);
      console.log('ℹ️  [DATABASE] Seamlessly falling back to high-performance persistent store (store.json).');
      return false;
    }
  }

  async syncWithMongo() {
    if (!this.isMongoConnected) return;
    try {
      for (const [colName, Model] of Object.entries(MODEL_MAP)) {
        const count = await Model.countDocuments();
        if (count === 0 && Array.isArray(this.data[colName]) && this.data[colName].length > 0) {
          console.log(`[DATABASE] Seeding ${this.data[colName].length} items into MongoDB '${colName}' collection...`);
          await Model.insertMany(this.data[colName], { ordered: false }).catch(() => {});
        } else if (count > 0) {
          // If MongoDB has documents, load them into local cache as source of truth
          const docs = await Model.find({}).lean().exec();
          if (docs && docs.length > 0) {
            this.data[colName] = docs;
          }
        }
      }
      this.saveLocal();
    } catch (err) {
      console.warn('[DATABASE] Sync warning:', err.message);
    }
  }

  maskUri(uri) {
    if (!uri) return 'None';
    return uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
  }

  getDbStatus() {
    const collections = {};
    if (this.data) {
      for (const key of Object.keys(this.data)) {
        collections[key] = Array.isArray(this.data[key]) ? this.data[key].length : 1;
      }
    }

    return {
      success: true,
      provider: this.isMongoConnected ? 'MongoDB Atlas (Source of Truth)' : 'Persistent File DB (store.json)',
      connected: true,
      mongoConnected: this.isMongoConnected,
      mongoUri: this.isMongoConnected ? this.maskUri(this.mongoUri) : null,
      dataFile: 'server/data/store.json',
      collections,
      timestamp: new Date().toISOString()
    };
  }

  // --- ASYNC USER OPERATIONS (MONGODB WITH DUAL PERSISTENCE) ---

  async createUser(userData) {
    if (!Array.isArray(this.data.users)) {
      this.data.users = [];
    }

    if (userData.email) {
      userData.email = String(userData.email).trim().toLowerCase();
      const emailTaken = await this.isEmailTaken(userData.email);
      if (emailTaken) {
        const err = new Error('An account with this email address already exists.');
        err.code = 'DUPLICATE_EMAIL';
        throw err;
      }
    }

    if (userData.username) {
      userData.username = String(userData.username).trim().toLowerCase();
      const usernameTaken = await this.isUsernameTaken(userData.username);
      if (usernameTaken) {
        const err = new Error('This username is already taken. Please choose another username.');
        err.code = 'DUPLICATE_USERNAME';
        throw err;
      }
    }

    const existingIdx = this.data.users.findIndex(u => 
      u.id === userData.id || 
      (userData.email && u.email && u.email.toLowerCase() === userData.email) ||
      (userData.username && u.username && u.username.toLowerCase() === userData.username) ||
      (userData.phone && u.phone && u.phone === userData.phone)
    );
    if (existingIdx !== -1) {
      this.data.users[existingIdx] = { ...this.data.users[existingIdx], ...userData };
    } else {
      this.data.users.unshift(userData);
    }
    this.saveLocal();

    let result = userData;
    if (this.isMongoConnected) {
      try {
        const created = await User.create(userData);
        result = created.toObject();
        console.log(`[USER] User created successfully in MongoDB: ${result.id} (${result.username || result.email || result.phone})`);
      } catch (mongoErr) {
        if (mongoErr.code === 11000) {
          const field = Object.keys(mongoErr.keyPattern || {})[0] || 'credential';
          const err = new Error(`An account with this ${field} already exists.`);
          err.code = 'DUPLICATE_' + field.toUpperCase();
          throw err;
        }
        console.warn(`[USER] MongoDB user write notice (${mongoErr.message}). Persisted to local disk.`);
      }
    } else {
      console.log(`[USER] User created successfully in persistent store: ${userData.id} (@${userData.username || 'user'})`);
    }
    return result;
  }

  async updateUserPassword(identifier, passwordHash) {
    const user = await this.findUserByIdentifier(identifier);
    if (!user) {
      throw new Error('User not found.');
    }
    return this.updateUser(user.id, { passwordHash });
  }

  async findUserById(id) {
    if (this.isMongoConnected) {
      try {
        const orConditions = [{ id: id }];
        if (mongoose.isValidObjectId(id)) {
          orConditions.push({ _id: id });
        }
        const doc = await User.findOne({ $or: orConditions }).lean().exec();
        if (doc) return doc;
      } catch (err) {
        console.warn(`[USER] MongoDB lookup failed (${err.message}). Falling back to local store.`);
      }
    }
    const list = this.get('users');
    return Array.isArray(list) ? list.find(u => u.id === id || String(u._id) === id) : null;
  }

  async findUserByUsername(username) {
    if (!username) return null;
    const clean = String(username).trim().toLowerCase();
    if (this.isMongoConnected) {
      try {
        const doc = await User.findOne({ username: clean }).lean().exec();
        if (doc) return doc;
      } catch (err) {
        console.warn(`[USER] MongoDB username lookup failed: ${err.message}`);
      }
    }
    const list = this.get('users');
    return Array.isArray(list) ? list.find(u => u.username && u.username.toLowerCase() === clean) : null;
  }

  async isUsernameTaken(username, excludeUserId = null) {
    if (!username) return false;
    const clean = String(username).trim().toLowerCase();
    if (this.isMongoConnected) {
      try {
        const query = { username: clean };
        if (excludeUserId) query.id = { $ne: excludeUserId };
        const count = await User.countDocuments(query);
        if (count > 0) return true;
      } catch (err) {}
    }
    const list = this.get('users') || [];
    return list.some(u => u.username && u.username.toLowerCase() === clean && (!excludeUserId || u.id !== excludeUserId));
  }

  async isEmailTaken(email, excludeUserId = null) {
    if (!email) return false;
    const clean = String(email).trim().toLowerCase();
    if (this.isMongoConnected) {
      try {
        const query = { email: clean };
        if (excludeUserId) query.id = { $ne: excludeUserId };
        const count = await User.countDocuments(query);
        if (count > 0) return true;
      } catch (err) {}
    }
    const list = this.get('users') || [];
    return list.some(u => u.email && u.email.toLowerCase() === clean && (!excludeUserId || u.id !== excludeUserId));
  }

  async findUserByEmail(email) {
    if (!email) return null;
    const clean = String(email).trim().toLowerCase();
    if (this.isMongoConnected) {
      try {
        const doc = await User.findOne({ email: clean }).lean().exec();
        if (doc) return doc;
      } catch (err) {
        console.warn(`[USER] MongoDB email lookup failed: ${err.message}`);
      }
    }
    const list = this.get('users');
    return Array.isArray(list) ? list.find(u => u.email && u.email.toLowerCase() === clean) : null;
  }

  async findUserByPhone(phone) {
    if (!phone) return null;
    const clean = String(phone).replace(/\D/g, '').slice(-10);
    if (this.isMongoConnected) {
      try {
        const doc = await User.findOne({ phone: { $regex: clean + '$' } }).lean().exec();
        if (doc) return doc;
      } catch (err) {
        console.warn(`[USER] MongoDB phone lookup failed: ${err.message}`);
      }
    }
    const list = this.get('users');
    return Array.isArray(list) ? list.find(u => u.phone && u.phone.includes(clean)) : null;
  }

  async findUserByIdentifier(identifier) {
    if (!identifier) return null;
    const raw = String(identifier).trim();
    const cleanLower = raw.toLowerCase();
    const digits = raw.replace(/\D/g, '').slice(-10);

    if (this.isMongoConnected) {
      try {
        const orList = [
          { email: cleanLower },
          { username: cleanLower },
          { id: raw },
          { staffId: raw },
          { buyerId: raw }
        ];
        if (digits.length === 10) {
          orList.push({ phone: digits });
        }
        if (mongoose.isValidObjectId(raw)) {
          orList.push({ _id: raw });
        }
        const doc = await User.findOne({ $or: orList }).lean().exec();
        if (doc) return doc;
      } catch (err) {
        console.warn(`[USER] MongoDB identifier lookup failed: ${err.message}`);
      }
    }

    const list = this.get('users') || [];
    return list.find(u => 
      (u.email && u.email.toLowerCase() === cleanLower) ||
      (u.username && u.username.toLowerCase() === cleanLower) ||
      (digits.length === 10 && u.phone && u.phone.endsWith(digits)) ||
      u.id === raw ||
      u.staffId === raw ||
      u.buyerId === raw ||
      String(u._id) === raw
    ) || null;
  }

  async updateUser(id, updateDoc) {
    let updatedItem = null;
    if (Array.isArray(this.data.users)) {
      const idx = this.data.users.findIndex(u => u.id === id || String(u._id) === id);
      if (idx !== -1) {
        this.data.users[idx] = { ...this.data.users[idx], ...updateDoc, updatedAt: new Date().toISOString() };
        updatedItem = this.data.users[idx];
        this.saveLocal();
      }
    }

    if (this.isMongoConnected) {
      try {
        const orConditions = [{ id: id }];
        if (mongoose.isValidObjectId(id)) {
          orConditions.push({ _id: id });
        }
        const doc = await User.findOneAndUpdate(
          { $or: orConditions },
          { $set: { ...updateDoc, updatedAt: new Date() } },
          { returnDocument: 'after' }
        ).lean().exec();
        if (doc) updatedItem = doc;
      } catch (err) {
        console.warn(`[USER] MongoDB user update failed: ${err.message}`);
      }
    }

    return updatedItem;
  }

  // --- ASYNC BOOKING OPERATIONS (MONGODB AS PRIMARY SOURCE OF TRUTH) ---
  
  async createBooking(bookingData) {
    console.log(`[BOOKING] Booking creation started for farmer: ${bookingData.farmerId}`);
    
    // Always insert into local memory and disk store for resilience
    if (!Array.isArray(this.data.bookings)) {
      this.data.bookings = [];
    }
    this.data.bookings.unshift(bookingData);
    this.saveLocal();

    let result = bookingData;

    // Save directly to MongoDB Atlas if connected
    if (this.isMongoConnected) {
      try {
        const created = await Booking.create(bookingData);
        result = created.toObject();
        console.log(`[BOOKING] Booking created successfully in MongoDB: #${result.bookingId}`);
      } catch (mongoErr) {
        console.error(`❌ [BOOKING] MongoDB write failed (${mongoErr.message}). Persisted to local disk.`);
      }
    } else {
      console.log(`[BOOKING] Booking created successfully in persistent store: #${bookingData.bookingId}`);
    }

    return result;
  }

  async getBookings(filterFn = () => true, mongoFilter = {}) {
    if (this.isMongoConnected) {
      try {
        const bookings = await Booking.find(mongoFilter).sort({ createdAt: -1 }).lean().exec();
        return bookings;
      } catch (err) {
        console.warn(`[BOOKING] MongoDB fetch failed (${err.message}). Falling back to local store.`);
      }
    }

    const list = this.get('bookings');
    const filtered = Array.isArray(list) ? list.filter(filterFn) : [];
    return filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }

  async findBookingById(id) {
    if (this.isMongoConnected) {
      try {
        const orConditions = [{ bookingId: id }, { id: id }];
        if (mongoose.isValidObjectId(id)) {
          orConditions.push({ _id: id });
        }
        const doc = await Booking.findOne({ $or: orConditions }).lean().exec();
        if (doc) return doc;
      } catch (err) {
        console.warn(`[BOOKING] MongoDB lookup failed (${err.message}). Falling back to local store.`);
      }
    }

    return this.find('bookings', b => b.bookingId === id || b.id === id || String(b._id) === id);
  }

  async findOneBooking(mongoFilter = {}, filterFn = () => true) {
    if (this.isMongoConnected) {
      try {
        const doc = await Booking.findOne(mongoFilter).lean().exec();
        if (doc) return doc;
      } catch (err) {
        console.warn(`[BOOKING] MongoDB findOne failed (${err.message}). Falling back to local store.`);
      }
    }
    const list = this.get('bookings');
    return Array.isArray(list) ? list.find(filterFn) : null;
  }

  async countBookings(mongoFilter = {}, filterFn = () => true) {
    if (this.isMongoConnected) {
      try {
        return await Booking.countDocuments(mongoFilter);
      } catch (err) {
        console.warn(`[BOOKING] MongoDB count failed (${err.message}). Falling back to local store.`);
      }
    }
    const list = this.get('bookings');
    return Array.isArray(list) ? list.filter(filterFn).length : 0;
  }

  async updateBooking(id, updateDoc) {
    let updatedItem = null;

    // Update in local store
    if (Array.isArray(this.data.bookings)) {
      const idx = this.data.bookings.findIndex(b => b.bookingId === id || b.id === id || String(b._id) === id);
      if (idx !== -1) {
        this.data.bookings[idx] = { ...this.data.bookings[idx], ...updateDoc, updatedAt: new Date().toISOString() };
        updatedItem = this.data.bookings[idx];
        this.saveLocal();
      }
    }

    // Update in MongoDB Atlas
    if (this.isMongoConnected) {
      try {
        const orConditions = [{ bookingId: id }, { id: id }];
        if (mongoose.isValidObjectId(id)) {
          orConditions.push({ _id: id });
        }
        const doc = await Booking.findOneAndUpdate(
          { $or: orConditions },
          { $set: { ...updateDoc, updatedAt: new Date() } },
          { returnDocument: 'after' }
        ).lean().exec();
        if (doc) updatedItem = doc;
      } catch (mongoErr) {
        console.warn(`[BOOKING] MongoDB update failed (${mongoErr.message}).`);
      }
    }

    return updatedItem;
  }

  // Synchronous Read Operations (Backward compatibility)
  get(collection) {
    return this.data[collection] || [];
  }

  find(collection, predicate) {
    const list = this.get(collection);
    return Array.isArray(list) ? list.find(predicate) : null;
  }

  filter(collection, predicate) {
    const list = this.get(collection);
    return Array.isArray(list) ? list.filter(predicate) : [];
  }

  getSingle(key) {
    return this.data[key];
  }

  // Write Operations with dual persistence (Memory/Disk + MongoDB)
  insert(collection, item) {
    if (!Array.isArray(this.data[collection])) {
      this.data[collection] = [];
    }
    this.data[collection].unshift(item);
    this.saveLocal();

    // Async push to MongoDB if connected
    if (this.isMongoConnected && MODEL_MAP[collection]) {
      MODEL_MAP[collection].create(item).catch(err => {
        console.warn(`[MONGO ASYNC WRITE WARNING] Insert in ${collection} failed:`, err.message);
      });
    }

    return item;
  }

  update(collection, predicate, updateFn) {
    if (Array.isArray(this.data[collection])) {
      const idx = this.data[collection].findIndex(predicate);
      if (idx !== -1) {
        this.data[collection][idx] = updateFn(this.data[collection][idx]);
        this.saveLocal();

        // Async update in MongoDB if connected
        const item = this.data[collection][idx];
        const lookupId = item?.bookingId || item?.id;
        if (this.isMongoConnected && MODEL_MAP[collection] && lookupId) {
          MODEL_MAP[collection].updateOne(
            { $or: [{ id: lookupId }, { bookingId: lookupId }] }, 
            item, 
            { upsert: true }
          ).catch(err => {
            console.warn(`[MONGO ASYNC UPDATE WARNING] Update in ${collection} failed:`, err.message);
          });
        }

        return this.data[collection][idx];
      }
    }
    return null;
  }

  set(collection, items) {
    this.data[collection] = items;
    this.saveLocal();
    return items;
  }

  setSingle(key, val) {
    this.data[key] = val;
    this.saveLocal();
    return val;
  }
}

export const db = new Database();
export { User, Booking, Procurement, Centre, Crop, Notification, BuyerOrder, Otp };
