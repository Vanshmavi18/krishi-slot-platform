// server/data/db.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initialData } from './seed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'store.json');

class Database {
  constructor() {
    this.data = null;
    this.init();
  }

  init() {
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
        if (changed) this.save();
      } else {
        this.data = JSON.parse(JSON.stringify(initialData));
        this.save();
      }
    } catch (err) {
      console.error('Error loading db file, falling back to initial data:', err);
      this.data = JSON.parse(JSON.stringify(initialData));
      this.save();
    }
  }

  save() {
    try {
      const tempFile = `${DB_FILE}.tmp`;
      fs.writeFileSync(tempFile, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tempFile, DB_FILE);
    } catch (err) {
      console.error('Failed to save DB file:', err);
    }
  }

  get(collection) {
    return this.data[collection] || [];
  }

  set(collection, items) {
    this.data[collection] = items;
    this.save();
  }

  find(collection, predicate) {
    const list = this.get(collection);
    return Array.isArray(list) ? list.find(predicate) : null;
  }

  filter(collection, predicate) {
    const list = this.get(collection);
    return Array.isArray(list) ? list.filter(predicate) : [];
  }

  insert(collection, item) {
    if (!Array.isArray(this.data[collection])) {
      this.data[collection] = [];
    }
    this.data[collection].unshift(item);
    this.save();
    return item;
  }

  update(collection, predicate, updateFn) {
    if (Array.isArray(this.data[collection])) {
      const idx = this.data[collection].findIndex(predicate);
      if (idx !== -1) {
        this.data[collection][idx] = updateFn(this.data[collection][idx]);
        this.save();
        return this.data[collection][idx];
      }
    }
    return null;
  }

  getSingle(key) {
    return this.data[key];
  }

  setSingle(key, val) {
    this.data[key] = val;
    this.save();
    return val;
  }
}

export const db = new Database();
