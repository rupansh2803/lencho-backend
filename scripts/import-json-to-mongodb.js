const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const {
  User,
  Category,
  Product,
  Order,
  Cart,
  Wishlist,
  Settings,
  Inquiry,
  LoginEvent,
  MarketingSubscriber,
  MarketingCampaign,
  MarketingEmailLog,
} = require('../models');

const DATA_DIR = path.join(__dirname, '..', 'data');
const dryRun = process.argv.includes('--dry-run');

function cleanEnvValue(value) {
  return String(value || '').trim().replace(/^['"]|['"]$/g, '');
}

function getMongoUri() {
  const uri = cleanEnvValue(process.env.MONGODB_URI);
  if (!uri) throw new Error('MONGODB_URI is required. Put it in your local .env or Render environment.');
  if (!uri.startsWith('mongodb+srv://')) throw new Error('Only MongoDB Atlas SRV URIs are allowed.');
  if (/localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(uri)) throw new Error('Local MongoDB is not allowed for this import.');
  return uri;
}

function readJson(name, fallback = []) {
  const file = path.join(DATA_DIR, name);
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function withoutRuntimeIds(input = {}) {
  const { id, _id, __v, ...rest } = input;
  return rest;
}

function legacyIdOf(input = {}) {
  return String(input.id || input._id || '').trim();
}

async function createMissing(label, Model, query, payload, counters) {
  const exists = await Model.findOne(query).select('_id').lean();
  if (exists) {
    counters.skipped += 1;
    return null;
  }
  counters.created += 1;
  if (dryRun) return null;
  return Model.create(payload);
}

async function importProducts(counters) {
  const rows = readJson('products.json');
  if (!Array.isArray(rows)) return;

  for (const row of rows) {
    if (!row?.name || !row?.category) {
      counters.products.skipped += 1;
      continue;
    }

    const legacyId = legacyIdOf(row);
    const payload = {
      ...withoutRuntimeIds(row),
      legacyId,
      name: String(row.name).trim(),
      category: String(row.category).trim().toLowerCase(),
      price: Number(row.price) || 0,
      mrp: Number(row.mrp) || Number(row.price) || 0,
      stock: Number(row.stock) || 0,
      images: Array.isArray(row.images) ? row.images : (row.image ? [row.image] : []),
      status: row.status === 'draft' ? 'draft' : 'published',
      storeType: row.storeType === 'woollen' ? 'woollen' : 'main',
    };

    const query = legacyId
      ? { $or: [{ legacyId }, ...(row.sku ? [{ sku: row.sku }] : [])] }
      : { name: payload.name, category: payload.category, storeType: payload.storeType };

    await createMissing('products', Product, query, payload, counters.products);
  }
}

async function importUsers(counters) {
  const rows = readJson('users.json');
  if (!Array.isArray(rows)) return;

  for (const row of rows) {
    if (!row?.email) {
      counters.users.skipped += 1;
      continue;
    }

    await createMissing('users', User, { email: String(row.email).toLowerCase() }, {
      ...withoutRuntimeIds(row),
      legacyId: legacyIdOf(row),
      name: row.name || 'Customer',
      email: String(row.email).toLowerCase(),
      role: row.role === 'admin' ? 'admin' : 'user',
      isVerified: row.isVerified !== false,
    }, counters.users);
  }
}

async function importCategories(counters) {
  const rows = readJson('categories.json');
  if (!Array.isArray(rows)) return;

  for (const row of rows) {
    if (!row?.name && !row?.slug) {
      counters.categories.skipped += 1;
      continue;
    }

    const name = String(row.name || row.slug).trim();
    const slug = String(row.slug || name).trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
    await createMissing('categories', Category, { slug }, {
      ...withoutRuntimeIds(row),
      legacyId: legacyIdOf(row),
      name,
      slug,
      storeType: row.storeType === 'woollen' ? 'woollen' : 'main',
    }, counters.categories);
  }
}

async function importSettings(counters) {
  const raw = readJson('settings.json', {});
  const rows = Array.isArray(raw)
    ? raw.filter(item => item?.key)
    : Object.entries(raw || {}).map(([key, value]) => ({ key, value }));

  for (const row of rows) {
    if (!row?.key) continue;
    await createMissing('settings', Settings, { key: row.key }, {
      key: row.key,
      value: row.value,
      label: row.label || row.key,
    }, counters.settings);
  }
}

async function importOrders(counters) {
  const rows = readJson('orders.json');
  if (!Array.isArray(rows)) return;

  for (const row of rows) {
    if (!row?.id) {
      counters.orders.skipped += 1;
      continue;
    }
    await createMissing('orders', Order, { id: row.id }, {
      ...withoutRuntimeIds(row),
      id: row.id,
      userName: row.userName || 'Customer',
      address: row.address || 'Address not available',
      paymentMethod: row.paymentMethod || 'cod',
    }, counters.orders);
  }
}

async function importSimpleCollections(counters) {
  const carts = readJson('carts.json');
  if (Array.isArray(carts)) {
    for (const row of carts) {
      if (!row?.userId) continue;
      await createMissing('carts', Cart, { userId: row.userId }, withoutRuntimeIds(row), counters.carts);
    }
  }

  const wishlists = readJson('wishlists.json');
  if (Array.isArray(wishlists)) {
    for (const row of wishlists) {
      if (!row?.userId) continue;
      await createMissing('wishlists', Wishlist, { userId: row.userId }, withoutRuntimeIds(row), counters.wishlists);
    }
  }

  const inquiries = readJson('inquiries.json');
  if (Array.isArray(inquiries)) {
    for (const row of inquiries) {
      if (!row?.email || !row?.message) continue;
      await createMissing('inquiries', Inquiry, {
        email: row.email,
        message: row.message,
        createdAt: row.createdAt ? new Date(row.createdAt) : undefined,
      }, withoutRuntimeIds(row), counters.inquiries);
    }
  }

  const loginLogs = readJson('login_logs.json');
  if (Array.isArray(loginLogs)) {
    for (const row of loginLogs) {
      if (!row?.email && !row?.createdAt) continue;
      await createMissing('loginLogs', LoginEvent, {
        email: row.email || '',
        createdAt: row.createdAt ? new Date(row.createdAt) : undefined,
      }, withoutRuntimeIds(row), counters.loginLogs);
    }
  }
}

async function importMarketing(counters) {
  const subscribers = readJson('marketing_subscribers.json');
  if (Array.isArray(subscribers)) {
    for (const row of subscribers) {
      if (!row?.email) continue;
      await createMissing('subscribers', MarketingSubscriber, { email: String(row.email).toLowerCase() }, {
        ...withoutRuntimeIds(row),
        email: String(row.email).toLowerCase(),
      }, counters.subscribers);
    }
  }

  const discounts = readJson('discounts.json');
  if (Array.isArray(discounts)) {
    for (const row of discounts) {
      if (!row?.email) continue;
      await createMissing('discounts', MarketingSubscriber, { email: String(row.email).toLowerCase() }, {
        email: String(row.email).toLowerCase(),
        source: 'discount_popup',
        consent: true,
        status: 'subscribed',
        offerCode: row.code || 'WELCOME10',
        consentAt: row.createdAt ? new Date(row.createdAt) : new Date(),
      }, counters.discounts);
    }
  }

  const campaigns = readJson('marketing_campaigns.json');
  if (Array.isArray(campaigns)) {
    for (const row of campaigns) {
      if (!row?.subject || !row?.body) continue;
      await createMissing('campaigns', MarketingCampaign, {
        subject: row.subject,
        createdAt: row.createdAt ? new Date(row.createdAt) : undefined,
      }, withoutRuntimeIds(row), counters.campaigns);
    }
  }

  const logs = readJson('marketing_email_logs.json');
  if (Array.isArray(logs)) {
    for (const row of logs) {
      if (!row?.campaignId || !row?.email) continue;
      await createMissing('campaignLogs', MarketingEmailLog, {
        campaignId: row.campaignId,
        email: row.email,
        sentAt: row.sentAt ? new Date(row.sentAt) : undefined,
      }, withoutRuntimeIds(row), counters.campaignLogs);
    }
  }
}

function makeCounters() {
  const names = [
    'products', 'users', 'categories', 'settings', 'orders', 'carts', 'wishlists',
    'inquiries', 'loginLogs', 'subscribers', 'discounts', 'campaigns', 'campaignLogs'
  ];
  return Object.fromEntries(names.map(name => [name, { created: 0, skipped: 0 }]));
}

async function main() {
  const uri = getMongoUri();
  await mongoose.connect(uri);

  const counters = makeCounters();
  await importUsers(counters);
  await importCategories(counters);
  await importSettings(counters);
  await importProducts(counters);
  await importOrders(counters);
  await importSimpleCollections(counters);
  await importMarketing(counters);

  console.table(counters);
  console.log(dryRun ? 'Dry run complete. No MongoDB records were created.' : 'Import complete. Existing MongoDB records were preserved.');
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error.message);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
