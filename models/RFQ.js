import mongoose from 'mongoose';
import { isMemoryMode } from '../lib/db/mongodb.js';
import { MemoryRFQ } from '../lib/db/inMemoryStore.js';

const RFQSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'RFQ Title is required'],
      trim: true,
    },
    referenceId: {
      type: String,
      required: [true, 'Reference ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    buyerName: {
      type: String,
      required: true,
    },
    origin: {
      port: { type: String, required: true },
      country: { type: String, required: true },
      code: { type: String, default: '' },
    },
    destination: {
      port: { type: String, required: true },
      country: { type: String, required: true },
      code: { type: String, default: '' },
    },
    mode: {
      type: String,
      enum: ['OCEAN_FCL', 'OCEAN_LCL', 'AIR_FREIGHT', 'ROAD_FTL'],
      default: 'OCEAN_FCL',
    },
    containerType: {
      type: String,
      default: '40ft Standard (40HC)',
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
      default: 10,
    },
    commodity: {
      type: String,
      default: 'General Cargo',
    },
    targetPrice: {
      type: Number,
      default: 0,
    },
    pickupDate: {
      type: Date,
      required: true,
    },
    serviceDate: {
      type: Date,
      required: true,
    },
    auctionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Auction',
    },
    status: {
      type: String,
      enum: ['DRAFT', 'PUBLISHED', 'COMPLETED', 'CANCELLED'],
      default: 'PUBLISHED',
    },
  },
  {
    timestamps: true,
  }
);

RFQSchema.index({ referenceId: 1 });
RFQSchema.index({ buyerId: 1, createdAt: -1 });

const MongooseRFQ = mongoose.models.RFQ || mongoose.model('RFQ', RFQSchema);

const RFQ = new Proxy(MongooseRFQ, {
  get(target, prop) {
    if (isMemoryMode()) {
      return MemoryRFQ[prop] || target[prop];
    }
    return target[prop];
  },
  construct(target, args) {
    if (isMemoryMode()) {
      const doc = { ...args[0], _id: '65f' + Math.random().toString(16).substring(2, 22) };
      doc.save = async () => MemoryRFQ.create(doc);
      doc.toObject = () => doc;
      return doc;
    }
    return new target(...args);
  }
});

export default RFQ;
