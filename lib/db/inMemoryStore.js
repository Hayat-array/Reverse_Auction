/**
 * In-Memory High-Performance Procurement Store
 * Provides transparent zero-configuration fallback when external MongoDB is not running locally.
 * Fully supports all British reverse auction mechanics, rankings, and atomic updates.
 */

// Global in-memory storage singleton (survives Next.js HMR)
if (!global.__inMemoryProcurementDb) {
  global.__inMemoryProcurementDb = {
    users: [],
    rfqs: [],
    auctions: [],
    bids: [],
    activityLogs: [],
    initialized: false,
  };
}

const db = global.__inMemoryProcurementDb;

function generateId() {
  return '65f' + Math.random().toString(16).substring(2, 10) + Math.random().toString(16).substring(2, 12);
}

// Clone helper
function clone(obj) {
  if (!obj) return obj;
  return JSON.parse(JSON.stringify(obj));
}

// ==========================================
// Base Collection Wrapper
// ==========================================
class Collection {
  constructor(getArray, setArray) {
    this.getArray = getArray;
    this.setArray = setArray;
  }

  find(query = {}) {
    let items = this.getArray().filter(item => {
      for (const [k, v] of Object.entries(query)) {
        if (k === '$or' && Array.isArray(v)) {
          const match = v.some(subQ => {
            for (const [sk, sv] of Object.entries(subQ)) {
              if (sv instanceof RegExp) {
                const val = sk.includes('.') ? sk.split('.').reduce((o, i) => o?.[i], item) : item[sk];
                return sv.test(String(val || ''));
              }
              if (item[sk] === sv) return true;
            }
            return false;
          });
          if (!match) return false;
        } else if (k === 'auctionId') {
          if (String(item.auctionId?._id || item.auctionId) !== String(v)) return false;
        } else if (k === 'rfqId') {
          if (String(item.rfqId?._id || item.rfqId) !== String(v)) return false;
        } else if (k === 'status') {
          if (item.status !== v) return false;
        } else if (item[k] !== v) {
          return false;
        }
      }
      return true;
    });

    const chain = {
      populate: (opts) => {
        // If populating rfqId or buyerId, resolve the relation from in-memory store
        items = items.map(item => {
          const copy = clone(item);
          if (copy.rfqId && typeof copy.rfqId === 'string') {
            const rfq = db.rfqs.find(r => String(r._id) === String(copy.rfqId));
            if (rfq) copy.rfqId = clone(rfq);
          }
          if (copy.auctionId && typeof copy.auctionId === 'string') {
            const auc = db.auctions.find(a => String(a._id) === String(copy.auctionId));
            if (auc) copy.auctionId = clone(auc);
          }
          if (copy.buyerId && typeof copy.buyerId === 'string') {
            const buyer = db.users.find(u => String(u._id) === String(copy.buyerId));
            if (buyer) copy.buyerId = clone(buyer);
          }
          return copy;
        });
        return chain;
      },
      sort: (sortOpts = {}) => {
        const [field, order] = Object.entries(sortOpts)[0] || ['createdAt', -1];
        items = [...items].sort((a, b) => {
          const valA = a[field] ?? 0;
          const valB = b[field] ?? 0;
          if (valA < valB) return order === 1 ? -1 : 1;
          if (valA > valB) return order === 1 ? 1 : -1;
          return 0;
        });
        return chain;
      },
      limit: (n) => {
        items = items.slice(0, n);
        return chain;
      },
      lean: async () => clone(items),
      then: (resolve) => resolve(clone(items)),
    };

    return chain;
  }

  findById(id) {
    const item = this.getArray().find(x => String(x._id) === String(id));
    if (!item) {
      const emptyChain = {
        populate: () => emptyChain,
        lean: async () => null,
        then: (resolve) => resolve(null),
      };
      return emptyChain;
    }

    const copy = clone(item);
    copy.save = async () => {
      const idx = this.getArray().findIndex(x => String(x._id) === String(id));
      if (idx !== -1) {
        this.getArray()[idx] = { ...copy, updatedAt: new Date() };
      }
      return copy;
    };
    copy.toObject = () => clone(copy);

    const chain = {
      populate: (opts) => {
        if (copy.rfqId && typeof copy.rfqId === 'string') {
          const rfq = db.rfqs.find(r => String(r._id) === String(copy.rfqId));
          if (rfq) copy.rfqId = clone(rfq);
        }
        if (copy.auctionId && typeof copy.auctionId === 'string') {
          const auc = db.auctions.find(a => String(a._id) === String(copy.auctionId));
          if (auc) copy.auctionId = clone(auc);
        }
        if (copy.buyerId && typeof copy.buyerId === 'string') {
          const buyer = db.users.find(u => String(u._id) === String(copy.buyerId));
          if (buyer) copy.buyerId = clone(buyer);
        }
        return chain;
      },
      lean: async () => clone(copy),
      then: (resolve) => resolve(copy),
    };

    return chain;
  }

