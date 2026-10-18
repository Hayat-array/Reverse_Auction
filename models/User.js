import mongoose from 'mongoose';
import { isMemoryMode } from '../lib/db/mongodb.js';
import { MemoryUser } from '../lib/db/inMemoryStore.js';

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
    },
    role: {
      type: String,
      enum: ['BUYER', 'SUPPLIER', 'ADMIN'],
      default: 'SUPPLIER',
      required: true,
    },
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
    },
    carrierCode: {
      type: String,
      trim: true,
    },
    avatar: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

const MongooseUser = mongoose.models.User || mongoose.model('User', UserSchema);

// Proxy delegates to MemoryUser if MongoDB is not running locally
const User = new Proxy(MongooseUser, {
  get(target, prop) {
    if (isMemoryMode()) {
      return MemoryUser[prop] || target[prop];
    }
    return target[prop];
  },
  construct(target, args) {
    if (isMemoryMode()) {
      const doc = { ...args[0], _id: '65f' + Math.random().toString(16).substring(2, 22) };
      doc.save = async () => MemoryUser.create(doc);
      return doc;
    }
    return new target(...args);
  }
});

export default User;
