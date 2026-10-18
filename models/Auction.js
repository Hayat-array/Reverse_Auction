import mongoose from 'mongoose';
import { isMemoryMode } from '../lib/db/mongodb.js';
import { MemoryAuction } from '../lib/db/inMemoryStore.js';

const AuctionSchema = new mongoose.Schema(
  {
    rfqId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RFQ',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    bidStartTime: {
      type: Date,
      required: true,
    },
    bidCloseTime: {
      type: Date,
      required: true,
    },
    originalCloseTime: {
      type: Date,
      required: true,
    },
    forcedCloseTime: {
      type: Date,
      required: true,
    },
    triggerWindowMinutes: {
      type: Number,
      required: true,
      min: [1, 'Trigger window must be at least 1 minute'],
    },
    extensionDurationMinutes: {
      type: Number,
      required: true,
      min: [1, 'Extension duration must be at least 1 minute'],
    },
    extensionTrigger: {
      type: String,
      enum: ['BID_RECEIVED', 'RANK_CHANGE', 'L1_CHANGE'],
      default: 'L1_CHANGE',
      required: true,
    },
    status: {
      type: String,
      enum: ['UPCOMING', 'ACTIVE', 'CLOSED', 'FORCE_CLOSED'],
      default: 'ACTIVE',
      index: true,
    },
    currentL1Price: {
      type: Number,
      default: null,
    },
    currentL1SupplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    currentL1SupplierName: {
      type: String,
      default: null,
    },
    totalBidsCount: {
      type: Number,
      default: 0,
    },
    extensionsCount: {
      type: Number,
      default: 0,
    },
    version: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

AuctionSchema.index({ status: 1, bidCloseTime: 1 });
AuctionSchema.index({ status: 1, forcedCloseTime: 1 });

const MongooseAuction = mongoose.models.Auction || mongoose.model('Auction', AuctionSchema);

const Auction = new Proxy(MongooseAuction, {
  get(target, prop) {
    if (isMemoryMode()) {
      return MemoryAuction[prop] || target[prop];
    }
    return target[prop];
  },
  construct(target, args) {
    if (isMemoryMode()) {
      const doc = { ...args[0], _id: '65f' + Math.random().toString(16).substring(2, 22) };
      doc.save = async () => MemoryAuction.create(doc);
      doc.toObject = () => doc;
      return doc;
    }
    return new target(...args);
  }
});

export default Auction;