  findOne(query = {}) {
    const chain = this.find(query);
    return {
      populate: () => chain,
      sort: () => chain,
      lean: async () => {
        const items = await chain.lean();
        return items[0] || null;
      },
      then: async (resolve) => {
        const items = await chain;
        resolve(items[0] || null);
      }
    };
  }

  async create(docs) {
    if (Array.isArray(docs)) {
      const created = docs.map(d => {
        const doc = {
          _id: d._id || generateId(),
          ...clone(d),
          createdAt: d.createdAt || new Date(),
          updatedAt: d.updatedAt || new Date(),
        };
        doc.toObject = () => clone(doc);
        return doc;
      });
      this.getArray().push(...created);
      return created;
    }

    const doc = {
      _id: docs._id || generateId(),
      ...clone(docs),
      createdAt: docs.createdAt || new Date(),
      updatedAt: docs.updatedAt || new Date(),
    };
    doc.toObject = () => clone(doc);
    this.getArray().push(doc);
    return doc;
  }

  async findOneAndUpdate(filter, updates, options = {}) {
    const arr = this.getArray();
    const idx = arr.findIndex(item => {
      if (filter._id && String(item._id) !== String(filter._id)) return false;
      if (filter.version !== undefined && item.version !== filter.version) return false;
      return true;
    });

    if (idx === -1) return null;

    const target = arr[idx];

    // Apply $set and $inc
    if (updates.$set) {
      Object.assign(target, updates.$set);
    }
    if (updates.$inc) {
      for (const [k, v] of Object.entries(updates.$inc)) {
        target[k] = (target[k] || 0) + v;
      }
    }
    target.updatedAt = new Date();

    const result = clone(target);
    result.toObject = () => clone(result);
    return result;
  }

  async findByIdAndUpdate(id, updates, options = {}) {
    return this.findOneAndUpdate({ _id: id }, updates, options);
  }

  async deleteMany() {
    this.setArray([]);
    return { acknowledged: true, deletedCount: 999 };
  }
}

export const MemoryUser = new Collection(() => db.users, v => { db.users = v; });
export const MemoryRFQ = new Collection(() => db.rfqs, v => { db.rfqs = v; });
export const MemoryAuction = new Collection(() => db.auctions, v => { db.auctions = v; });
export const MemoryBid = new Collection(() => db.bids, v => { db.bids = v; });
export const MemoryActivityLog = new Collection(() => db.activityLogs, v => { db.activityLogs = v; });

