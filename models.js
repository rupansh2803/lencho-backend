// ─── LENCHO INDIA — MONGODB MODELS ───────────────────────────
const mongoose = require('mongoose');

// ── USER ──────────────────────────────────────────────────────
const userSchema = new mongoose.Schema({
  name:      { type: String, required: true, trim: true },
  email:     { type: String, required: true, unique: true, lowercase: true },
  phone:     { type: String, default: '' },
  gender:    { type: String, enum: ['female','male','other','prefer-not'], default: 'female' },
  password:  { type: String, default: '' },
  role:      { type: String, enum: ['user','admin'], default: 'user' },
  authProvider: { type: String, enum: ['email', 'google'], default: 'email' },
  address:   { type: String, default: '' },
  addresses: [{ label:String, line1:String, city:String, state:String, pin:String, phone:String }],
  isVerified:{ type: Boolean, default: false },
  isBlocked: { type: Boolean, default: false },
  emailVerifiedAt: { type: Date, default: null },
  lastLoginAt: { type: Date, default: null },
  lastLoginIp: { type: String, default: '' },
  lastLoginUserAgent: { type: String, default: '' },
  loginCount: { type: Number, default: 0 },
  otp:       { code: String, expiresAt: Date },
  profileImg:{ type: String, default: '' },
  language:  { type: String, default: 'en' },
  securityQuestion: { type: String, default: '' },
  securityAnswer:   { type: String, default: '' },
}, { timestamps: true });

// ── PRODUCT ───────────────────────────────────────────────────
const productSchema = new mongoose.Schema({
  name:       { type: String, required: true },
  category:   { type: String, required: true },
  sku:        { type: String, default: '' },
  price:      { type: Number, required: true },
  mrp:        { type: Number, required: true },
  discount:   { type: Number, default: 0 },
  stock:      { type: Number, default: 0 },
  description:{ type: String, default: '' },
  images:     [String],
  hasVariants:{ type: Boolean, default: false },
  variantType:{ type: String, default: '' },
  variants:   [{
    id:        { type: String, default: '' },
    label:     { type: String, default: '' },
    value:     { type: String, default: '' },
    colorHex:  { type: String, default: '' },
    price:     { type: Number, default: 0 },
    mrp:       { type: Number, default: 0 },
    stock:     { type: Number, default: 0 },
    sku:       { type: String, default: '' },
    images:    [String]
  }],
  gstRate:    { type: Number, default: 18 }, // ✅ FIXED: 18% for jewelry (CGST 9% + SGST 9%)
  hsn:        { type: String, default: '7117' },
  featured:   { type: Boolean, default: false },
  popular:    { type: Boolean, default: false },
  trending:   { type: Boolean, default: false },
  newArrival: { type: Boolean, default: false },
  sale:       { type: Boolean, default: false },
  status:     { type: String, enum: ['published', 'draft'], default: 'published' },
  storeType:  { type: String, enum: ['main', 'woollen'], default: 'main' },
  rating:     { type: Number, default: 0 },
  reviews:    [{ userId:String, userName:String, rating:Number, comment:String, date:Date }],
}, { timestamps: true });

// ── ORDER ─────────────────────────────────────────────────────
const orderSchema = new mongoose.Schema({
  id:         { type: String, unique: true },
  userId:     { type: String, required: false, default: null },
  userName:   { type: String, required: true },
  items:      [{
    productId:String,
    variantId: { type: String, default: '' },
    variantLabel: { type: String, default: '' },
    sku: { type: String, default: '' },
    name:String,
    image:String,
    price:Number,
    mrp:Number,
    quantity:Number,
    gstRate:Number,
    hsn:String,
    gstAmount:Number,
    total:Number
  }],
  address:    { type: String, required: true },
  paymentMethod: { type: String, required: true },
  subtotal:   Number, gstTotal:Number, shipping:Number, discount:Number, grandTotal:Number,
  couponCode: String,
  status:     { type: String, default: 'placed' },
  timeline:   [{ status:String, label:String, date:Date, done:Boolean }],
  clearCart:  { type: Boolean, default: true },
  
  // ── PAYMENT & LOGISTICS ──
  razorpayOrderId:   String,
  razorpayPaymentId: String,
  razorpaySignature: String,
  
  shiprocketOrderId:    String,
  shiprocketShipmentId: String,
  awbCode:              String, // Tracking ID
  labelUrl:             String, // PDF URL
  
  deliveryPartner: String,
  trackingNumber:  String,
  estimatedDelivery: Date,
}, { timestamps: true });

orderSchema.index({ userId: 1 });

// ── CART ──────────────────────────────────────────────────────
const cartSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  items:  [{
    productId: String,
    variantId: { type: String, default: '' },
    quantity: Number
  }],
}, { timestamps: true });

// ── WISHLIST ──────────────────────────────────────────────────
const wishlistSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  items:  [String],
}, { timestamps: true });

// ── SETTINGS (admin-controlled) ───────────────────────────────
const settingsSchema = new mongoose.Schema({
  key:   { type: String, required: true, unique: true },
  value: mongoose.Schema.Types.Mixed,
  label: String,
}, { timestamps: true });

// ── OTP LOG ───────────────────────────────────────────────────
const otpSchema = new mongoose.Schema({
  target:    { type: String, required: true }, // email or phone
  code:      { type: String, required: true },
  type:      { type: String, default: 'signup' }, // signup | login | admin
  expiresAt: { type: Date, required: true },
  used:      { type: Boolean, default: false },
}, { timestamps: true });

