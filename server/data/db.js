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
      const tempFile = `${DB_FILE}.tmp`;
      fs.writeFileSync(tempFile, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tempFile, DB_FILE);
    } catch (err) {
      console.error('[DB ERROR] Failed to write local DB file:', err.message);
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
        serverSelectionTimeoutMS: 6000,
        connectTimeoutMS: 10000
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
          { new: true }
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
