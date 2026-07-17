#!/usr/bin/env node

const mongoose = require('mongoose');

const baseUrl = (process.env.QA_BASE_URL || 'http://127.0.0.1:30054').replace(/\/+$/, '');
const adminToken = process.env.QA_ADMIN_TOKEN || '';
const adminCookie = process.env.QA_ADMIN_COOKIE || '';
const publishProduct = String(process.env.QA_PRODUCT_STATUS || '').toLowerCase() === 'published';

const qaCollection = {
  name: 'LENCHO QA Crochet Test Collection',
  slug: 'lencho-qa-crochet-test-collection',
  image: '/images/woollen_hero.jpg',
  bannerImage: '/images/woollen_hero.jpg',
  icon: 'flower',
  theme: 'pastel-pink',
  storeType: 'woollen',
  description: 'QA collection for verifying Lencho admin woollen flow.'
};

const qaProduct = {
  name: 'LENCHO QA Baby Pink Crochet Flower Keychain',
  sku: 'LENCHO-QA-KC-001',
  category: qaCollection.slug,
  storeType: 'woollen',
  status: publishProduct ? 'published' : 'draft',
  price: 199,
  mrp: 249,
  discount: 20,
  stock: 10,
  gstRate: 3,
  hsn: '6117',
  description: 'QA product for testing woollen product create, stock, images, collection relation and admin display.',
  existingImages: JSON.stringify(['/images/woollen_hero.jpg']),
  imageOrder: JSON.stringify(['/images/woollen_hero.jpg']),
  removedImages: JSON.stringify([]),
  variants: JSON.stringify([]),
  hasVariants: 'false',
  featured: 'false',
  popular: 'false',
  trending: 'false',
  newArrival: 'false',
  sale: 'false'
};

const results = [];

function record(name, ok, detail) {
  const status = ok ? 'PASS' : 'FAIL';
  results.push({ name, status, detail });
  console.log(`${status} ${name} - ${detail}`);
}

function authHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (adminToken) headers.Authorization = adminToken.startsWith('Bearer ') ? adminToken : `Bearer ${adminToken}`;
  if (adminCookie) headers.Cookie = adminCookie;
  return headers;
}

async function request(method, path, body, needsAuth = false) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: needsAuth ? authHeaders() : { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  return { res, data };
}

async function createOrVerifyCollection() {
  if (!adminToken && !adminCookie) {
    record('Admin credentials', false, 'Set QA_ADMIN_TOKEN or QA_ADMIN_COOKIE before creating QA records.');
    return null;
  }

  const create = await request('POST', '/api/admin/categories', qaCollection, true);
  if (!create.res.ok && !/already exists/i.test(create.data?.error || '')) {
    record('Create QA collection API', false, `${create.res.status} ${create.data?.error || create.data?.message || 'unknown error'}`);
    return null;
  }

  const list = await request('GET', '/api/categories?storeType=woollen');
  const categories = Array.isArray(list.data) ? list.data : [];
  const found = categories.find(category => category.slug === qaCollection.slug);
  record('Create/verify QA collection API', Boolean(found), found ? `slug=${found.slug}, storeType=${found.storeType}` : 'QA collection not found in woollen list');
  return found || create.data?.category || null;
}

async function createOrVerifyProduct() {
  const create = await request('POST', '/api/products', qaProduct, true);
  if (!create.res.ok && !/duplicate|already/i.test(create.data?.error || '')) {
    record('Create QA product API', false, `${create.res.status} ${create.data?.error || create.data?.message || 'unknown error'}`);
    return null;
  }

  const adminList = await request('GET', `/api/products?storeType=woollen&category=${encodeURIComponent(qaCollection.slug)}&status=${qaProduct.status}`, null, true);
  const products = Array.isArray(adminList.data) ? adminList.data : [];
  const found = products.find(product => product.sku === qaProduct.sku || product.name === qaProduct.name);
  record('Verify QA product in admin API', Boolean(found), found ? `sku=${found.sku}, stock=${found.stock}, status=${found.status}` : 'QA product not found in admin product list');

  if (publishProduct) {
    const publicList = await request('GET', `/api/products?storeType=woollen&category=${encodeURIComponent(qaCollection.slug)}`);
    const publicProducts = Array.isArray(publicList.data) ? publicList.data : [];
    const publicFound = publicProducts.find(product => product.sku === qaProduct.sku || product.name === qaProduct.name);
    record('Verify QA product on customer API', Boolean(publicFound), publicFound ? `customer-visible status=${publicFound.status}` : 'Published QA product not visible publicly');
  } else {
    record('Verify QA product on customer API', true, 'Skipped by safety: QA_PRODUCT_STATUS is draft. Set QA_PRODUCT_STATUS=published on staging to verify customer visibility.');
  }

  return found || create.data?.product || null;
}

async function verifyMongoRecords() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DATABASE_URL || '';
  if (!uri) {
    record('MongoDB record verification', false, 'Set MONGODB_URI to verify direct database records.');
    return;
  }

  const { Category, Product } = require('../models');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  const [category, product] = await Promise.all([
    Category.findOne({ slug: qaCollection.slug, storeType: 'woollen' }).lean(),
    Product.findOne({ sku: qaProduct.sku, storeType: 'woollen' }).lean()
  ]);
  record('MongoDB category record', Boolean(category), category ? `id=${category._id}` : 'QA category missing');
  record('MongoDB product record', Boolean(product), product ? `id=${product._id}, stock=${product.stock}` : 'QA product missing');
  await mongoose.disconnect();
}

async function main() {
  console.log(`Lencho QA admin flow: ${baseUrl}`);

  try {
    const health = await request('GET', '/health');
    record('Backend health', health.res.ok, `${health.res.status}`);
  } catch (error) {
    record('Backend health', false, error.message);
  }

  const category = await createOrVerifyCollection();
  if (category) await createOrVerifyProduct();
  await verifyMongoRecords();

  const failed = results.filter(result => result.status === 'FAIL');
  console.log('\nSummary');
  console.table(results);
  process.exit(failed.length ? 1 : 0);
}

main().catch(error => {
  record('QA script runtime', false, error.stack || error.message);
  process.exit(1);
});