// Auto expire OTP docs after 10 min
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// ── TESTIMONIAL ───────────────────────────────────────────────
const testimonialSchema = new mongoose.Schema({
  name:    { type: String, required: true },
  city:    { type: String, default: '' },
  rating:  { type: Number, default: 5 },
  comment: { type: String, required: true },
  approved:{ type: Boolean, default: true }, // Auto-approve by default for manual admin entries
}, { timestamps: true });

// ── CATEGORY (COLLECTION) ─────────────────────────────────────
const categorySchema = new mongoose.Schema({
  name:        { type: String, required: true, unique: true },
  slug:        { type: String, required: true, unique: true },
  image:       { type: String, default: '' },
  bannerImage: { type: String, default: '' },
  icon:        { type: String, default: 'star' },
  theme:       { type: String, default: '' },
  storeType:   { type: String, enum: ['main', 'woollen'], default: 'main' },
  description: { type: String, default: '' },
  displayOrder:{ type: Number, default: 0 },
}, { timestamps: true });

// ── INQUIRY (CONTACT FORM) ────────────────────────────────────
const inquirySchema = new mongoose.Schema({
  name:    { type: String, required: true },
  email:   { type: String, required: true },
  phone:   { type: String, default: '' },
  message: { type: String, required: true },
  status:  { type: String, enum: ['new', 'read', 'replied'], default: 'new' },
}, { timestamps: true });

// ── LOGIN EVENT (AUDIT LOG) ──────────────────────────────────
const loginEventSchema = new mongoose.Schema({
  email:     { type: String, default: '' },
  name:      { type: String, default: '' },
  method:    { type: String, default: 'password' }, // password | google
  status:    { type: String, default: 'success' }, // success | failed
  role:      { type: String, default: 'user' },
  ip:        { type: String, default: '' },
  userAgent: { type: String, default: '' },
}, { timestamps: true });

// ─── MARKETING SUBSCRIBERS / CAMPAIGNS ─────────────────────────────
const marketingSubscriberSchema = new mongoose.Schema({
  email:            { type: String, required: true, unique: true, lowercase: true, trim: true },
  name:             { type: String, default: '' },
  source:           { type: String, default: 'popup' },
  consent:          { type: Boolean, default: true },
  consentText:      { type: String, default: '' },
  consentAt:        { type: Date, default: Date.now },
  status:           { type: String, enum: ['subscribed', 'unsubscribed'], default: 'subscribed' },
  unsubscribeToken: { type: String, default: '' },
  offerCode:        { type: String, default: '' },
  lastSentAt:       { type: Date, default: null },
  tags:             [String],
  metadata:         { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

marketingSubscriberSchema.index({ status: 1, source: 1 });

const marketingCampaignSchema = new mongoose.Schema({
  subject:     { type: String, required: true },
  previewText: { type: String, default: '' },
  body:        { type: String, required: true },
  offerCode:   { type: String, default: '' },
  imageUrl:    { type: String, default: '' },
  ctaText:     { type: String, default: '' },
  ctaUrl:      { type: String, default: '' },
  segment:     { type: String, enum: ['subscribed', 'all', 'popup', 'discount_popup'], default: 'subscribed' },
  status:      { type: String, enum: ['draft', 'scheduled', 'sending', 'sent', 'failed'], default: 'draft' },
  scheduledAt: { type: Date, default: null },
  sentAt:      { type: Date, default: null },
  sentCount:   { type: Number, default: 0 },
  failedCount: { type: Number, default: 0 },
  testEmail:   { type: String, default: '' },
  createdBy:   { type: String, default: '' },
}, { timestamps: true });

marketingCampaignSchema.index({ status: 1, scheduledAt: 1 });

const marketingEmailLogSchema = new mongoose.Schema({
  campaignId: { type: String, required: true },
  email:      { type: String, required: true },
  status:     { type: String, enum: ['sent', 'failed', 'skipped'], default: 'sent' },
  error:      { type: String, default: '' },
  messageId:  { type: String, default: '' },
  sentAt:     { type: Date, default: Date.now },
}, { timestamps: true });

marketingEmailLogSchema.index({ campaignId: 1, createdAt: -1 });

module.exports = {
  User:     mongoose.model('User',     userSchema),
  Category: mongoose.model('Category', categorySchema),
  Product:  mongoose.model('Product',  productSchema),
  Order:    mongoose.model('Order',    orderSchema),
  Cart:     mongoose.model('Cart',     cartSchema),
  Wishlist: mongoose.model('Wishlist', wishlistSchema),
  Settings: mongoose.model('Settings', settingsSchema),
  OTPLog:   mongoose.model('OTPLog',   otpSchema),
  Testimonial: mongoose.model('Testimonial', testimonialSchema),
  Inquiry:  mongoose.model('Inquiry',  inquirySchema),
  LoginEvent: mongoose.model('LoginEvent', loginEventSchema),
  MarketingSubscriber: mongoose.model('MarketingSubscriber', marketingSubscriberSchema),
  MarketingCampaign: mongoose.model('MarketingCampaign', marketingCampaignSchema),
  MarketingEmailLog: mongoose.model('MarketingEmailLog', marketingEmailLogSchema),
};
