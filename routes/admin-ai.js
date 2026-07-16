const express = require('express');
const axios = require('axios');

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 18;
const aiRateBuckets = new Map();

const suggestedPrompts = [
  'Aaj ka business summary batao',
  'Last 7 days orders aur sales summary',
  'Haryana se kitne orders aaye?',
  'Low stock products dikhao',
  'Woollen collections me kitne products hain?',
  'Best selling products kaun se hain?',
  'Inventory value kitni hai?',
  'Website health check karo'
];

const stateAliases = [
  ['Andaman and Nicobar Islands', ['andaman', 'nicobar']],
  ['Andhra Pradesh', ['andhra pradesh', 'ap']],
  ['Arunachal Pradesh', ['arunachal pradesh']],
  ['Assam', ['assam']],
  ['Bihar', ['bihar']],
  ['Chandigarh', ['chandigarh']],
  ['Chhattisgarh', ['chhattisgarh', 'chattisgarh']],
  ['Delhi', ['delhi', 'new delhi', 'ncr']],
  ['Goa', ['goa']],
  ['Gujarat', ['gujarat']],
  ['Haryana', ['haryana', 'hr', 'ambala', 'barara', 'sarakhpur', 'mullana']],
  ['Himachal Pradesh', ['himachal', 'hp']],
  ['Jammu and Kashmir', ['jammu', 'kashmir']],
  ['Jharkhand', ['jharkhand']],
  ['Karnataka', ['karnataka', 'bangalore', 'bengaluru']],
  ['Kerala', ['kerala']],
  ['Ladakh', ['ladakh']],
  ['Madhya Pradesh', ['madhya pradesh', 'mp']],
  ['Maharashtra', ['maharashtra', 'mumbai', 'pune']],
  ['Manipur', ['manipur']],
  ['Meghalaya', ['meghalaya']],
  ['Mizoram', ['mizoram']],
  ['Nagaland', ['nagaland']],
  ['Odisha', ['odisha', 'orissa']],
  ['Punjab', ['punjab']],
  ['Rajasthan', ['rajasthan']],
  ['Sikkim', ['sikkim']],
  ['Tamil Nadu', ['tamil nadu', 'chennai']],
  ['Telangana', ['telangana', 'hyderabad']],
  ['Tripura', ['tripura']],
  ['Uttar Pradesh', ['uttar pradesh', 'up', 'noida', 'lucknow']],
  ['Uttarakhand', ['uttarakhand']],
  ['West Bengal', ['west bengal', 'kolkata']]
];

function safeText(value, max = 500) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function redactSensitiveText(value, max = 500) {
  return safeText(value, max)
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
    .replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, '[phone]');
}

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function formatInt(value) {
  return Math.round(toNumber(value)).toLocaleString('en-IN');
}

function formatMoney(value) {
  return `Rs. ${Math.round(toNumber(value)).toLocaleString('en-IN')}`;
}

function getIstYmd(date = new Date()) {
  const shifted = new Date(date.getTime() + IST_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate()
  };
}

function makeIstDate(year, month, day, hour = 0, minute = 0, second = 0, ms = 0) {
  return new Date(Date.UTC(year, month - 1, day, hour, minute, second, ms) - IST_OFFSET_MS);
}

function addCalendarDays(parts, days) {
  const temp = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return { year: temp.getUTCFullYear(), month: temp.getUTCMonth() + 1, day: temp.getUTCDate() };
}

function addCalendarMonths(parts, months) {
  const temp = new Date(Date.UTC(parts.year, parts.month - 1 + months, 1));
  return { year: temp.getUTCFullYear(), month: temp.getUTCMonth() + 1, day: 1 };
}