export function initMemorySeed(force = false) {
  if (!force && db.initialized && db.users.length > 0) return;

  const now = new Date();

  // Seed Users with requested Demo Credentials
  const buyerId = '65f100000000000000000001';
  const DEMO_PW_HASH = '$2b$10$/VIjtuikTMdJkfb8vTPfNO/PJUvxqUwe4GoBV3wz4eIfxAKdvs4xK'; // password123 (verified)

  db.users = [
    {
      _id: buyerId,
      name: 'Demo Buyer',
      email: 'buyer@gocomet.demo',
      passwordHash: DEMO_PW_HASH,
      role: 'BUYER',
      companyName: 'Demo Procurement Co',
      carrierCode: 'BUYR',
      createdAt: now,
    },
    {
      _id: '65f100000000000000000002',
      name: 'Maersk Logistics',
      email: 'maersk@gocomet.demo',
      passwordHash: DEMO_PW_HASH,
      role: 'SUPPLIER',
      companyName: 'Maersk Logistics',
      carrierCode: 'MAEU',
      createdAt: now,
    },
    {
      _id: '65f100000000000000000003',
      name: 'Hapag-Lloyd',
      email: 'hapag@gocomet.demo',
      passwordHash: DEMO_PW_HASH,
      role: 'SUPPLIER',
      companyName: 'Hapag-Lloyd',
      carrierCode: 'HLCU',
      createdAt: now,
    },
    {
      _id: '65f100000000000000000004',
      name: 'CMA CGM',
      email: 'cma@gocomet.demo',
      passwordHash: DEMO_PW_HASH,
      role: 'SUPPLIER',
      companyName: 'CMA CGM',
      carrierCode: 'CMDU',
      createdAt: now,
    },
    {
      _id: '65f100000000000000000005',
      name: 'MSC',
      email: 'msc@gocomet.demo',
      passwordHash: DEMO_PW_HASH,
      role: 'SUPPLIER',
      companyName: 'MSC',
      carrierCode: 'MSCU',
      createdAt: now,
    },
    {
      _id: '65f100000000000000000006',
      name: 'Evergreen',
      email: 'evergreen@gocomet.demo',
      passwordHash: DEMO_PW_HASH,
      role: 'SUPPLIER',
      companyName: 'Evergreen',
      carrierCode: 'EGLV',
      createdAt: now,
    },
  ];

  // 1. Primary Demo Auction: Delhi to Mumbai Express Corridor (Active British Auction)
  const rfq1Id = '65f200000000000000000001';
  const auc1Id = '65f300000000000000000001';

  const demo1CloseTime = new Date(now.getTime() + 35 * 60 * 1000);
  const demo1ForcedClose = new Date(now.getTime() + 70 * 60 * 1000);
  const demo1StartTime = new Date(now.getTime() - 25 * 60 * 1000);

  const rfq1 = {
    _id: rfq1Id,
    title: 'Delhi to Mumbai Freight Contract (Dry Container)',
    referenceId: 'RFQ-2026-DEL-BOM',
    buyerId,
    buyerName: 'Global Retail & Logistics Corp',
    origin: { port: 'ICD Tughlakabad (DEL)', country: 'India', code: 'INDEL' },
    destination: { port: 'Nhava Sheva Port (BOM)', country: 'India', code: 'INNSA' },
    mode: 'ROAD_FREIGHT',
    containerType: '40ft High Cube (40HC)',
    quantity: 15,
    commodity: 'Industrial Equipment & FMCG Goods',
    targetPrice: 90000,
    pickupDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    serviceDate: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
    auctionId: auc1Id,
    status: 'PUBLISHED',
    createdAt: demo1StartTime,
  };

  const auc1 = {
    _id: auc1Id,
    rfqId: rfq1,
    title: 'Delhi to Mumbai Freight Contract - British Auction',
    bidStartTime: demo1StartTime,
    bidCloseTime: demo1CloseTime,
    originalCloseTime: demo1CloseTime,
    forcedCloseTime: demo1ForcedClose,
    triggerWindowMinutes: 10,
    extensionDurationMinutes: 5,
    extensionTrigger: 'L1_CHANGE',
    status: 'ACTIVE',
    currentL1Price: 85000,
    currentL1SupplierId: '65f100000000000000000002',
    currentL1SupplierName: 'Maersk Line Logistics',
    totalBidsCount: 3,
    extensionsCount: 0,
    version: 1,
    createdAt: demo1StartTime,
  };

  // 2. Urgent Demo Auction: Nhava Sheva to Rotterdam (Urgent in trigger window)
  const rfq2Id = '65f200000000000000000002';
  const auc2Id = '65f300000000000000000002';
  const demo2CloseTime = new Date(now.getTime() + 8 * 60 * 1000);
  const demo2ForcedClose = new Date(now.getTime() + 25 * 60 * 1000);
  const demo2StartTime = new Date(now.getTime() - 20 * 60 * 1000);

  const rfq2 = {
    _id: rfq2Id,
    title: 'Spot Ocean Freight: Nhava Sheva to Rotterdam',
    referenceId: 'RFQ-2026-MUM-ROT',
    buyerId,
    buyerName: 'Global Retail & Logistics Corp',
    origin: { port: 'Nhava Sheva (JNPT)', country: 'India', code: 'INNSA' },
    destination: { port: 'Rotterdam Main', country: 'Netherlands', code: 'NLRTM' },
    mode: 'OCEAN_FCL',
    containerType: '40ft High Cube (40HC)',
    quantity: 20,
    commodity: 'Consumer Electronics & Solar Panels',
    targetPrice: 95000,
    pickupDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
    serviceDate: new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000),
    auctionId: auc2Id,
    status: 'PUBLISHED',
    createdAt: demo2StartTime,
  };

  const auc2 = {
    _id: auc2Id,
    rfqId: rfq2,
    title: 'Spot Ocean Freight: Nhava Sheva to Rotterdam - British Auction',
    bidStartTime: demo2StartTime,
    bidCloseTime: demo2CloseTime,
    originalCloseTime: demo2CloseTime,
    forcedCloseTime: demo2ForcedClose,
    triggerWindowMinutes: 5,
    extensionDurationMinutes: 2,
    extensionTrigger: 'BID_RECEIVED',
    status: 'ACTIVE',
    currentL1Price: 92000,
    currentL1SupplierId: '65f100000000000000000005',
    currentL1SupplierName: 'MSC Mediterranean Shipping',
    totalBidsCount: 2,
    extensionsCount: 0,
    version: 1,
    createdAt: demo2StartTime,
  };

  // 3. Concluded Auction: Singapore to Frankfurt Air Cargo (Closed)
  const rfq3Id = '65f200000000000000000003';
  const auc3Id = '65f300000000000000000003';
  const demo3CloseTime = new Date(now.getTime() - 20 * 60 * 1000);
  const demo3ForcedClose = new Date(now.getTime() - 10 * 60 * 1000);
  const demo3StartTime = new Date(now.getTime() - 60 * 60 * 1000);

  const rfq3 = {
    _id: rfq3Id,
    title: 'Priority Air Freight: Singapore to Frankfurt Medical Cargo',
    referenceId: 'RFQ-2026-SIN-FRA',
    buyerId,
    buyerName: 'Global Retail & Logistics Corp',
    origin: { port: 'Singapore Changi (SIN)', country: 'Singapore', code: 'SGSIN' },
    destination: { port: 'Frankfurt Main (FRA)', country: 'Germany', code: 'DEFRA' },
    mode: 'AIR',
    containerType: 'Temperature Controlled Unit',
    quantity: 6,
    commodity: 'Pharmaceutical Vaccines',
    targetPrice: 125000,
    pickupDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
    serviceDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    auctionId: auc3Id,
    status: 'COMPLETED',
    createdAt: demo3StartTime,
  };

  const auc3 = {
    _id: auc3Id,
    rfqId: rfq3,
    title: 'Priority Air Freight: Singapore to Frankfurt - British Auction',
    bidStartTime: demo3StartTime,
    bidCloseTime: demo3CloseTime,
    originalCloseTime: demo3CloseTime,
    forcedCloseTime: demo3ForcedClose,
    triggerWindowMinutes: 10,
    extensionDurationMinutes: 5,
    extensionTrigger: 'L1_CHANGE',
    status: 'CLOSED',
    currentL1Price: 118000,
    currentL1SupplierId: '65f100000000000000000004',
    currentL1SupplierName: 'CMA CGM Freight Solutions',
    totalBidsCount: 3,
    extensionsCount: 1,
    version: 2,
    createdAt: demo3StartTime,
  };

  db.rfqs = [rfq1, rfq2, rfq3];
  db.auctions = [auc1, auc2, auc3];

  db.bids = [
    {
      _id: '65f400000000000000000001',
      auctionId: auc1Id,
      rfqId: rfq1Id,
      supplierId: '65f100000000000000000004',
      supplierName: 'CMA CGM Freight Solutions',
      carrierName: 'CMA CGM Jacques Saade',
      freightCharges: 80000,
      originCharges: 6000,
      destinationCharges: 5000,
      totalPrice: 91000,
      transitTime: 3,
      quoteValidity: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
      rankAtSubmission: 1,
      isL1: false,
      createdAt: new Date(now.getTime() - 15 * 60 * 1000),
    },
    {
      _id: '65f400000000000000000002',
      auctionId: auc1Id,
      rfqId: rfq1Id,
      supplierId: '65f100000000000000000003',
      supplierName: 'Hapag-Lloyd Ocean Transport',
      carrierName: 'Hapag-Lloyd Express Cargo',
      freightCharges: 77000,
      originCharges: 5000,
      destinationCharges: 5000,
      totalPrice: 87000,
      transitTime: 2,
      quoteValidity: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
      rankAtSubmission: 1,
      isL1: false,
      createdAt: new Date(now.getTime() - 10 * 60 * 1000),
    },
    {
      _id: '65f400000000000000000003',
      auctionId: auc1Id,
      rfqId: rfq1Id,
      supplierId: '65f100000000000000000002',
      supplierName: 'Maersk Line Logistics',
      carrierName: 'Maersk Land Transport',
      freightCharges: 75000,
      originCharges: 5000,
      destinationCharges: 5000,
      totalPrice: 85000,
      transitTime: 2,
      quoteValidity: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
      rankAtSubmission: 1,
      isL1: true,
      createdAt: new Date(now.getTime() - 5 * 60 * 1000),
    },
    {
      _id: '65f400000000000000000004',
      auctionId: auc2Id,
      rfqId: rfq2Id,
      supplierId: '65f100000000000000000006',
      supplierName: 'Evergreen Marine Corp',
      carrierName: 'Ever Given',
      freightCharges: 86000,
      originCharges: 6000,
      destinationCharges: 6000,
      totalPrice: 98000,
      transitTime: 22,
      quoteValidity: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
      rankAtSubmission: 1,
      isL1: false,
      createdAt: new Date(now.getTime() - 12 * 60 * 1000),
    },
    {
      _id: '65f400000000000000000005',
      auctionId: auc2Id,
      rfqId: rfq2Id,
      supplierId: '65f100000000000000000005',
      supplierName: 'MSC Mediterranean Shipping',
      carrierName: 'MSC Gulsun',
      freightCharges: 81000,
      originCharges: 6000,
      destinationCharges: 5000,
      totalPrice: 92000,
      transitTime: 20,
      quoteValidity: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
      rankAtSubmission: 1,
      isL1: true,
      createdAt: new Date(now.getTime() - 6 * 60 * 1000),
    },
    {
      _id: '65f400000000000000000006',
      auctionId: auc3Id,
      rfqId: rfq3Id,
      supplierId: '65f100000000000000000004',
      supplierName: 'CMA CGM Freight Solutions',
      carrierName: 'CMA CGM Air Cargo',
      freightCharges: 105000,
      originCharges: 7000,
      destinationCharges: 6000,
      totalPrice: 118000,
      transitTime: 1,
      quoteValidity: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
      rankAtSubmission: 1,
      isL1: true,
      createdAt: new Date(now.getTime() - 25 * 60 * 1000),
    },
  ];

  db.activityLogs = [
    {
      _id: '65f500000000000000000001',
      auctionId: auc1Id,
      eventType: 'AUCTION_CREATED',
      description: 'British Reverse Auction created for Delhi to Mumbai Freight Contract. Trigger: L1_CHANGE.',
      createdAt: demo1StartTime,
    },
    {
      _id: '65f500000000000000000002',
      auctionId: auc1Id,
      eventType: 'BID_PLACED',
      supplierName: 'CMA CGM Freight Solutions',
      description: 'CMA CGM Freight Solutions submitted opening quote of ₹91,000 (Rank: L1)',
      createdAt: new Date(now.getTime() - 15 * 60 * 1000),
    },
    {
      _id: '65f500000000000000000003',
      auctionId: auc1Id,
      eventType: 'BID_PLACED',
      supplierName: 'Hapag-Lloyd Ocean Transport',
      description: 'Hapag-Lloyd submitted competitive quote of ₹87,000 (Took L1 rank)',
      createdAt: new Date(now.getTime() - 10 * 60 * 1000),
    },
    {
      _id: '65f500000000000000000004',
      auctionId: auc1Id,
      eventType: 'BID_PLACED',
      supplierName: 'Maersk Line Logistics',
      description: 'Maersk Line Logistics submitted lowest quote of ₹85,000 (Current L1 leader)',
      createdAt: new Date(now.getTime() - 5 * 60 * 1000),
    },
    {
      _id: '65f500000000000000000005',
      auctionId: auc2Id,
      eventType: 'AUCTION_CREATED',
      description: 'British Reverse Auction opened for Nhava Sheva to Rotterdam. Trigger: BID_RECEIVED.',
      createdAt: demo2StartTime,
    },
    {
      _id: '65f500000000000000000006',
      auctionId: auc2Id,
      eventType: 'BID_PLACED',
      supplierName: 'Evergreen Marine Corp',
      description: 'Evergreen Marine submitted opening quote of ₹98,000 (Rank: L1)',
      createdAt: new Date(now.getTime() - 12 * 60 * 1000),
    },
    {
      _id: '65f500000000000000000007',
      auctionId: auc2Id,
      eventType: 'BID_PLACED',
      supplierName: 'MSC Mediterranean Shipping',
      description: 'MSC Mediterranean Shipping submitted competitive quote of ₹92,000 (Took L1 rank)',
      createdAt: new Date(now.getTime() - 6 * 60 * 1000),
    },
  ];

  db.initialized = true;
}
