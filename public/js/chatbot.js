/* ── LENCHO CHATBOT ─────────────────────────────────────────── */

const LENCHO_KB = {
  greet: ["Namaste! 🙏", "Hello! Kaise help kar sakti hoon?", "Hi! Lencho mein aapka swagat hai! 💍"],
  products: `Hamare paas yeh collections hain: 💍\n\n• **Earrings** – Jhumke, Studs, Hoops\n• **Necklace** – Kundan, Pearl, Gold-plated\n• **Rings & Bangles** – Angoothi, Choodi\n• **Payal** – Silver & Gold Anklets\n• **Chains** – Mangalsutra, Chains\n• **Maang Tikka** – Bridal & Casual\n• **Bridal Sets** – Complete Sets\n\nKaunsi category dekhni hai? 😊`,
  offers: `Yeh hain hamare discount codes! 🎁\n\n🔥 **FIRST10** → 10% off (min ₹199)\n💰 **SAVE50** → ₹50 flat off (min ₹499)\n✨ **LENCHO20** → 20% off (min ₹999)\n\n+ New customers ko popup mein special offer milta hai!\nCheckout pe code daalo aur save karo! 🛍️`,
  track: `Order track karne ke liye:\n\n1️⃣ Upar "Track Order" click karo\n2️⃣ Ya seedha yaha: /track\n3️⃣ Apna Order ID daalo (e.g. LEN12345678)\n\nOrder ID aapko email ya My Account mein milega! 📧`,
  contact: `Aap humse yahan contact kar sakte hain:\n\n📞 **Phone:** +91 8168817625\n📧 **Email:** lencho.official01@gmail.com\n📍 **Location:** 197 Sarakpur, Barara, Ambala\n🕐 **Timing:** Mon–Sat 10AM–7PM\n\nWhatsApp pe bhi message kar sakte hain! 💬`,
  shipping: `Shipping info:\n\n🚚 **Free Delivery** – Orders ₹999+\n📦 **Standard Delivery** – ₹49 for orders below ₹999\n⏱️ **Delivery Time** – 5-7 business days\n🔄 **Returns** – 7-day return policy\n\nCOD (Cash on Delivery) bhi available hai! 💵`,
  payment: `Payment options:\n\n💳 **UPI** – PhonePe, GPay, Paytm\n🏦 **Net Banking / Card**\n💵 **COD** – Cash on Delivery\n\nSab payments 100% secure hain! 🔒`,
  return: `Return policy:\n\n✅ 7 din ke andar return kar sakte ho\n✅ Damaged ya wrong product pe full refund\n✅ Refund 3-5 business days mein\n\nReturn ke liye support@lenchoindia.com pe email karo! 📧`,
  size: `Jewellery sizing:\n\n💍 **Rings** – Adjustable sizes available\n🔮 **Bangles** – S, M, L sizes hain\n👂 **Earrings** – One size fits all\n🦶 **Toe Rings** – Adjustable\n\nKoi specific size chahiye toh poochho! 😊`,
  default: `Samajh nahi aaya! 😊 Mujhe in topics mein help kar sakti hoon:\n\n💍 Products & Collections\n🏷️ Offers & Discount Codes\n📦 Order Tracking\n🚚 Shipping & Delivery\n💳 Payment Options\n🔄 Returns & Refunds\n📞 Contact Details\n\nKya poochna chahti hain?`
};

LENCHO_KB.products = `Hamare main focus woollen handmade pieces par hai:\n\n- Crochet hair clips, bows and bands\n- Woollen scrunchies\n- Baby accessories and soft gifts\n- Crochet flowers and decor\n- Winter and festive woollen drops\n- Selected jewellery corner\n\nAap woollen store dekhna chahenge ya jewellery corner?`;
LENCHO_KB.size = `Woollen sizing:\n\n- Hair accessories mostly free size hain\n- Baby items ke liye size/age mention product page par rahega\n- Decor pieces handmade hone ki wajah se thoda variation ho sakta hai\n- Jewellery corner me rings/toe rings adjustable options available hain`;
LENCHO_KB.default = `Main woollen products, collections, offers, order tracking, shipping, payment, returns, aur contact details me help kar sakti hoon. Kya dekhna hai?`;

