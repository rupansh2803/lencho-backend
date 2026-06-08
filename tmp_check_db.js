const mongoose = require('mongoose');
const { Inquiry } = require('./models');

async function check() {
  try {
    await mongoose.connect('mongodb://localhost:27017/lencho-india');
    const count = await Inquiry.countDocuments();
    const latest = await Inquiry.find().sort({ createdAt: -1 }).limit(5);
    console.log('Total Inquiries:', count);
    console.log('Latest Inquiries:', JSON.stringify(latest, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}
check();
