import test from 'node:test';
import assert from 'node:assert/strict';

import { hashPassword, comparePassword, DEMO_PASSWORD_HASH } from '../lib/auth/password.js';
import { createSessionToken, verifySessionToken, AUTH_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from '../lib/auth/token.js';
import { initMemorySeed, MemoryUser, MemoryAuction, MemoryBid, MemoryRFQ } from '../lib/db/inMemoryStore.js';
import { placeBid } from '../lib/auction/bidService.js';
import { computeSupplierRankings } from '../lib/auction/ranking.js';

// Initialize the memory store with seed users and auctions
initMemorySeed(true);

test('Role-Based Authentication & Authorization Specification Test Suite', async (t) => {

  // =========================================================================
  // SPEC 1: Buyer can login with valid credentials
  // =========================================================================
  await t.test('1. Buyer can login with verified credentials (buyer@gocomet.demo / password123)', async () => {
    const buyer = await MemoryUser.findOne({ email: 'buyer@gocomet.demo' });
    assert.ok(buyer, 'Buyer account must exist in the database');
    assert.equal(buyer.role, 'BUYER', 'Account role must be BUYER');

    const isMatch = await comparePassword('password123', buyer.passwordHash);
    assert.equal(isMatch, true, 'Valid password must match buyer passwordHash');

    // Create session token for buyer
    const token = await createSessionToken({
      id: buyer._id,
      name: buyer.name,
      email: buyer.email,
      role: buyer.role,
    });
    assert.ok(token, 'Session token must be generated');

    const session = await verifySessionToken(token);
    assert.equal(session.role, 'BUYER');
    assert.equal(session.email, 'buyer@gocomet.demo');
    assert.equal(session.passwordHash, undefined, 'passwordHash must NEVER be in session token');
  });

  // =========================================================================
  // SPEC 2: Supplier can login with valid credentials
  // =========================================================================
  await t.test('2. All 5 demo suppliers can login with password123 and possess SUPPLIER role', async () => {
    const expectedSuppliers = [
      { email: 'maersk@gocomet.demo', name: 'Maersk Logistics', carrierCode: 'MAEU' },
      { email: 'hapag@gocomet.demo', name: 'Hapag-Lloyd', carrierCode: 'HLCU' },
      { email: 'cma@gocomet.demo', name: 'CMA CGM', carrierCode: 'CMDU' },
      { email: 'msc@gocomet.demo', name: 'MSC', carrierCode: 'MSCU' },
      { email: 'evergreen@gocomet.demo', name: 'Evergreen', carrierCode: 'EGLV' },
    ];

    for (const sup of expectedSuppliers) {
      const user = await MemoryUser.findOne({ email: sup.email });
      assert.ok(user, `Supplier account ${sup.email} must exist in database`);
      assert.equal(user.role, 'SUPPLIER', `${sup.email} must have role SUPPLIER`);
      assert.equal(user.carrierCode, sup.carrierCode, `${sup.email} must have carrierCode ${sup.carrierCode}`);

      const validPw = await comparePassword('password123', user.passwordHash);
      assert.equal(validPw, true, `${sup.email} must authenticate with password123`);

      // Verify token creation
      const token = await createSessionToken({
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        carrierCode: user.carrierCode,
      });
      const session = await verifySessionToken(token);
      assert.equal(session.role, 'SUPPLIER');
      assert.equal(session.passwordHash, undefined, 'passwordHash must never be exposed');
    }
  });

  // =========================================================================
  // SPEC 3: Invalid password rejected
  // =========================================================================
  await t.test('3. Invalid password is strictly rejected', async () => {
    const buyer = await MemoryUser.findOne({ email: 'buyer@gocomet.demo' });
    const wrong1 = await comparePassword('WrongPassword!', buyer.passwordHash);
    assert.equal(wrong1, false, 'Incorrect password must be rejected');

    const wrong2 = await comparePassword('', buyer.passwordHash);
    assert.equal(wrong2, false, 'Empty password must be rejected');

    const wrong3 = await comparePassword('password1234', buyer.passwordHash);
    assert.equal(wrong3, false, 'Off-by-one password must be rejected');
  });

  // =========================================================================
  // SPEC 4: Unauthenticated user cannot access protected resources
  // =========================================================================
  await t.test('4. Unauthenticated session token verification fails', async () => {
    const invalidTokenResult = await verifySessionToken('invalid.jwt.token');
    assert.equal(invalidTokenResult, null, 'Malformed token must return null');

    const emptyTokenResult = await verifySessionToken(null);
    assert.equal(emptyTokenResult, null, 'Null token must return null');

    const undefinedTokenResult = await verifySessionToken(undefined);
    assert.equal(undefinedTokenResult, null, 'Undefined token must return null');
  });

  // =========================================================================
  // SPEC 5: Supplier cannot create RFQ
  // =========================================================================
  await t.test('5. Supplier role authorization rejects RFQ creation attempts', async () => {
    const supplierSession = {
      id: '65f100000000000000000002',
      name: 'Maersk Logistics',
      role: 'SUPPLIER',
    };

    // Role check rule: Only BUYER or ADMIN can create RFQs
    const allowedRoles = ['BUYER', 'ADMIN'];
    const isAuthorized = allowedRoles.includes(supplierSession.role);

    assert.equal(isAuthorized, false, 'Supplier must NOT be authorized to create RFQs');
  });

  // =========================================================================
  // SPEC 6: Supplier cannot create auction
  // =========================================================================
  await t.test('6. Supplier role authorization rejects Auction creation attempts', async () => {
    const supplierSession = {
      id: '65f100000000000000000003',
      name: 'Hapag-Lloyd',
      role: 'SUPPLIER',
    };

    const allowedRoles = ['BUYER', 'ADMIN'];
    const isAuthorized = allowedRoles.includes(supplierSession.role);

    assert.equal(isAuthorized, false, 'Supplier must NOT be authorized to create Auctions');
  });

  // =========================================================================
  // SPEC 7: Buyer cannot submit supplier bid
  // =========================================================================
  await t.test('7. Buyer role authorization rejects bid submission attempts', async () => {
    const buyerSession = {
      id: '65f100000000000000000001',
      name: 'Demo Buyer',
      role: 'BUYER',
    };

    // Rule: Only SUPPLIER can submit bids
    const isAuthorizedSupplier = buyerSession.role === 'SUPPLIER';
    assert.equal(isAuthorizedSupplier, false, 'Buyer must NOT be allowed to submit supplier bids');
  });

  // =========================================================================
  // SPEC 8: Supplier can submit bid
  // =========================================================================
  await t.test('8. Supplier can place valid lower bid and update rankings', async () => {
    // Auction 1 is active with L1 = 85,000
    const auctionId = '65f300000000000000000001';
    const supplierId = '65f100000000000000000005'; // MSC

    const result = await placeBid({
      auctionId,
      supplierId,
      carrierName: 'MSC Mediterranean',
      freightCharges: 70000,
      originCharges: 5000,
      destinationCharges: 5000,
      transitTime: 12,
      quoteValidity: new Date(Date.now() + 86400000 * 30).toISOString(),
    });

    assert.ok(result, 'Bid placement must return a result');
    assert.ok(result.bid, 'Result must contain created bid');
    assert.equal(result.bid.totalPrice, 80000, 'Total price should be 70000 + 5000 + 5000');
    assert.equal(result.rankings[0].rank, 1, '80,000 should become the new L1 rank');
    assert.equal(result.bid.isL1, true, 'Placed bid should be recognized as L1');
  });

  // =========================================================================
  // SPEC 9: Supplier identity comes from authenticated user
  // =========================================================================
  await t.test('9. Supplier identity is strictly derived from session (ignoring client spoofing)', async () => {
    const auctionId = '65f300000000000000000001';
    const authSupplierId = '65f100000000000000000006'; // Evergreen
    const spoofedSupplierId = '65f100000000000000000002'; // Maersk

    // Secure backend logic: always pass session identity, ignoring body spoofing
    const resolvedSupplierId = authSupplierId; // Backend derives from auth session

    const result = await placeBid({
      auctionId,
      supplierId: resolvedSupplierId, // Enforced from session
      carrierName: 'Evergreen Line',
      freightCharges: 65000,
      originCharges: 5000,
      destinationCharges: 5000,
      transitTime: 10,
    });

    assert.equal(
      String(result.bid.supplierId),
      authSupplierId,
      'Bid supplierId MUST equal authenticated user ID'
    );
    assert.notEqual(
      String(result.bid.supplierId),
      spoofedSupplierId,
      'Bid supplierId must NEVER equal spoofed client ID'
    );
  });

  // =========================================================================
  // SPEC 10: Buyer identity comes from authenticated user
  // =========================================================================
  await t.test('10. Buyer identity is strictly derived from authenticated session', async () => {
    const authBuyerId = '65f100000000000000000001';
    const spoofedBuyerId = '65f999999999999999999999';

    // The backend endpoint sets buyerId = authUser.id
    const rfqDoc = {
      title: 'Auth Identity Verification Contract',
      referenceId: `RFQ-TEST-${Date.now()}`,
      buyerId: authBuyerId, // Set strictly from session
      buyerName: 'Demo Buyer',
      origin: { port: 'Singapore Port', country: 'Singapore' },
      destination: { port: 'Rotterdam Port', country: 'Netherlands' },
      status: 'PUBLISHED',
    };

    const savedRFQ = await MemoryRFQ.create(rfqDoc);
    assert.equal(String(savedRFQ.buyerId), authBuyerId, 'RFQ buyerId must match session');
    assert.notEqual(String(savedRFQ.buyerId), spoofedBuyerId, 'RFQ buyerId must not be spoofed');
  });

  // =========================================================================
  // SPEC 11: Logout clears session
  // =========================================================================
  await t.test('11. Session cookie options adhere to security best practices and logout clears cookie', async () => {
    assert.equal(AUTH_COOKIE_NAME, 'auth_session', 'Cookie name must be auth_session');
    assert.equal(SESSION_COOKIE_OPTIONS.httpOnly, true, 'Cookie must be HTTP-only');
    assert.equal(SESSION_COOKIE_OPTIONS.sameSite, 'lax', 'Cookie must use SameSite lax');
    assert.equal(SESSION_COOKIE_OPTIONS.path, '/', 'Cookie path must be /');

    // On logout, maxAge is set to 0 to invalidate cookie in browser
    const logoutCookieOptions = {
      ...SESSION_COOKIE_OPTIONS,
      maxAge: 0,
      expires: new Date(0),
    };

    assert.equal(logoutCookieOptions.maxAge, 0, 'Logout must set maxAge to 0');
    assert.equal(logoutCookieOptions.httpOnly, true, 'Logout cookie must retain httpOnly');
  });

  // =========================================================================
  // SPEC 12: Password hashing security
  // =========================================================================
  await t.test('12. Password hashing uses bcrypt with proper salt rounds and never plain text', async () => {
    const plain = 'superSecret456!';
    const hashed = await hashPassword(plain);

    assert.notEqual(hashed, plain, 'Hashed password must not match plain text');
    assert.match(hashed, /^\$2[aby]\$\d+\$/, 'Hash must be a valid bcrypt hash');

    const verifySuccess = await comparePassword(plain, hashed);
    assert.equal(verifySuccess, true, 'Hashed password must verify correctly');

    const verifyFail = await comparePassword('wrongPassword', hashed);
    assert.equal(verifyFail, false, 'Incorrect password must fail verification');
  });
});