function parseYmd(value) {
  const text = String(value || '').trim();
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

function ymdLabel(parts) {
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

function inferDateRange(message) {
  const text = safeText(message, 1000).toLowerCase();
  if (/\b(aaj|today)\b/.test(text)) return 'today';
  if (/\b(kal|yesterday)\b/.test(text)) return 'yesterday';
  if (/7\s*(din|days)|week|hafta/.test(text)) return 'last7days';
  if (/30\s*(din|days)|month|mahina/.test(text)) return 'last30days';
  if (/this\s*month|current\s*month/.test(text)) return 'thisMonth';
  if (/last\s*month|pichla\s*mahina/.test(text)) return 'lastMonth';
  if (/all\s*time|total|ab tak|overall/.test(text)) return 'all';
  return 'all';
}

function getDateRange({ range, startDate, endDate, message } = {}) {
  const today = getIstYmd(new Date());
  const selected = range || inferDateRange(message);
  const customStart = parseYmd(startDate);
  const customEnd = parseYmd(endDate);

  if (customStart || customEnd) {
    const startParts = customStart || today;
    const endParts = customEnd ? addCalendarDays(customEnd, 1) : addCalendarDays(today, 1);
    return {
      key: 'custom',
      label: `${ymdLabel(startParts)} to ${ymdLabel(addCalendarDays(endParts, -1))}`,
      start: makeIstDate(startParts.year, startParts.month, startParts.day),
      end: makeIstDate(endParts.year, endParts.month, endParts.day)
    };
  }

  if (selected === 'today') {
    const endParts = addCalendarDays(today, 1);
    return {
      key: selected,
      label: `Today (${ymdLabel(today)})`,
      start: makeIstDate(today.year, today.month, today.day),
      end: makeIstDate(endParts.year, endParts.month, endParts.day)
    };
  }

  if (selected === 'yesterday') {
    const startParts = addCalendarDays(today, -1);
    return {
      key: selected,
      label: `Yesterday (${ymdLabel(startParts)})`,
      start: makeIstDate(startParts.year, startParts.month, startParts.day),
      end: makeIstDate(today.year, today.month, today.day)
    };
  }

  if (selected === 'last7days') {
    const startParts = addCalendarDays(today, -6);
    const endParts = addCalendarDays(today, 1);
    return {
      key: selected,
      label: `Last 7 days (${ymdLabel(startParts)} to ${ymdLabel(today)})`,
      start: makeIstDate(startParts.year, startParts.month, startParts.day),
      end: makeIstDate(endParts.year, endParts.month, endParts.day)
    };
  }

  if (selected === 'last30days') {
    const startParts = addCalendarDays(today, -29);
    const endParts = addCalendarDays(today, 1);
    return {
      key: selected,
      label: `Last 30 days (${ymdLabel(startParts)} to ${ymdLabel(today)})`,
      start: makeIstDate(startParts.year, startParts.month, startParts.day),
      end: makeIstDate(endParts.year, endParts.month, endParts.day)
    };
  }

  if (selected === 'thisMonth') {
    const startParts = { year: today.year, month: today.month, day: 1 };
    const endParts = addCalendarMonths(startParts, 1);
    return {
      key: selected,
      label: `This month (${ymdLabel(startParts)} to ${ymdLabel(today)})`,
      start: makeIstDate(startParts.year, startParts.month, startParts.day),
      end: makeIstDate(endParts.year, endParts.month, endParts.day)
    };
  }

  if (selected === 'lastMonth') {
    const thisMonth = { year: today.year, month: today.month, day: 1 };
    const startParts = addCalendarMonths(thisMonth, -1);
    return {
      key: selected,
      label: `Last month (${ymdLabel(startParts)} to ${ymdLabel(addCalendarDays(thisMonth, -1))})`,
      start: makeIstDate(startParts.year, startParts.month, startParts.day),
      end: makeIstDate(thisMonth.year, thisMonth.month, thisMonth.day)
    };
  }

  return { key: 'all', label: 'All time', start: null, end: null };
}

function orderMatchForRange(dateRange) {
  const match = {};
  if (dateRange?.start || dateRange?.end) {
    match.createdAt = {};
    if (dateRange.start) match.createdAt.$gte = dateRange.start;
    if (dateRange.end) match.createdAt.$lt = dateRange.end;
  }
  return match;
}

function normalizeState(address) {
  const text = safeText(address, 2000).toLowerCase();
  if (!text) return 'Unknown';
  for (const [state, aliases] of stateAliases) {
    if (aliases.some(alias => new RegExp(`(^|[^a-z0-9])${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`, 'i').test(text))) {
      return state;
    }
  }
  return 'Unknown';
}

function inferState(message) {
  const text = safeText(message, 1000).toLowerCase();
  for (const [state, aliases] of stateAliases) {
    if (aliases.some(alias => new RegExp(`(^|[^a-z0-9])${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`, 'i').test(text))) {
      return state;
    }
  }
  return '';
}

function inferStoreType(message) {
  const text = safeText(message, 1000).toLowerCase();
  if (/wool|wollen|woollen|crochet|handmade/.test(text)) return 'woollen';
  if (/jewel|jwell|ring|earring|necklace|bracelet/.test(text)) return 'main';
  return 'all';
}

function inferTool(message) {
  const text = safeText(message, 1000).toLowerCase();
  if (/low\s*stock|stock\s*kam|out\s*of\s*stock|khatam/.test(text)) return 'getLowStockProducts';
  if (/best\s*sell|top\s*sell|sabse\s*jyada|most\s*sold/.test(text)) return 'getBestSellingProducts';
  if (/inventory\s*value|stock\s*value|maal\s*kitna|value\s*kitni/.test(text)) return 'getInventoryValue';
  if (/collection|category|categories/.test(text)) return 'getCollectionProductCounts';
  if (/state|haryana|punjab|delhi|rajasthan|uttar|maharashtra|orders?\s*from/.test(text)) return 'getOrdersByState';
  if (/cancel|delivered|pending|placed|processing|shipped|status/.test(text)) return 'getOrdersByStatus';
  if (/health|slow|speed|site|website/.test(text)) return 'getWebsiteHealth';
  if (/sales|revenue|gst|business|summary|dashboard|aaj|today|week|month|total/.test(text)) return 'getDashboardSummary';
  return 'getDashboardSummary';
}

function inferStatus(message) {
  const text = safeText(message, 1000).toLowerCase();
  const statuses = ['placed', 'pending', 'processing', 'packed', 'shipped', 'delivered', 'cancelled', 'canceled', 'returned', 'refunded'];
  const hit = statuses.find(status => text.includes(status));
  if (!hit) return '';
  return hit === 'canceled' ? 'cancelled' : hit;
}

function getLimit(value, fallback = 10, max = 50) {
  const limit = Math.max(1, Math.min(Number(value) || fallback, max));
  return Math.round(limit);
}

async function maybeCount(Model, query = {}) {
  if (!Model) return 0;
  return Model.countDocuments(query);
}

async function getDashboardSummary(models, params) {
  const { User, Product, Order } = models;
  const dateRange = getDateRange(params);
  const match = orderMatchForRange(dateRange);
  const [moneyRows, statusRows, paymentRows, productCount, customerCount, lowStockCount, outOfStockCount] = await Promise.all([
    Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          orders: { $sum: 1 },
          revenue: { $sum: { $ifNull: ['$grandTotal', 0] } },
          subtotal: { $sum: { $ifNull: ['$subtotal', 0] } },
          gst: { $sum: { $ifNull: ['$gstTotal', 0] } },
          shipping: { $sum: { $ifNull: ['$shipping', 0] } },
          discount: { $sum: { $ifNull: ['$discount', 0] } }
        }
      }
    ]),
    Order.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 }, revenue: { $sum: { $ifNull: ['$grandTotal', 0] } } } }, { $sort: { count: -1 } }]),
    Order.aggregate([{ $match: match }, { $group: { _id: '$paymentMethod', count: { $sum: 1 }, revenue: { $sum: { $ifNull: ['$grandTotal', 0] } } } }, { $sort: { count: -1 } }]),
    maybeCount(Product),
    maybeCount(User, { role: { $ne: 'admin' } }),
    maybeCount(Product, { stock: { $lte: 5 } }),
    maybeCount(Product, { stock: { $lte: 0 } })
  ]);

  const moneyRow = moneyRows[0] || {};
  return {
    dateRange,
    cards: [
      { label: 'Orders', value: formatInt(moneyRow.orders), tone: 'blue' },
      { label: 'Revenue', value: formatMoney(moneyRow.revenue), tone: 'green' },
      { label: 'GST', value: formatMoney(moneyRow.gst), tone: 'gold' },
      { label: 'Products', value: formatInt(productCount), tone: 'pink' },
      { label: 'Customers', value: formatInt(customerCount), tone: 'violet' },
      { label: 'Low stock', value: formatInt(lowStockCount), tone: 'amber' },
      { label: 'Out of stock', value: formatInt(outOfStockCount), tone: 'red' }
    ],
    table: {
      title: 'Order status',
      columns: ['Status', 'Orders', 'Revenue'],
      rows: statusRows.map(row => [row._id || 'unknown', formatInt(row.count), formatMoney(row.revenue)])
    },
    secondaryTable: {
      title: 'Payment methods',
      columns: ['Method', 'Orders', 'Revenue'],
      rows: paymentRows.map(row => [row._id || 'unknown', formatInt(row.count), formatMoney(row.revenue)])
    },
    completeness: [
      'Profit exact nahi nikal sakta jab tak cost price, packing cost, actual shipping cost, payment fee aur ad spend product/order data me add nahi hota.'
    ]
  };
}

