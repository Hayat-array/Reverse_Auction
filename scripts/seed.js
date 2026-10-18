// CLI seed script run via `npm run seed`
import { runSeed } from '../lib/seedData.js';
import mongoose from 'mongoose';

async function main() {
  try {
    const res = await runSeed();
    console.log(res.message);
    console.log('Live Demo Auction ID:', res.demoAuctionId);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Seed script failed:', err);
    process.exit(1);
  }
}

main();
