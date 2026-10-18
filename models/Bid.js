import mongoose from 'mongoose';
import { isMemoryMode } from '../lib/db/mongodb.js';
import { MemoryBid } from '../lib/db/inMemoryStore.js';

const BidSchema = new mongoose.Schema(
  {
    auctionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Auction',
      required: true,
      index: true,
    },
    rfqId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RFQ',
      required: true,
      index: true,
    },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    supplierName: {
      type: String,
      required: true,
    },
    carrierName: {
      type: String,
      required: [true, 'Carrier name is required'],
      trim: true,
    },
    freightCharges: {
      type: Number,
      required: true,
      min: [0, 'Freight charges cannot be negative'],
    },
    originCharges: {
      type: Number,
      required: true,
      min: [0, 'Origin charges cannot be negative'],
      default: 0,
    },
    destinationCharges: {
      type: Number,
      required: true,
      min: [0, 'Destination charges cannot be negative'],
      default: 0,
    },
    transitTime: {
      type: Number,
      required: true,
      min: [1, 'Transit time must be at least 1 day'],
      default: 15,
    },
    quoteValidity: {
      type: Date,
      required: true,
    },
    totalPrice: {
      type: Number,
      required: true,
      min: [0, 'Total price cannot be negative'],
    },
    rankAtSubmission: {
      type: Number,
      default: null,
    },
    isL1: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

BidSchema.index({ auctionId: 1, totalPrice: 1 });
BidSchema.index({ auctionId: 1, supplierId: 1, createdAt: -1 });
BidSchema.index({ auctionId: 1, createdAt: -1 });

const MongooseBid = mongoose.models.Bid || mongoose.model('Bid', BidSchema);

const Bid = new Proxy(MongooseBid, {
  get(target, prop) {
    if (isMemoryMode()) {
      return MemoryBid[prop] || target[prop];
    }
    return target[prop];
  },
  construct(target, args) {
    if (isMemoryMode()) {
      const doc = { ...args[0], _id: '65f' + Math.random().toString(16).substring(2, 22) };
      doc.save = async () => MemoryBid.create(doc);
      doc.toObject = () => doc;
      return doc;
    }
    return new target(...args);
  }
});

export default Bid;
