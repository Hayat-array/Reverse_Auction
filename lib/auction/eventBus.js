import { EventEmitter } from 'events';

// Maintain a single EventEmitter instance across hot module reloads in development
if (!global.__auctionEventBus) {
  global.__auctionEventBus = new EventEmitter();
  // Allow multiple concurrent connected browser tabs
  global.__auctionEventBus.setMaxListeners(100);
}

const eventBus = global.__auctionEventBus;

/**
 * Broadcast an event for a specific auction to all connected SSE clients.
 *
 * @param {string} auctionId
 * @param {Object} data
 */
export function broadcastAuctionUpdate(auctionId, data) {
  const eventName = `auction:${String(auctionId)}`;
  eventBus.emit(eventName, data);
  // Also emit a global update event for dashboard/listings
  eventBus.emit('auction:global', { auctionId: String(auctionId), ...data });
}

/**
 * Subscribe to realtime updates for a specific auction.
 *
 * @param {string} auctionId
 * @param {Function} listener
 * @returns {Function} unsubscribe function
 */
export function subscribeToAuction(auctionId, listener) {
  const eventName = `auction:${String(auctionId)}`;
  eventBus.on(eventName, listener);

  return () => {
    eventBus.off(eventName, listener);
  };
}

/**
 * Subscribe to global auction activity (e.g. for dashboard live updates).
 *
 * @param {Function} listener
 * @returns {Function} unsubscribe function
 */
export function subscribeToGlobalAuctions(listener) {
  eventBus.on('auction:global', listener);

  return () => {
    eventBus.off('auction:global', listener);
  };
}

export default eventBus;