async function getOrdersByState(models, params) {
  const { Order } = models;
  const dateRange = getDateRange(params);
  const match = orderMatchForRange(dateRange);
  const requestedState = params.state || inferState(params.message);
  const cap = getLimit(params.maxScan, 2000, 5000);
  const orders = await Order.find(match)
    .select('address grandTotal paymentMethod status createdAt')
    .sort({ createdAt: -1 })
    .limit(cap)
    .lean();
  const grouped = new Map();
  orders.forEach(order => {
    const state = normalizeState(order.address);
    if (requestedState && state !== requestedState) return;
    const current = grouped.get(state) || { state, orders: 0, revenue: 0, cod: 0, online: 0 };
    current.orders += 1;
    current.revenue += toNumber(order.grandTotal);
    if (String(order.paymentMethod || '').toLowerCase().includes('cod')) current.cod += 1;
    else current.online += 1;
    grouped.set(state, current);
  });
  const rows = [...grouped.values()].sort((a, b) => b.orders - a.orders);
  return {
    dateRange,
    cards: [
      { label: 'States found', value: formatInt(rows.length), tone: 'blue' },
      { label: 'Orders', value: formatInt(rows.reduce((sum, row) => sum + row.orders, 0)), tone: 'green' },
      { label: 'Revenue', value: formatMoney(rows.reduce((sum, row) => sum + row.revenue, 0)), tone: 'gold' }
    ],
    table: {
      title: requestedState ? `${requestedState} orders` : 'Orders by state',
      columns: ['State', 'Orders', 'Revenue', 'COD', 'Online'],
      rows: rows.map(row => [row.state, formatInt(row.orders), formatMoney(row.revenue), formatInt(row.cod), formatInt(row.online)])
    },
    completeness: orders.length >= cap ? [`Scanned latest ${cap} orders only. Use date filter for older orders.`] : []
  };
}

