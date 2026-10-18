'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  FileText, 
  Gavel, 
  ArrowLeft, 
  AlertCircle, 
  Sparkles
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function CreateRFQPage() {
  const router = useRouter();
  const { currentUser } = useAuth();

  // RFQ fields
  const [title, setTitle] = useState('');
  const [referenceId, setReferenceId] = useState('');
  const [originPort, setOriginPort] = useState('Nhava Sheva (JNPT)');
  const [originCountry, setOriginCountry] = useState('India');
  const [destinationPort, setDestinationPort] = useState('Rotterdam');
  const [destinationCountry, setDestinationCountry] = useState('Netherlands');
  const [mode] = useState('OCEAN_FCL');
  const [containerType, setContainerType] = useState('40ft High Cube (40HC)');
  const [quantity, setQuantity] = useState('10');
  const [commodity] = useState('Consumer Electronics & Apparel');
  const [targetPrice] = useState('85000');
  const [pickupDate, setPickupDate] = useState('');
  const [serviceDate, setServiceDate] = useState('');

  // British Auction Configuration
  const [enableAuction] = useState(true);
  const [bidStartTime, setBidStartTime] = useState('');
  const [bidCloseTime, setBidCloseTime] = useState('');
  const [forcedCloseTime, setForcedCloseTime] = useState('');
  const [triggerWindowMinutes, setTriggerWindowMinutes] = useState('5');
  const [extensionDurationMinutes, setExtensionDurationMinutes] = useState('2');
  const [extensionTrigger, setExtensionTrigger] = useState('L1_CHANGE');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Quick Preset Helper for Demoing
  const loadDemoPreset = () => {
    const now = new Date();
    const start = new Date(now.getTime() - 5 * 60 * 1000); // 5 mins ago
    const close = new Date(now.getTime() + 5 * 60 * 1000);  // 5 mins from now
    const forced = new Date(now.getTime() + 10 * 60 * 1000); // 10 mins from now

    const toLocalISO = (d) => {
      const offset = d.getTimezoneOffset() * 60000;
      return new Date(d.getTime() - offset).toISOString().slice(0, 16);
    };

    const futurePickup = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const futureService = new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const randomSuffix = Math.floor(100 + Math.random() * 900);
    setTitle(`Spot Freight: Mumbai to Antwerp Express #${randomSuffix}`);
    setReferenceId(`RFQ-2026-MUM-ANR-${randomSuffix}`);
    setOriginPort('Nhava Sheva');
    setOriginCountry('India');
    setDestinationPort('Antwerp Port');
    setDestinationCountry('Belgium');
    setPickupDate(futurePickup);
    setServiceDate(futureService);

    setBidStartTime(toLocalISO(start));
    setBidCloseTime(toLocalISO(close));
    setForcedCloseTime(toLocalISO(forced));
    setTriggerWindowMinutes('2');
    setExtensionDurationMinutes('1');
    setExtensionTrigger('L1_CHANGE');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    // Client-side validations
    if (!title.trim() || !referenceId.trim()) {
      setErrorMsg('RFQ Title and Reference ID are required.');
      return;
    }

    if (enableAuction) {
      if (!bidStartTime || !bidCloseTime || !forcedCloseTime) {
        setErrorMsg('Please select Bid Start, Bid Close, and Forced Close dates.');
        return;
      }

      const start = new Date(bidStartTime).getTime();
      const close = new Date(bidCloseTime).getTime();
      const forced = new Date(forcedCloseTime).getTime();

      if (start >= close) {
        setErrorMsg('Validation Error: Bid Start Time must be strictly earlier than Bid Close Time.');
        return;
      }

      if (forced <= close) {
        setErrorMsg('Validation Error: Forced Close Time must be strictly later than Bid Close Time.');
        return;
      }
    }

    try {
      setLoading(true);

      const payload = {
        title: title.trim(),
        referenceId: referenceId.trim().toUpperCase(),
        buyerId: currentUser?._id,
        origin: { port: originPort.trim(), country: originCountry.trim(), code: '' },
        destination: { port: destinationPort.trim(), country: destinationCountry.trim(), code: '' },
        mode,
        containerType,
        quantity: parseInt(quantity) || 1,
        commodity: commodity.trim(),
        targetPrice: parseFloat(targetPrice) || 0,
        pickupDate: new Date(pickupDate).toISOString(),
        serviceDate: new Date(serviceDate).toISOString(),
        enableAuction,
        bidStartTime: new Date(bidStartTime).toISOString(),
        bidCloseTime: new Date(bidCloseTime).toISOString(),
        forcedCloseTime: new Date(forcedCloseTime).toISOString(),
        triggerWindowMinutes: parseInt(triggerWindowMinutes) || 5,
        extensionDurationMinutes: parseInt(extensionDurationMinutes) || 2,
        extensionTrigger,
      };

      const res = await fetch('/api/rfqs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to create RFQ and Auction');
      }

      // Navigate to newly created auction
      if (data.data?.auctionId?._id) {
        router.push(`/auctions/${data.data.auctionId._id}`);
      } else {
        router.push('/auctions');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error creating RFQ. Please check the values.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <Link
          href="/rfqs"
          className="inline-flex items-center space-x-1.5 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to RFQs</span>
        </Link>

        {/* Demo Preset Button */}
        <button
          type="button"
          onClick={loadDemoPreset}
          className="self-start sm:self-auto flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:hover:bg-indigo-900 dark:border-indigo-700/60 text-xs font-semibold shadow-xs transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>Quick Autofill for Live Demo (5m Close)</span>
        </button>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Create RFQ & British Auction</h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Publish a shipment requirement and configure dynamic British reverse auction parameters.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 dark:bg-red-950/40 dark:border-red-800/80 rounded-xl flex items-start space-x-2 text-xs text-red-800 dark:text-red-300">
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <span className="font-medium">{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Shipment & RFQ Information */}
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 space-y-4 shadow-xs transition-colors">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-200 dark:border-slate-800">
            <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h2 className="font-semibold text-slate-900 dark:text-white text-sm">1. RFQ Specification & Route</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                RFQ Title <span className="text-red-500 dark:text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Q4 Ocean Freight: Nhava Sheva to Rotterdam"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Reference ID (Unique) <span className="text-red-500 dark:text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. RFQ-2026-MUM-ROT-001"
                value={referenceId}
                onChange={(e) => setReferenceId(e.target.value.toUpperCase())}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 font-mono focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
              />
            </div>
          </div>

          {/* Origin & Destination */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800 space-y-3">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">Origin Location</span>
              <input
                type="text"
                required
                placeholder="Port Name (e.g. Nhava Sheva)"
                value={originPort}
                onChange={(e) => setOriginPort(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none"
              />
              <input
                type="text"
                required
                placeholder="Country (e.g. India)"
                value={originCountry}
                onChange={(e) => setOriginCountry(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800 space-y-3">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">Destination Location</span>
              <input
                type="text"
                required
                placeholder="Port Name (e.g. Rotterdam)"
                value={destinationPort}
                onChange={(e) => setDestinationPort(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none"
              />
              <input
                type="text"
                required
                placeholder="Country (e.g. Netherlands)"
                value={destinationCountry}
                onChange={(e) => setDestinationCountry(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none"
              />
            </div>
          </div>

          {/* Cargo & Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Container Type</label>
              <select
                value={containerType}
                onChange={(e) => setContainerType(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                <option value="40ft High Cube (40HC)">40ft High Cube (40HC)</option>
                <option value="40ft Standard (40GP)">40ft Standard (40GP)</option>
                <option value="20ft Standard (20GP)">20ft Standard (20GP)</option>
                <option value="45ft High Cube">45ft High Cube</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Quantity</label>
              <input
                type="number"
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Pickup Date</label>
              <input
                type="date"
                required
                value={pickupDate}
                onChange={(e) => setPickupDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Service / Delivery Date</label>
              <input
                type="date"
                required
                value={serviceDate}
                onChange={(e) => setServiceDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 2: British Auction Configuration */}
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 space-y-4 shadow-xs transition-colors">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center space-x-2">
              <Gavel className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              <h2 className="font-semibold text-slate-900 dark:text-white text-sm">2. British Auction Parameters</h2>
            </div>
            <span className="text-xs text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-500/10 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-500/20 font-semibold">
              Reverse Auction Mode
            </span>
          </div>

          {/* Time Picker Inputs: Bid Start, Bid Close, Forced Close */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Bid Start Date & Time <span className="text-red-500 dark:text-red-400">*</span>
              </label>
              <input
                type="datetime-local"
                required
                value={bidStartTime}
                onChange={(e) => setBidStartTime(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Bid Close Date & Time <span className="text-red-500 dark:text-red-400">*</span>
              </label>
              <input
                type="datetime-local"
                required
                value={bidCloseTime}
                onChange={(e) => setBidCloseTime(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
                Extends automatically if qualified
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Forced Bid Close Date & Time <span className="text-red-500 dark:text-red-400">*</span>
              </label>
              <input
                type="datetime-local"
                required
                value={forcedCloseTime}
                onChange={(e) => setForcedCloseTime(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-red-600 dark:text-red-300 font-semibold focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <span className="text-[10px] text-red-600/90 dark:text-red-400/90 mt-1 block">
                Hard ceiling: Auction NEVER extends past this
              </span>
            </div>
          </div>

          {/* Trigger Window & Extension Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Trigger Window (X Minutes)
              </label>
              <input
                type="number"
                min="1"
                required
                value={triggerWindowMinutes}
                onChange={(e) => setTriggerWindowMinutes(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white font-mono focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
                e.g. 5m before close time
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Extension Duration (Y Minutes)
              </label>
              <input
                type="number"
                min="1"
                required
                value={extensionDurationMinutes}
                onChange={(e) => setExtensionDurationMinutes(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white font-mono focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
                e.g. adds 2m per qualifying trigger
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Extension Trigger Condition
              </label>
              <select
                value={extensionTrigger}
                onChange={(e) => setExtensionTrigger(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="L1_CHANGE">Lowest Bidder (L1) Change</option>
                <option value="RANK_CHANGE">Any Supplier Rank Change</option>
                <option value="BID_RECEIVED">Any Bid Received in Window</option>
              </select>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
                Condition to trigger extension
              </span>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end space-x-3">
          <Link
            href="/rfqs"
            className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 dark:border-slate-700 text-xs font-medium transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all disabled:opacity-50"
          >
            {loading ? 'Creating RFQ & Auction...' : 'Publish RFQ & Open Auction'}
          </button>
        </div>
      </form>
    </div>
  );
}
