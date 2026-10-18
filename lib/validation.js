import { z } from 'zod';

export const RFQSchema = z.object({
  name: z.string().min(3, 'RFQ name must be at least 3 characters'),
  referenceId: z.string().min(2, 'Reference ID is required'),
  pickupDate: z.string().or(z.date()).refine((d) => !isNaN(new Date(d).getTime()), {
    message: 'Valid pickup date is required',
  }),
  serviceDate: z.string().or(z.date()).optional().nullable(),
  commodity: z.string().optional(),
  targetPrice: z.number().positive('Target price must be positive').optional().nullable(),
});

export const AuctionConfigSchema = z.object({
  bidStartTime: z.string().or(z.date()),
  bidCloseTime: z.string().or(z.date()),
  forcedCloseTime: z.string().or(z.date()),
  triggerWindowMinutes: z.number().int().positive('Trigger window must be > 0 minutes'),
  extensionDurationMinutes: z.number().int().positive('Extension duration must be > 0 minutes'),
  extensionTrigger: z.enum(['BID_RECEIVED', 'RANK_CHANGE', 'L1_CHANGE']),
}).superRefine((data, ctx) => {
  const start = new Date(data.bidStartTime).getTime();
  const close = new Date(data.bidCloseTime).getTime();
  const forced = new Date(data.forcedCloseTime).getTime();

  if (isNaN(start)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid bid start time', path: ['bidStartTime'] });
  }
  if (isNaN(close)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid bid close time', path: ['bidCloseTime'] });
  }
  if (isNaN(forced)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid forced bid close time', path: ['forcedCloseTime'] });
  }

  if (start >= close) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Bid Start Time must be strictly earlier than Bid Close Time',
      path: ['bidStartTime'],
    });
  }

  if (close >= forced) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Forced Bid Close Time must be strictly later than Bid Close Time',
      path: ['forcedCloseTime'],
    });
  }
});

export const BidInputSchema = z.object({
  auctionId: z.string().min(1, 'Auction ID is required'),
  supplierId: z.string().min(1, 'Supplier ID is required'),
  carrierName: z.string().min(2, 'Carrier / vessel name is required'),
  freightCharges: z.number().positive('Freight charges must be greater than zero'),
  originCharges: z.number().nonnegative('Origin charges cannot be negative').default(0),
  destinationCharges: z.number().nonnegative('Destination charges cannot be negative').default(0),
  transitTime: z.number().int().min(1, 'Transit time must be at least 1 day').default(15),
  quoteValidity: z.string().or(z.date()).refine((d) => {
    const time = new Date(d).getTime();
    return !isNaN(time);
  }, { message: 'Valid quote validity date is required' }),
});

/**
 * Validates whether an incoming bid price qualifies compared to the current L1 price.
 * In a British reverse auction, any valid bid lower than current L1 beats the leader.
 */
export function validateBidPrice(newTotalPrice, currentLowestPrice) {
  if (typeof newTotalPrice !== 'number' || isNaN(newTotalPrice) || newTotalPrice <= 0) {
    return { valid: false, error: 'Total bid price must be a valid positive amount' };
  }

  if (currentLowestPrice !== null && currentLowestPrice !== undefined && newTotalPrice >= currentLowestPrice) {
    return {
      valid: false,
      error: `Your bid (₹${newTotalPrice.toLocaleString()}) must be lower than the current L1 price (₹${currentLowestPrice.toLocaleString()}).`,
    };
  }

  return { valid: true, error: null };
}

/**
 * Validates auction timing constraints.
 */
export function validateAuctionTiming(startTime, closeTime, forcedCloseTime) {
  const start = new Date(startTime).getTime();
  const close = new Date(closeTime).getTime();
  const forced = new Date(forcedCloseTime).getTime();

  if (isNaN(start) || isNaN(close) || isNaN(forced)) {
    return { valid: false, error: 'All auction timestamps must be valid dates' };
  }

  if (start >= close) {
    return { valid: false, error: 'Bid Start Time must be before Bid Close Time' };
  }

  if (close >= forced) {
    return { valid: false, error: 'Forced Bid Close Time must be strictly later than Bid Close Time' };
  }

  return { valid: true, error: null };
}