async function getOrdersByStatus(models, params) {
  const { Order } = models;
  const dateRange = getDateRange(params);
  const match = orderMatchForRange(dateRange);
  const status = params.status || inferStatus(params.message);
  if (status) match.status = new RegExp(`^${status}$`, 'i');
  const rows = await Order.aggregate([
    { $match: match },
    { $group: { _id: '$status', orders: { $sum: 1 }, revenue: { $sum: { $ifNull: ['$grandTotal', 0] } } } },
    { $sort: { orders: -1 } }
  ]);
  return {
    dateRange,
    cards: [
      { label: 'Matching orders', value: formatInt(rows.reduce((sum, row) => sum + row.orders, 0)), tone: 'blue' },
      { label: 'Revenue', value: formatMoney(rows.reduce((sum, row) => sum + row.revenue, 0)), tone: 'green' }
    ],
    table: {
      title: status ? `${status} orders` : 'Orders by status',
      columns: ['Status', 'Orders', 'Revenue'],
      rows: rows.map(row => [row._id || 'unknown', formatInt(row.orders), formatMoney(row.revenue)])
    }
  };
}

async function getLowStockProducts(models, params) {
  const { Product } = models;
  const threshold = Math.max(0, Number(params.threshold) || 5);
  const storeType = params.storeType || inferStoreType(params.message);
  const query = { stock: { $lte: threshold } };
  if (storeType !== 'all') query.storeType = storeType;
  const products = await Product.find(query)
    .select('name sku category stock price status storeType')
    .sort({ stock: 1, updatedAt: -1 })
    .limit(getLimit(params.limit, 15, 50))
    .lean();
  return {
    cards: [
      { label: 'Threshold', value: `${threshold} pcs`, tone: 'amber' },
      { label: 'Products', value: formatInt(products.length), tone: 'red' }
    ],
    table: {
      title: storeType === 'all' ? 'Low stock products' : `${storeType} low stock products`,
      columns: ['Product', 'SKU', 'Store', 'Category', 'Stock', 'Status'],
      rows: products.map(p => [p.name, p.sku || '-', p.storeType || '-', p.category || '-', formatInt(p.stock), p.status || '-'])
    }
  };
}

