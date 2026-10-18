import mongoose from 'mongoose';
import { isMemoryMode } from '../lib/db/mongodb.js';
import { MemoryActivityLog } from '../lib/db/inMemoryStore.js';

const ActivityLogSchema = new mongoose.Schema(
  {
    auctionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Auction',
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      enum: [
        'AUCTION_CREATED',
        'BID_PLACED',
        'RANK_CHANGED',
        'AUCTION_EXTENDED',
        'AUCTION_CLOSED',
        'AUCTION_FORCE_CLOSED',
      ],
      required: true,
    },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    supplierName: {
      type: String,
      default: null,
    },
    bidId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bid',
      default: null,
    },
    description: {
      type: String,
      required: true,
    },
    oldCloseTime: {
      type: Date,
      default: null,
    },
    newCloseTime: {
      type: Date,
      default: null,
    },
    reason: {
      type: String,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

ActivityLogSchema.index({ auctionId: 1, createdAt: -1 });

const MongooseActivityLog = mongoose.models.ActivityLog || mongoose.model('ActivityLog', ActivityLogSchema);

const ActivityLog = new Proxy(MongooseActivityLog, {
  get(target, prop) {
    if (isMemoryMode()) {
      return MemoryActivityLog[prop] || target[prop];
    }
    return target[prop];
  },
  construct(target, args) {
    if (isMemoryMode()) {
      const doc = { ...args[0], _id: '65f' + Math.random().toString(16).substring(2, 22) };
      doc.save = async () => MemoryActivityLog.create(doc);
      doc.toObject = () => doc;
      return doc;
    }
    return new target(...args);
  }
});

export default ActivityLog;
