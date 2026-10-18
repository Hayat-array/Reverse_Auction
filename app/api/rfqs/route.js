import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import RFQ from '@/models/RFQ';
import Auction from '@/models/Auction';
import ActivityLog from '@/models/ActivityLog';
import { requireRole } from '@/lib/auth/requireRole';

export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status');

    const query = {};
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { referenceId: { $regex: search, $options: 'i' } },
        { 'origin.port': { $regex: search, $options: 'i' } },
        { 'destination.port': { $regex: search, $options: 'i' } },
      ];
    }
    if (status) {
      query.status = status;
    }

    const rfqs = await RFQ.find(query)
      .populate('auctionId')
      .populate('buyerId', 'name companyName email')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: rfqs,
    });
  } catch (error) {
    console.error('GET /api/rfqs error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch RFQs' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    // 1. Authorize: Only BUYER or ADMIN can create RFQs
    const { user: authUser, error: authError } = await requireRole(['BUYER', 'ADMIN'], request);
    if (authError) {
      return authError;
    }

    await connectDB();
    const body = await request.json();

    const {
      title,
      referenceId,
      origin,
      destination,
      mode = 'OCEAN_FCL',
      containerType = '40ft Standard (40HC)',
      quantity = 10,
      commodity = 'General Cargo',
      targetPrice = 0,
      pickupDate,
      serviceDate,
      // British Auction config
      enableAuction = true,
      bidStartTime,
      bidCloseTime,
      forcedCloseTime,
      triggerWindowMinutes = 10,
      extensionDurationMinutes = 5,
      extensionTrigger = 'L1_CHANGE',
    } = body || {};

    // Basic RFQ validations
    if (!title || !title.trim()) {
      return NextResponse.json({ success: false, message: 'RFQ Title is required' }, { status: 400 });
    }
    if (!referenceId || !referenceId.trim()) {
      return NextResponse.json({ success: false, message: 'Reference ID is required' }, { status: 400 });
    }
    if (!origin?.port || !destination?.port) {
      return NextResponse.json({ success: false, message: 'Origin and Destination ports are required' }, { status: 400 });
    }
    if (!pickupDate || !serviceDate) {
      return NextResponse.json({ success: false, message: 'Pickup and Service dates are required' }, { status: 400 });
    }

    // Check duplicate referenceId
    const existingRFQ = await RFQ.findOne({ referenceId: referenceId.trim().toUpperCase() });
    if (existingRFQ) {
      return NextResponse.json(
        { success: false, message: `An RFQ with Reference ID ${referenceId} already exists` },
        { status: 400 }
      );
    }

    // Assign buyer ownership strictly from authenticated session
    const buyerId = authUser.id;
    const buyerName = authUser.companyName || authUser.name;

    // Validate Auction Timing constraints if British Auction is enabled
    let auctionData = null;
    if (enableAuction) {
      if (!bidStartTime || !bidCloseTime || !forcedCloseTime) {
        return NextResponse.json(
          { success: false, message: 'Bid Start, Bid Close, and Forced Close times are required for British Auction' },
          { status: 400 }
        );
      }

      const startMs = new Date(bidStartTime).getTime();
      const closeMs = new Date(bidCloseTime).getTime();
      const forcedMs = new Date(forcedCloseTime).getTime();

      if (isNaN(startMs) || isNaN(closeMs) || isNaN(forcedMs)) {
        return NextResponse.json({ success: false, message: 'Invalid date/time format' }, { status: 400 });
      }

      // Invariant: Bid Start < Bid Close < Forced Close
      if (startMs >= closeMs) {
        return NextResponse.json(
          { success: false, message: 'Bid Start Time must be strictly before Bid Close Time' },
          { status: 400 }
        );
      }

      if (forcedMs <= closeMs) {
        return NextResponse.json(
          { success: false, message: 'Forced Bid Close Time must be strictly later than Bid Close Time' },
          { status: 400 }
        );
      }

      const triggerWin = Number(triggerWindowMinutes);
      const extDur = Number(extensionDurationMinutes);

      if (isNaN(triggerWin) || triggerWin < 1) {
        return NextResponse.json(
          { success: false, message: 'Trigger window must be at least 1 minute' },
          { status: 400 }
        );
      }

      if (isNaN(extDur) || extDur < 1) {
        return NextResponse.json(
          { success: false, message: 'Extension duration must be at least 1 minute' },
          { status: 400 }
        );
      }

      if (!['BID_RECEIVED', 'RANK_CHANGE', 'L1_CHANGE'].includes(extensionTrigger)) {
        return NextResponse.json(
          { success: false, message: 'Invalid extension trigger option' },
          { status: 400 }
        );
      }

      auctionData = {
        title: `${title.trim()} - British Reverse Auction`,
        bidStartTime: new Date(startMs),
        bidCloseTime: new Date(closeMs),
        originalCloseTime: new Date(closeMs),
        forcedCloseTime: new Date(forcedMs),
        triggerWindowMinutes: triggerWin,
        extensionDurationMinutes: extDur,
        extensionTrigger,
        status: Date.now() < startMs ? 'UPCOMING' : 'ACTIVE',
      };
    }

    // Create RFQ document with authenticated buyer ownership
    const newRFQ = new RFQ({
      title: title.trim(),
      referenceId: referenceId.trim().toUpperCase(),
      buyerId,
      buyerName,
      origin,
      destination,
      mode,
      containerType,
      quantity: Number(quantity) || 1,
      commodity: commodity || 'General Freight',
      targetPrice: Number(targetPrice) || 0,
      pickupDate: new Date(pickupDate),
      serviceDate: new Date(serviceDate),
      status: 'PUBLISHED',
    });

    await newRFQ.save();

    // Create associated Auction if enabled
    if (enableAuction && auctionData) {
      const newAuction = new Auction({
        ...auctionData,
        rfqId: newRFQ._id,
      });
      await newAuction.save();

      newRFQ.auctionId = newAuction._id;
      await newRFQ.save();

      // Log Auction creation activity
      await ActivityLog.create({
        auctionId: newAuction._id,
        eventType: 'AUCTION_CREATED',
        description: `British Auction created with ${newAuction.triggerWindowMinutes}m Trigger Window, ${newAuction.extensionDurationMinutes}m Extension, Trigger: ${newAuction.extensionTrigger}`,
        metadata: {
          bidCloseTime: newAuction.bidCloseTime,
          forcedCloseTime: newAuction.forcedCloseTime,
          trigger: newAuction.extensionTrigger,
        },
      });
    }

    const populatedRFQ = await RFQ.findById(newRFQ._id).populate('auctionId').populate('buyerId');

    return NextResponse.json(
      {
        success: true,
        message: 'RFQ and British Auction created successfully',
        data: populatedRFQ,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/rfqs error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to create RFQ' },
      { status: 500 }
    );
  }
}