async function getBestSellingProducts(models, params) {
  const { Order } = models;
  const dateRange = getDateRange(params);
  const match = orderMatchForRange(dateRange);
  const rows = await Order.aggregate([
    { $match: match },
    { $unwind: '$items' },
    {
      $group: {
        _id: { productId: '$items.productId', name: '$items.name', sku: '$items.sku' },
        units: { $sum: { $ifNull: ['$items.quantity', 0] } },
        revenue: { $sum: { $ifNull: ['$items.total', 0] } }
      }
    },
    { $sort: { units: -1, revenue: -1 } },
    { $limit: getLimit(params.limit, 10, 30) }
  ]);
  return {
    dateRange,
    cards: [
      { label: 'Products', value: formatInt(rows.length), tone: 'blue' },
      { label: 'Units sold', value: formatInt(rows.reduce((sum, row) => sum + toNumber(row.units), 0)), tone: 'green' }
    ],
    table: {
      title: 'Best selling products',
      columns: ['Product', 'SKU', 'Units', 'Revenue'],
      rows: rows.map(row => [row._id?.name || 'Unknown product', row._id?.sku || '-', formatInt(row.units), formatMoney(row.revenue)])
    }
  };
}

async function getInventoryValue(models, params) {
  const { Product } = models;
  const storeType = params.storeType || inferStoreType(params.message);
  const match = {};
  if (storeType !== 'all') match.storeType = storeType;
  const [summary] = await Product.aggregate([
    { $match: match },
    { $project: { stock: { $ifNull: ['$stock', 0] }, price: { $ifNull: ['$price', 0] }, mrp: { $ifNull: ['$mrp', 0] } } },
    {
      $group: {
        _id: null,
        products: { $sum: 1 },
        pieces: { $sum: '$stock' },
        sellingValue: { $sum: { $multiply: ['$stock', '$price'] } },
        mrpValue: { $sum: { $multiply: ['$stock', '$mrp'] } }
      }
    }
  ]);
  return {
    cards: [
      { label: 'Products', value: formatInt(summary?.products), tone: 'blue' },
      { label: 'Pieces', value: formatInt(summary?.pieces), tone: 'green' },
      { label: 'Selling value', value: formatMoney(summary?.sellingValue), tone: 'gold' },
      { label: 'MRP value', value: formatMoney(summary?.mrpValue), tone: 'pink' }
    ],
    table: {
      title: 'Inventory value',
      columns: ['Metric', 'Value'],
      rows: [
        ['Store filter', storeType],
        ['Products', formatInt(summary?.products)],
        ['Pieces in stock', formatInt(summary?.pieces)],
        ['Value at selling price', formatMoney(summary?.sellingValue)],
        ['Value at MRP', formatMoney(summary?.mrpValue)]
      ]
    },
    completeness: ['Profit value needs cost price/material/labour cost fields. Current result uses selling price only.']
  };
}

