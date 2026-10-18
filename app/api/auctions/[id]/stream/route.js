import { subscribeToAuction } from '@/lib/auction/eventBus';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request, { params }) {
  const { id: auctionId } = await params;
  const encoder = new TextEncoder();

  let unsubscribe = null;
  let heartbeatTimer = null;

  const stream = new ReadableStream({
    start(controller) {
      // 1. Send initial connected greeting
      controller.enqueue(
        encoder.encode(`event: connected\ndata: ${JSON.stringify({ auctionId, time: new Date() })}\n\n`)
      );

      // 2. Subscribe to auction events from eventBus
      unsubscribe = subscribeToAuction(auctionId, (eventData) => {
        try {
          const payload = `event: update\ndata: ${JSON.stringify(eventData)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch (err) {
          console.error('SSE enqueue error:', err);
        }
      });

      // 3. Keepalive heartbeat every 15 seconds
      heartbeatTimer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat ${Date.now()}\n\n`));
        } catch {
          clearInterval(heartbeatTimer);
        }
      }, 15000);
    },
    cancel() {
      if (unsubscribe) unsubscribe();
      if (heartbeatTimer) clearInterval(heartbeatTimer);
    },
  });

  request.signal.addEventListener('abort', () => {
    if (unsubscribe) unsubscribe();
    if (heartbeatTimer) clearInterval(heartbeatTimer);
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