function getBotReply(msg) {
  const m = msg.toLowerCase();
  if (/namaste|hello|hi|helo|hii|hey/.test(m)) return LENCHO_KB.greet[Math.floor(Math.random()*3)];
  if (/product|collection|wool|woollen|crochet|scrunch|hair|baby|decor|jewel|jewellery|earring|necklace|ring|bangle|payal|chain|tikka|bridal|set|kya hai/.test(m)) return LENCHO_KB.products;
  if (/offer|discount|coupon|code|sale|off|cheap|price/.test(m)) return LENCHO_KB.offers;
  if (/track|order|status|kahan|delivery status|parcel/.test(m)) return LENCHO_KB.track;
  if (/contact|phone|email|address|call|whatsapp|number/.test(m)) return LENCHO_KB.contact;
  if (/ship|deliver|free ship|charge|days|kab milega/.test(m)) return LENCHO_KB.shipping;
  if (/pay|payment|upi|cod|cash|card|secure/.test(m)) return LENCHO_KB.payment;
  if (/return|refund|wapas|exchange|replace/.test(m)) return LENCHO_KB.return;
  if (/size|fitting|fit|bangle size|ring size/.test(m)) return LENCHO_KB.size;
  return LENCHO_KB.default;
}

let chatOpen = false;

function toggleChat() {
  chatOpen = !chatOpen;
  const win = document.getElementById('chatbot-window');
  const openIcon = document.getElementById('chat-open-icon');
  const closeIcon = document.getElementById('chat-close-icon');
  const ping = document.querySelector('.chat-ping');
  win.style.display = chatOpen ? 'flex' : 'none';
  openIcon.style.display = chatOpen ? 'none' : 'block';
  closeIcon.style.display = chatOpen ? 'block' : 'none';
  if (ping) ping.style.display = 'none';
  if (chatOpen) setTimeout(() => document.getElementById('chat-input')?.focus(), 200);
}

function addChatMessage(text, who) {
  const msgs = document.getElementById('chat-messages');
  const quick = document.getElementById('chat-quick');
  if (quick) quick.remove();
  const div = document.createElement('div');
  div.className = 'chat-msg ' + who;
  div.innerHTML = `<div class="chat-bubble">${text.replace(/\*\*(.*?)\*\*/g,'<b>$1</b>').replace(/\n/g,'<br/>')}</div>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function addTyping() {
  const msgs = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = 'chat-msg bot';
  div.id = 'chat-typing';
  div.innerHTML = '<div class="chat-bubble chat-typing-dots"><span></span><span></span><span></span></div>';
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function removeTyping() {
  const t = document.getElementById('chat-typing');
  if (t) t.remove();
}

function sendChat() {
  const input = document.getElementById('chat-input');
  const msg = input?.value?.trim();
  if (!msg) return;
  input.value = '';
  addChatMessage(msg, 'user');
  addTyping();
  setTimeout(() => {
    removeTyping();
    const reply = getBotReply(msg);
    addChatMessage(reply, 'bot');
    addChatQuickReplies();
  }, 800 + Math.random() * 400);
}

function chatReply(type) {
  const labels = { products:'💍 Products', offers:'🏷️ Offers', track:'📦 Track Order', contact:'📞 Contact', shipping:'🚚 Shipping', payment:'💳 Payment', return:'🔄 Returns' };
  addChatMessage(labels[type] || type, 'user');
  addTyping();
  setTimeout(() => {
    removeTyping();
    addChatMessage(LENCHO_KB[type] || LENCHO_KB.default, 'bot');
    addChatQuickReplies();
  }, 700);
}

function addChatQuickReplies() {
  const msgs = document.getElementById('chat-messages');
  const qr = document.createElement('div');
  qr.className = 'chat-quick-replies';
  qr.id = 'chat-quick';
  qr.innerHTML = `
    <button onclick="chatReply('products')">💍 Products</button>
    <button onclick="chatReply('offers')">🏷️ Offers</button>
    <button onclick="chatReply('shipping')">🚚 Shipping</button>
    <button onclick="chatReply('payment')">💳 Payment</button>
    <button onclick="chatReply('return')">🔄 Returns</button>
    <button onclick="chatReply('contact')">📞 Contact</button>`;
  msgs.appendChild(qr);
  msgs.scrollTop = msgs.scrollHeight;
}

// Auto show ping after 8 seconds
setTimeout(() => {
  const ping = document.querySelector('.chat-ping');
  if (ping && !chatOpen) ping.style.display = 'block';
}, 8000);