async function getCollectionProductCounts(models, params) {
  const { Category, Product } = models;
  const storeType = params.storeType || inferStoreType(params.message);
  const categoryMatch = {};
  const productMatch = {};
  if (storeType !== 'all') {
    categoryMatch.storeType = storeType;
    productMatch.storeType = storeType;
  }
  const [categories, countRows] = await Promise.all([
    Category.find(categoryMatch).select('name slug storeType displayOrder createdAt').sort({ storeType: 1, displayOrder: 1, name: 1 }).limit(getLimit(params.limit, 50, 100)).lean(),
    Product.aggregate([
      { $match: productMatch },
      { $group: { _id: { category: '$category', storeType: '$storeType' }, products: { $sum: 1 }, published: { $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] } }, stock: { $sum: { $ifNull: ['$stock', 0] } } } }
    ])
  ]);
  const keyFor = (name, type) => `${String(name || '').toLowerCase()}|${type || ''}`;
  const countMap = new Map(countRows.map(row => [keyFor(row._id.category, row._id.storeType), row]));
  const rows = categories.map(cat => {
    const hit = countMap.get(keyFor(cat.name, cat.storeType)) || {};
    return {
      name: cat.name,
      storeType: cat.storeType || 'main',
      products: toNumber(hit.products),
      published: toNumber(hit.published),
      stock: toNumber(hit.stock)
    };
  });
  return {
    cards: [
      { label: 'Collections', value: formatInt(rows.length), tone: 'blue' },
      { label: 'Products', value: formatInt(rows.reduce((sum, row) => sum + row.products, 0)), tone: 'green' },
      { label: 'Stock', value: formatInt(rows.reduce((sum, row) => sum + row.stock, 0)), tone: 'gold' }
    ],
    table: {
      title: storeType === 'all' ? 'Collection product counts' : `${storeType} collection product counts`,
      columns: ['Collection', 'Store', 'Products', 'Published', 'Stock'],
      rows: rows.map(row => [row.name, row.storeType, formatInt(row.products), formatInt(row.published), formatInt(row.stock)])
    }
  };
}

async function getWebsiteHealth(models) {
  const { Product, Order, Category, User } = models;
  const [products, published, draft, outOfStock, collections, orders, customers] = await Promise.all([
    maybeCount(Product),
    maybeCount(Product, { status: 'published' }),
    maybeCount(Product, { status: 'draft' }),
    maybeCount(Product, { stock: { $lte: 0 } }),
    maybeCount(Category),
    maybeCount(Order),
    maybeCount(User, { role: { $ne: 'admin' } })
  ]);
  const warnings = [];
  if (!published) warnings.push('Published products zero hain. Customer side empty dikh sakta hai.');
  if (outOfStock > 0) warnings.push(`${formatInt(outOfStock)} products out of stock hain.`);
  if (!collections) warnings.push('Collections zero hain. Product browsing weak lagegi.');
  return {
    cards: [
      { label: 'Products', value: formatInt(products), tone: 'blue' },
      { label: 'Published', value: formatInt(published), tone: 'green' },
      { label: 'Drafts', value: formatInt(draft), tone: 'amber' },
      { label: 'Out of stock', value: formatInt(outOfStock), tone: 'red' },
      { label: 'Collections', value: formatInt(collections), tone: 'pink' },
      { label: 'Orders', value: formatInt(orders), tone: 'gold' },
      { label: 'Customers', value: formatInt(customers), tone: 'violet' }
    ],
    table: {
      title: 'Website health',
      columns: ['Check', 'Result'],
      rows: [
        ['Catalog status', published ? 'OK' : 'Needs products'],
        ['Stock status', outOfStock ? `${formatInt(outOfStock)} out of stock` : 'OK'],
        ['Collections', collections ? 'OK' : 'Needs collections'],
        ['AI safety', 'Read-only mode active']
      ]
    },
    completeness: warnings
  };
}

