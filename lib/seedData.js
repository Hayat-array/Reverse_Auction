import connectDB, { isMemoryMode } from '@/lib/db/mongodb';
import { initMemorySeed } from '@/lib/db/inMemoryStore';
import User from '@/models/User';
import RFQ from '@/models/RFQ';
import Auction from '@/models/Auction';
import Bid from '@/models/Bid';
import ActivityLog from '@/models/ActivityLog';

export async function runSeed() {
  await connectDB();

  if (isMemoryMode()) {
    console.log('[Seed] Seeding In-Memory British Auction Procurement Store...');
    initMemorySeed(true);
    return {
      success: true,
      message: 'Demo data seeded successfully in In-Memory Procurement Store',
      demoAuctionId: '65f300000000000000000001',
    };
  }

  console.log('Clearing existing collections...');
  await Promise.all([
    User.deleteMany({}),
    RFQ.deleteMany({}),
    Auction.deleteMany({}),
    Bid.deleteMany({}),
    ActivityLog.deleteMany({}),
  ]);

  console.log('Seeding Users with Demo Credentials...');
  const DEMO_PW_HASH = '$2b$10$4zj2Tc/fTKHGtSPa3bZdc.D1dMKrulTW1QaPETo0BHBNBgKCKqmnK'; // password123

  const buyer = await User.create({
    name: 'Demo Buyer',
    email: 'buyer@gocomet.demo',
    passwordHash: DEMO_PW_HASH,
    role: 'BUYER',
    companyName: 'Demo Procurement Co',
    carrierCode: 'BUYR',
  });

  const suppliers = await User.create([
    {
      name: 'Maersk Logistics',
      email: 'maersk@gocomet.demo',
      passwordHash: DEMO_PW_HASH,
      role: 'SUPPLIER',
      companyName: 'Maersk Logistics',
      carrierCode: 'MAEU',
    },
    {
      name: 'Hapag-Lloyd',
      email: 'hapag@gocomet.demo',
      passwordHash: DEMO_PW_HASH,
      role: 'SUPPLIER',
      companyName: 'Hapag-Lloyd',
      carrierCode: 'HLCU',
    },
    {
      name: 'CMA CGM',
      email: 'cma@gocomet.demo',
      passwordHash: DEMO_PW_HASH,
      role: 'SUPPLIER',
      companyName: 'CMA CGM',
      carrierCode: 'CMDU',
    },
    {
      name: 'MSC',
      email: 'msc@gocomet.demo',
      passwordHash: DEMO_PW_HASH,
      role: 'SUPPLIER',
      companyName: 'MSC',
      carrierCode: 'MSCU',
    },
    {
      name: 'Evergreen',
      email: 'evergreen@gocomet.demo',
      passwordHash: DEMO_PW_HASH,
      role: 'SUPPLIER',
      companyName: 'Evergreen',
      carrierCode: 'EGLV',
    },
  ]);

  const [maersk, hapag, cmacgm, msc, evergreen] = suppliers;

  const now = new Date();

  // =========================================================================
  // 1. PRIMARY ACTIVE DEMO AUCTION (Ready for L1_CHANGE trigger demonstration)
  // Bid Close in 3 minutes, Forced Close in 8 minutes, Trigger Window 2 minutes
  // =========================================================================
  const demoCloseTime = new Date(now.getTime() + 3.5 * 60 * 1000); // 3.5 mins from now
  const demoForcedClose = new Date(now.getTime() + 8 * 60 * 1000);  // 8 mins from now
  const demoStartTime = new Date(now.getTime() - 20 * 60 * 1000);   // 20 mins ago

  const rfq1 = await RFQ.create({
    title: 'Spot Freight: 20x40HC Electronics & Consumer Goods',
    referenceId: 'RFQ-2026-MUM-ROT',
    buyerId: buyer._id,
    buyerName: buyer.companyName,
    origin: { port: 'Nhava Sheva (JNPT)', country: 'India', code: 'INNSA' },
    destination: { port: 'Rotterdam', country: 'Netherlands', code: 'NLRTM' },
    mode: 'OCEAN_FCL',
    containerType: '40ft High Cube (40HC)',
    quantity: 20,
    commodity: 'Consumer Electronics & Solar Inverters',
    targetPrice: 90000,
    pickupDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    serviceDate: new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000),
    status: 'PUBLISHED',
  });

  const auction1 = await Auction.create({
    rfqId: rfq1._id,
    title: 'Spot Freight: Nhava Sheva to Rotterdam - British Auction',
    bidStartTime: demoStartTime,
    bidCloseTime: demoCloseTime,
    originalCloseTime: demoCloseTime,
    forcedCloseTime: demoForcedClose,
    triggerWindowMinutes: 2,
    extensionDurationMinutes: 1,
    extensionTrigger: 'L1_CHANGE',
    status: 'ACTIVE',
    currentL1Price: 88000,
    currentL1SupplierId: maersk._id,
    currentL1SupplierName: maersk.companyName,
    totalBidsCount: 3,
    extensionsCount: 0,
  });

  rfq1.auctionId = auction1._id;
  await rfq1.save();

  // Create initial bids for Demo Auction:
  // L3: CMA CGM at ₹95,000
  const bid1_3 = await Bid.create({
    auctionId: auction1._id,
    rfqId: rfq1._id,
    supplierId: cmacgm._id,
    supplierName: cmacgm.companyName,
    carrierName: 'CMA CGM Jacques Saade',
    freightCharges: 82000,
    originCharges: 7000,
    destinationCharges: 6000,
    totalPrice: 95000,
    transitTime: 22,
    quoteValidity: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
    rankAtSubmission: 1,
    isL1: false,
    createdAt: new Date(now.getTime() - 15 * 60 * 1000),
  });

  // L2: Hapag-Lloyd at ₹91,000
  const bid1_2 = await Bid.create({
    auctionId: auction1._id,
    rfqId: rfq1._id,
    supplierId: hapag._id,
    supplierName: hapag.companyName,
    carrierName: 'Hapag-Lloyd Berlin Express',
    freightCharges: 79000,
    originCharges: 6500,
    destinationCharges: 5500,
    totalPrice: 91000,
    transitTime: 21,
    quoteValidity: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
    rankAtSubmission: 1,
    isL1: false,
    createdAt: new Date(now.getTime() - 10 * 60 * 1000),
  });

  // L1: Maersk Line at ₹88,000
  const bid1_1 = await Bid.create({
    auctionId: auction1._id,
    rfqId: rfq1._id,
    supplierId: maersk._id,
    supplierName: maersk.companyName,
    carrierName: 'Maersk Mc-Kinney Moller',
    freightCharges: 76000,
    originCharges: 6000,
    destinationCharges: 6000,
    totalPrice: 88000,
    transitTime: 20,
    quoteValidity: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
    rankAtSubmission: 1,
    isL1: true,
    createdAt: new Date(now.getTime() - 5 * 60 * 1000),
  });

  await ActivityLog.create([
    {
      auctionId: auction1._id,
      eventType: 'AUCTION_CREATED',
      description: 'British Auction opened for bidding. Close set for 3.5m, Forced Close at 8m. Trigger: L1_CHANGE.',
      createdAt: demoStartTime,
    },
    {
      auctionId: auction1._id,
      eventType: 'BID_PLACED',
      supplierId: cmacgm._id,
      supplierName: cmacgm.companyName,
      bidId: bid1_3._id,
      description: `${cmacgm.companyName} submitted opening quote of ₹95,000 (Rank: L1)`,
      createdAt: bid1_3.createdAt,
    },
    {
      auctionId: auction1._id,
      eventType: 'BID_PLACED',
      supplierId: hapag._id,
      supplierName: hapag.companyName,
      bidId: bid1_2._id,
      description: `${hapag.companyName} submitted competitive quote of ₹91,000 (Took L1 rank)`,
      createdAt: bid1_2.createdAt,
    },
    {
      auctionId: auction1._id,
      eventType: 'BID_PLACED',
      supplierId: maersk._id,
      supplierName: maersk.companyName,
      bidId: bid1_1._id,
      description: `${maersk.companyName} submitted lowest quote of ₹88,000 (Current L1 leader)`,
      createdAt: bid1_1.createdAt,
    },
  ]);

  // =========================================================================
  // 2. ACTIVE AUCTION WITH RANK_CHANGE TRIGGER
  // =========================================================================
  const rfq2 = await RFQ.create({
    title: 'Transpacific Fast Route: Shanghai to Los Angeles',
    referenceId: 'RFQ-2026-SHA-LAX',
    buyerId: buyer._id,
    buyerName: buyer.companyName,
    origin: { port: 'Shanghai Port', country: 'China', code: 'CNSHA' },
    destination: { port: 'Port of Los Angeles', country: 'United States', code: 'USLAX' },
    mode: 'OCEAN_FCL',
    containerType: '40ft Standard (40GP)',
    quantity: 15,
    commodity: 'Textiles & Footwear',
    targetPrice: 125000,
    pickupDate: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
    serviceDate: new Date(now.getTime() + 24 * 24 * 60 * 60 * 1000),
    status: 'PUBLISHED',
  });

  const auction2 = await Auction.create({
    rfqId: rfq2._id,
    title: 'Transpacific Route: Shanghai to Los Angeles - British Auction',
    bidStartTime: new Date(now.getTime() - 40 * 60 * 1000),
    bidCloseTime: new Date(now.getTime() + 45 * 60 * 1000),
    originalCloseTime: new Date(now.getTime() + 45 * 60 * 1000),
    forcedCloseTime: new Date(now.getTime() + 75 * 60 * 1000),
    triggerWindowMinutes: 10,
    extensionDurationMinutes: 5,
    extensionTrigger: 'RANK_CHANGE',
    status: 'ACTIVE',
    currentL1Price: 118000,
    currentL1SupplierId: evergreen._id,
    currentL1SupplierName: evergreen.companyName,
    totalBidsCount: 2,
    extensionsCount: 0,
  });

  rfq2.auctionId = auction2._id;
  await rfq2.save();

  await Bid.create([
    {
      auctionId: auction2._id,
      rfqId: rfq2._id,
      supplierId: msc._id,
      supplierName: msc.companyName,
      carrierName: 'MSC Oscar',
      freightCharges: 105000,
      originCharges: 10000,
      destinationCharges: 8000,
      totalPrice: 123000,
      transitTime: 14,
      quoteValidity: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      rankAtSubmission: 1,
      isL1: false,
      createdAt: new Date(now.getTime() - 25 * 60 * 1000),
    },
    {
      auctionId: auction2._id,
      rfqId: rfq2._id,
      supplierId: evergreen._id,
      supplierName: evergreen.companyName,
      carrierName: 'Ever Ace',
      freightCharges: 100000,
      originCharges: 9500,
      destinationCharges: 8500,
      totalPrice: 118000,
      transitTime: 13,
      quoteValidity: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      rankAtSubmission: 1,
      isL1: true,
      createdAt: new Date(now.getTime() - 15 * 60 * 1000),
    },
  ]);

  // =========================================================================
  // 3. FORCE-CLOSED AUCTION (Demonstrating ceiling and closed state)
  // =========================================================================
  const rfq3 = await RFQ.create({
    title: 'Middle East Express: Singapore to Dubai Jebel Ali',
    referenceId: 'RFQ-2026-SIN-DXB',
    buyerId: buyer._id,
    buyerName: buyer.companyName,
    origin: { port: 'Port of Singapore', country: 'Singapore', code: 'SGSIN' },
    destination: { port: 'Jebel Ali Port', country: 'United Arab Emirates', code: 'AEJEA' },
    mode: 'OCEAN_FCL',
    containerType: '20ft Standard (20GP)',
    quantity: 8,
    commodity: 'Industrial Machinery & Spare Parts',
    targetPrice: 65000,
    pickupDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    serviceDate: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
    status: 'COMPLETED',
  });

  const auction3 = await Auction.create({
    rfqId: rfq3._id,
    title: 'Middle East Express: Singapore to Dubai - British Auction',
    bidStartTime: new Date(now.getTime() - 180 * 60 * 1000),
    bidCloseTime: new Date(now.getTime() - 45 * 60 * 1000),
    originalCloseTime: new Date(now.getTime() - 60 * 60 * 1000),
    forcedCloseTime: new Date(now.getTime() - 30 * 60 * 1000),
    triggerWindowMinutes: 5,
    extensionDurationMinutes: 3,
    extensionTrigger: 'BID_RECEIVED',
    status: 'FORCE_CLOSED',
    currentL1Price: 58500,
    currentL1SupplierId: hapag._id,
    currentL1SupplierName: hapag.companyName,
    totalBidsCount: 4,
    extensionsCount: 2,
  });

  rfq3.auctionId = auction3._id;
  await rfq3.save();

  await ActivityLog.create([
    {
      auctionId: auction3._id,
      eventType: 'AUCTION_FORCE_CLOSED',
      description: 'Auction reached Forced Close Time ceiling. Zero further bids accepted. Awarding to L1 winner: Hapag-Lloyd Ocean Transport.',
      createdAt: new Date(now.getTime() - 30 * 60 * 1000),
    },
  ]);

  // =========================================================================
  // 4. UPCOMING AUCTION (Scheduled for tomorrow)
  // =========================================================================
  const rfq4 = await RFQ.create({
    title: 'North Atlantic Route: Hamburg to New York',
    referenceId: 'RFQ-2026-HAM-NYC',
    buyerId: buyer._id,
    buyerName: buyer.companyName,
    origin: { port: 'Port of Hamburg', country: 'Germany', code: 'DEHAM' },
    destination: { port: 'Port of New York & New Jersey', country: 'United States', code: 'USNYC' },
    mode: 'OCEAN_FCL',
    containerType: '40ft High Cube (40HC)',
    quantity: 12,
    commodity: 'Automotive Components',
    targetPrice: 75000,
    pickupDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
    serviceDate: new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000),
    status: 'PUBLISHED',
  });

  const auction4 = await Auction.create({
    rfqId: rfq4._id,
    title: 'North Atlantic Route: Hamburg to New York - British Auction',
    bidStartTime: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    bidCloseTime: new Date(now.getTime() + 28 * 60 * 60 * 1000),
    originalCloseTime: new Date(now.getTime() + 28 * 60 * 60 * 1000),
    forcedCloseTime: new Date(now.getTime() + 30 * 60 * 60 * 1000),
    triggerWindowMinutes: 10,
    extensionDurationMinutes: 5,
    extensionTrigger: 'L1_CHANGE',
    status: 'UPCOMING',
    currentL1Price: null,
    totalBidsCount: 0,
    extensionsCount: 0,
  });

  rfq4.auctionId = auction4._id;
  await rfq4.save();

  console.log('Seeding completed successfully!');
  return {
    success: true,
    message: 'Seeded 1 Buyer, 5 Suppliers, 4 RFQs, and 4 British Auctions (including 1 instant live demo)',
    demoAuctionId: String(auction1._id),
  };
}
