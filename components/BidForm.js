'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { 
  Send, 
  AlertCircle, 
  CheckCircle2
} from 'lucide-react';

/**
 * Competitive Bid Submission Form for Suppliers
 *
 * @param {Object} props
 * @param {string} props.auctionId
 * @param {boolean} props.isAcceptingBids
 * @param {string} props.status
 * @param {number|null} props.currentL1Price
 * @param {Array} props.rankings
 * @param {Function} props.onBidSuccess
 */
export default function BidForm({
  auctionId,
  isAcceptingBids = true,
  status = 'ACTIVE',
  currentL1Price = null,
  rankings = [],
  onBidSuccess,
}) {
  const { currentUser, isSupplier } = useAuth();

  const [customCarrierName, setCustomCarrierName] = useState('');
  const [freightCharges, setFreightCharges] = useState('');
  const [originCharges, setOriginCharges] = useState('5000');
  const [destinationCharges, setDestinationCharges] = useState('5000');
  const [transitTime, setTransitTime] = useState('18');
  const [quoteValidityDays, setQuoteValidityDays] = useState('30');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Declarative carrier name resolution without effect state cascades
  const defaultCarrierName = currentUser?.companyName ? `${currentUser.companyName} Express` : '';
  const carrierName = customCarrierName !== '' ? customCarrierName : defaultCarrierName;

  // Live total price calculation
  const numFreight = parseFloat(freightCharges) || 0;
  const numOrigin = parseFloat(originCharges) || 0;
  const numDest = parseFloat(destinationCharges) || 0;
  const totalPrice = numFreight + numOrigin + numDest;

  // Find user's own current best bid in this auction
  const myExistingEntry = rankings.find(
    r => currentUser && (String(r.supplierId) === String(currentUser._id) || String(r.supplierId) === String(currentUser.id))
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!isSupplier) {
      setErrorMsg('Unauthorized: Only authenticated Suppliers can submit bids. Buyers monitor auctions and rankings.');
      return;
    }

    if (!isAcceptingBids) {
      setErrorMsg(`Auction is not accepting bids (Status: ${status}).`);
      return;
    }

    if (!carrierName.trim()) {
      setErrorMsg('Carrier / Vessel name is required.');
      return;
    }

    if (numFreight <= 0) {
      setErrorMsg('Freight charges must be greater than zero.');
      return;
    }

    if (myExistingEntry && totalPrice >= myExistingEntry.totalPrice) {
      setErrorMsg(
        `Your bid (₹${totalPrice.toLocaleString()}) must be strictly lower than your own best quote of ₹${myExistingEntry.totalPrice.toLocaleString()}.`
      );
      return;
    }

    try {
      setSubmitting(true);
      const validityDate = new Date();
      validityDate.setDate(validityDate.getDate() + parseInt(quoteValidityDays || 30));

      const res = await fetch(`/api/auctions/${auctionId}/bids`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          carrierName: carrierName.trim(),
          freightCharges: numFreight,
          originCharges: numOrigin,
          destinationCharges: numDest,
          transitTime: parseInt(transitTime) || 15,
          quoteValidity: validityDate.toISOString(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Bid submission failed');
      }

      setSuccessMsg(data.message || 'Bid placed successfully!');
      // Reset freight charges field for next iteration
      setFreightCharges('');
      if (onBidSuccess) {
        onBidSuccess(data.data);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error submitting bid. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Quick helper to fill a winning L1 bid
  const handleAutoSuggestBid = () => {
    const target = currentL1Price ? currentL1Price - 1000 : 85000;
    const origin = 5000;
    const dest = 5000;
    const freight = Math.max(1000, target - origin - dest);
    setFreightCharges(String(freight));
    setOriginCharges(String(origin));
    setDestinationCharges(String(dest));
  };

  return (
    <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
        <div className="flex items-center space-x-2">
          <Send className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Submit Competitive Quote</h3>
        </div>
        {currentL1Price && isSupplier && (
          <button
            type="button"
            onClick={handleAutoSuggestBid}
            className="self-start sm:self-auto text-[11px] text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium flex items-center space-x-1"
          >
            <span>Suggest Beat L1 (₹{(currentL1Price - 1000).toLocaleString()})</span>
          </button>
        )}
      </div>

      {/* Role Notice if Buyer */}
      {!isSupplier && (
        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-lg flex items-start space-x-2 text-xs text-amber-900 dark:text-amber-300">
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Buyer Monitoring Mode:</span> Buyers are not permitted to submit bids. To place competitive quotes, sign out and log in as a Supplier (e.g. <span className="font-mono font-medium">maersk@gocomet.demo</span>).
          </div>
        </div>
      )}

      {/* Error / Success Feedback */}
      {errorMsg && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-lg flex items-start space-x-2 text-xs text-red-800 dark:text-red-300">
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-lg flex items-start space-x-2 text-xs text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Carrier Name */}
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Carrier / Vessel Name <span className="text-red-500 dark:text-red-400">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              required
              placeholder="e.g. Maersk Line - Express Vessel 102"
              value={carrierName}
              onChange={(e) => setCustomCarrierName(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
            />
          </div>
        </div>

        {/* Charge Inputs in 3 Columns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Ocean/Freight (₹) <span className="text-red-500 dark:text-red-400">*</span>
            </label>
            <input
              type="number"
              required
              min="1"
              placeholder="e.g. 75000"
              value={freightCharges}
              onChange={(e) => setFreightCharges(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 font-mono focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Origin Charges (₹)
            </label>
            <input
              type="number"
              min="0"
              placeholder="0"
              value={originCharges}
              onChange={(e) => setOriginCharges(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 font-mono focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Destination Charges (₹)
            </label>
            <input
              type="number"
              min="0"
              placeholder="0"
              value={destinationCharges}
              onChange={(e) => setDestinationCharges(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 font-mono focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
            />
          </div>
        </div>

        {/* Transit & Validity */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Transit Time (Days)
            </label>
            <input
              type="number"
              min="1"
              value={transitTime}
              onChange={(e) => setTransitTime(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Quote Validity (Days)
            </label>
            <input
              type="number"
              min="1"
              value={quoteValidityDays}
              onChange={(e) => setQuoteValidityDays(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
            />
          </div>
        </div>

        {/* Calculated Total Price Highlight */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400">Total Calculated Bid:</span>
            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              ₹{totalPrice.toLocaleString()}
            </div>
          </div>
          <div className="text-right text-xs">
            {myExistingEntry ? (
              <span className="text-slate-500 dark:text-slate-400">
                Your Best: <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold">₹{myExistingEntry.totalPrice.toLocaleString()}</span>
              </span>
            ) : currentL1Price ? (
              <span className="text-slate-500 dark:text-slate-400">
                Current L1: <span className="font-mono text-emerald-600 dark:text-emerald-300 font-semibold">₹{currentL1Price.toLocaleString()}</span>
              </span>
            ) : (
              <span className="text-slate-500 dark:text-slate-400">Opening Bid</span>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting || !isAcceptingBids || !isSupplier}
          className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          <Send className="w-3.5 h-3.5" />
          <span>
            {!isSupplier
              ? 'Buyer Mode (Bidding Restricted to Suppliers)'
              : submitting
              ? 'Validating & Placing Bid...'
              : 'Submit Quote & Compete'}
          </span>
        </button>
      </form>
    </div>
  );
}