async function runTool(models, toolName, params) {
  if (toolName === 'getDashboardSummary') return getDashboardSummary(models, params);
  if (toolName === 'getOrdersByState') return getOrdersByState(models, params);
  if (toolName === 'getOrdersByStatus') return getOrdersByStatus(models, params);
  if (toolName === 'getLowStockProducts') return getLowStockProducts(models, params);
  if (toolName === 'getBestSellingProducts') return getBestSellingProducts(models, params);
  if (toolName === 'getInventoryValue') return getInventoryValue(models, params);
  if (toolName === 'getCollectionProductCounts') return getCollectionProductCounts(models, params);
  if (toolName === 'getWebsiteHealth') return getWebsiteHealth(models, params);
  return getDashboardSummary(models, params);
}

function buildLocalAnswer(toolName, result) {
  const rangeText = result.dateRange ? ` (${result.dateRange.label})` : '';
  const cards = Array.isArray(result.cards) ? result.cards : [];
  const first = cards.slice(0, 4).map(card => `${card.label}: ${card.value}`).join(', ');
  const warnings = Array.isArray(result.completeness) && result.completeness.length ? ` Note: ${result.completeness.join(' ')}` : '';
  const toolIntro = {
    getDashboardSummary: 'Lencho summary ready hai',
    getOrdersByState: 'State-wise orders ready hain',
    getOrdersByStatus: 'Status-wise order summary ready hai',
    getLowStockProducts: 'Low stock list ready hai',
    getBestSellingProducts: 'Best sellers ready hain',
    getInventoryValue: 'Inventory value ready hai',
    getCollectionProductCounts: 'Collection-wise product count ready hai',
    getWebsiteHealth: 'Website health snapshot ready hai'
  }[toolName] || 'Summary ready hai';
  return `${toolIntro}${rangeText}. ${first || 'Data available nahi mila.'}${warnings}`;
}

function extractOutputText(data) {
  if (typeof data?.output_text === 'string' && data.output_text.trim()) return data.output_text.trim();
  const output = Array.isArray(data?.output) ? data.output : [];
  const parts = [];
  output.forEach(item => {
    const content = Array.isArray(item?.content) ? item.content : [];
    content.forEach(part => {
      if (typeof part?.text === 'string') parts.push(part.text);
      if (typeof part?.output_text === 'string') parts.push(part.output_text);
    });
  });
  return parts.join('\n').trim();
}

async function polishWithOpenAi(message, toolName, result, fallback) {
  const apiKey = safeText(process.env.OPENAI_API_KEY, 4000);
  if (!apiKey || String(process.env.LENCHO_AI_USE_OPENAI || 'true').toLowerCase() === 'false') {
    return { answer: fallback, provider: 'local' };
  }

  try {
    const model = safeText(process.env.OPENAI_TEXT_MODEL || 'gpt-4.1-mini', 80);
    const payload = {
      model,
      max_output_tokens: 420,
      input: [
        {
          role: 'system',
          content: 'You are Lencho admin AI. Reply in concise Hinglish/English. Use only the supplied read-only JSON. Do not invent data. Do not ask for secrets. Do not claim you can edit, delete, refund, cancel, publish, export customers, or change settings.'
        },
        {
          role: 'user',
          content: JSON.stringify({
            adminQuestion: redactSensitiveText(message, 800),
            selectedReadOnlyTool: toolName,
            result
          })
        }
      ]
    };

    const response = await axios.post('https://api.openai.com/v1/responses', payload, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 12000
    });
    const text = extractOutputText(response.data);
    return { answer: text || fallback, provider: 'openai' };
  } catch (error) {
    return { answer: fallback, provider: 'local_fallback', aiError: error?.response?.data?.error?.message || error.message };
  }
}

