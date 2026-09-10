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

    if (!uri || uri === 'mongodb://localhost:27017/agriqueue' && !process.env.ENABLE_LOCAL_MONGO) {
      // Check if user set an explicit Atlas or real MongoDB URI
      if (!uri) {
        console.log('ℹ️  [DATABASE] MONGODB_URI not set in .env. Using high-performance disk-backed store.json.');
        return false;
      }
    }

    try {
      console.log(`[DATABASE] Connecting to MongoDB: ${this.maskUri(uri)}...`);
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000
      });

      this.isMongoConnected = true;
      this.mongoUri = uri;
      console.log('✅ [DATABASE] Successfully connected to MongoDB.');

      // Sync seed data into MongoDB if collections are empty
      await this.syncToMongo();
      return true;
    } catch (err) {
      this.isMongoConnected = false;
      console.warn(`⚠️  [DATABASE] MongoDB connection attempt failed (${err.message}). Seamlessly running on persistent disk store.`);
      return false;
    }
  }

  async syncToMongo() {
    if (!this.isMongoConnected) return;
    try {
      for (const [colName, Model] of Object.entries(MODEL_MAP)) {
        const count = await Model.countDocuments();
        if (count === 0 && Array.isArray(this.data[colName]) && this.data[colName].length > 0) {
          console.log(`[DATABASE] Seeding ${this.data[colName].length} items into MongoDB '${colName}' collection...`);
          await Model.insertMany(this.data[colName], { ordered: false }).catch(() => {});
        }
      }
    } catch (err) {
      console.warn('[DATABASE] Seed sync error:', err.message);
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
      provider: this.isMongoConnected ? 'MongoDB' : 'Persistent File DB (store.json)',
      connected: true,
      mongoConnected: this.isMongoConnected,
      mongoUri: this.isMongoConnected ? this.maskUri(this.mongoUri) : null,
      dataFile: 'server/data/store.json',
      collections,
      timestamp: new Date().toISOString()
    };
  }

  // Synchronous Read Operations
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
        if (this.isMongoConnected && MODEL_MAP[collection] && this.data[collection][idx]?.id) {
          const updatedDoc = this.data[collection][idx];
          MODEL_MAP[collection].updateOne({ id: updatedDoc.id }, updatedDoc, { upsert: true }).catch(err => {
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