async function auditAiRead(models, req, details) {
  const { AdminAction, User } = models || {};
  if (!AdminAction) return;
  try {
    let actor = null;
    if (User && req.auth?.userId) {
      actor = await User.findById(req.auth.userId).select('email name').lean();
    }
    await AdminAction.create({
      adminId: req.auth?.userId || '',
      adminEmail: actor?.email || req.auth?.email || '',
      adminName: actor?.name || req.auth?.name || '',
      action: 'AI_READ_QUERY',
      method: req.method,
      path: req.originalUrl || req.path,
      statusCode: 200,
      ip: req.ip || '',
      userAgent: req.get('user-agent') || '',
      details
    });
  } catch (error) {
    console.warn('[AI AUDIT] Failed:', error.message);
  }
}

function applyRateLimit(req, res, next) {
  const key = req.auth?.userId || req.auth?.email || req.ip || 'anonymous';
  const now = Date.now();
  const current = (aiRateBuckets.get(key) || []).filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);
  if (current.length >= RATE_LIMIT_MAX) {
    return res.status(429).json({ success: false, error: 'Too many AI requests. Please wait a minute.' });
  }
  current.push(now);
  aiRateBuckets.set(key, current);
  next();
}

module.exports = function createAdminAiRoutes({ requireAdmin, models = {} }) {
  if (typeof requireAdmin !== 'function') {
    throw new Error('createAdminAiRoutes requires requireAdmin middleware');
  }

  const router = express.Router();
  router.use(requireAdmin);
  router.use(applyRateLimit);

  router.get('/status', (req, res) => {
    res.json({
      success: true,
      enabled: true,
      mode: 'read-only',
      openAiConfigured: Boolean(safeText(process.env.OPENAI_API_KEY, 4000)),
      model: safeText(process.env.OPENAI_TEXT_MODEL || 'gpt-4.1-mini', 80),
      suggestedPrompts,
      safety: [
        'OpenAI key backend only.',
        'No delete/refund/cancel/publish tools enabled.',
        'AI questions are audited without storing full prompt text.'
      ]
    });
  });

  router.get('/suggestions', (req, res) => {
    res.json({ success: true, suggestions: suggestedPrompts });
  });

  router.post('/chat', async (req, res) => {
    const message = safeText(req.body?.message, 1000);
    if (!message) return res.status(400).json({ success: false, error: 'Message is required' });

    try {
      const toolName = req.body?.toolName || inferTool(message);
      const params = {
        message,
        range: req.body?.range,
        startDate: req.body?.startDate,
        endDate: req.body?.endDate,
        limit: req.body?.limit,
        threshold: req.body?.threshold,
        storeType: req.body?.storeType || inferStoreType(message),
        status: req.body?.status || inferStatus(message),
        state: req.body?.state || inferState(message)
      };
      const result = await runTool(models, toolName, params);
      const fallback = buildLocalAnswer(toolName, result);
      const ai = await polishWithOpenAi(message, toolName, result, fallback);

      await auditAiRead(models, req, {
        toolName,
        provider: ai.provider,
        messageLength: message.length,
        dateRange: result.dateRange?.label || '',
        storeType: params.storeType || '',
        status: params.status || '',
        state: params.state || ''
      });

      res.json({
        success: true,
        answer: ai.answer,
        provider: ai.provider,
        toolName,
        cards: result.cards || [],
        table: result.table || null,
        secondaryTable: result.secondaryTable || null,
        completeness: result.completeness || [],
        meta: {
          mode: 'read-only',
          generatedAt: new Date().toISOString(),
          timezone: 'Asia/Kolkata',
          dateRange: result.dateRange || null,
          aiError: ai.aiError || ''
        }
      });
    } catch (error) {
      console.error('[ADMIN AI] Chat failed:', error);
      res.status(500).json({ success: false, error: 'AI summary failed', details: process.env.NODE_ENV === 'development' ? error.message : undefined });
    }
  });

  return router;
};
