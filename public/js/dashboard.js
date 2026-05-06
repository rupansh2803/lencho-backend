/* ── USER DASHBOARD ───────────────────────────────────────── */
async function renderDashboard() {
  if (!currentUser) { openAuthModal(); navigate('/'); return; }
  const app = document.getElementById('app');
  app.innerHTML = `
  <div class="dashboard-layout">
    <div class="dashboard-sidebar">
      <div class="dash-logo">✦ My Account ✦</div>
      <div style="text-align:center;margin-bottom:1.5rem;padding-bottom:1.5rem;border-bottom:1px solid var(--border);">
        <div style="width:60px;height:60px;border-radius:50%;background:var(--grad-rose);display:flex;align-items:center;justify-content:center;font-family:'Cormorant Garamond',serif;font-size:1.8rem;color:#fff;margin:0 auto 0.75rem;">${currentUser.name[0].toUpperCase()}</div>
        <div style="font-weight:600;font-size:.95rem;">${currentUser.name}</div>
        <div style="color:var(--gray);font-size:.8rem;">${currentUser.email}</div>
      </div>
      <div class="dash-nav">
        <div class="dash-nav-item active" id="dn-orders" onclick="showDashTab('orders')"><i class="fas fa-box" style="width:20px;"></i> My Orders</div>
        <div class="dash-nav-item" id="dn-profile" onclick="showDashTab('profile')"><i class="fas fa-user" style="width:20px;"></i> Profile</div>
        <div class="dash-nav-item" id="dn-wishlist" onclick="navigate('/wishlist')"><i class="fas fa-heart" style="width:20px;"></i> Wishlist</div>
        <div class="dash-nav-item" onclick="handleLogout()" style="margin-top:1rem;color:#ef4444;"><i class="fas fa-sign-out-alt" style="width:20px;"></i> Logout</div>
      </div>
    </div>
    <div class="dash-content" id="dash-content"></div>
  </div>`;
  showDashTab('orders');
}

async function showDashTab(tab) {
  document.querySelectorAll('.dash-nav-item').forEach(n => n.classList.remove('active'));
  const el = document.getElementById('dn-' + tab);
  if (el) el.classList.add('active');
  const content = document.getElementById('dash-content');
  if (tab === 'orders') {
    content.innerHTML = '<div style="padding:1rem;color:var(--gray);">Loading orders...</div>';
    const orders = await api('/api/orders/my');
    if (!orders.length) {
      content.innerHTML = `<div class="dash-section"><h2>My Orders</h2><div class="empty-state"><div class="empty-icon">📦</div><h3>No orders yet</h3><p>Start shopping to see your orders here!</p><button class="btn-primary" onclick="navigate('/products')">Shop Now</button></div></div>`;
      return;
    }
    const statusLabels = { hold:'On Hold', pending:'Pending', shipping:'Shipping', delivered:'Delivered', cancelled:'Cancelled', placed:'Placed', confirmed:'Confirmed', shipped:'Shipped', out_for_delivery:'Out for Delivery' };
    const statusColors = { hold:'#fee2e2', pending:'#fff7ed', shipping:'#dbeafe', delivered:'#dcfce7', cancelled:'#fee2e2', placed:'#ede9fe', confirmed:'#fef3c7', shipped:'#dbeafe', out_for_delivery:'#fef9c3' };
    const statusTextColors = { hold:'#9f1239', pending:'#9a3412', shipping:'#1d4ed8', delivered:'#166534', cancelled:'#991b1b', placed:'#6d28d9', confirmed:'#92400e', shipped:'#1d4ed8', out_for_delivery:'#713f12' };
    content.innerHTML = `
    <div class="dash-section">
      <h2>My Orders (${orders.length})</h2>
      ${orders.map(o => `
      <div class="order-card">
        <div class="order-card-header">
          <div>
            <div class="order-num">${o.id}</div>
            <div class="order-date">${formatDate(o.createdAt)}</div>
          </div>
          <span style="padding:4px 12px;border-radius:99px;font-size:.75rem;font-weight:600;background:${statusColors[o.status]||'#f3f4f6'};color:${statusTextColors[o.status]||'#374151'}">${statusLabels[o.status]||o.status}</span>
        </div>
            <div class="order-items-preview">
              ${o.items.slice(0,3).map(i=>`<img class="order-thumb" src="${safeImageUrl(i.image, i.category)}" ${imageFallbackAttr(i.category, i.image)} alt="${i.name}" title="${i.name}"/>`).join('')}
          ${o.items.length>3?`<div style="width:50px;height:50px;border-radius:var(--radius-sm);background:var(--light-gray);display:flex;align-items:center;justify-content:center;font-size:.8rem;color:var(--gray);">+${o.items.length-3}</div>`:''}
        </div>
        <div style="font-size:.875rem;color:var(--gray);margin-bottom:.75rem;">${o.items.length} item${o.items.length>1?'s':''} · ${o.paymentMethod?.toUpperCase()}</div>
        <div class="order-footer">
          <span class="order-total">${formatCurrency(o.grandTotal)}</span>
          <div style="display:flex;gap:.5rem;">
            <button class="btn-outline btn-sm" onclick="viewOrderDetail('${o.id}')">View Details</button>
            <button class="btn-outline btn-sm" onclick="downloadInvoice('${o.id}')"><i class="fas fa-download"></i> Invoice</button>
            <button class="btn-outline btn-sm" onclick="trackOrderFromDash('${o.id}')"><i class="fas fa-map-marker-alt"></i> Track</button>
          </div>
        </div>
      </div>`).join('')}
    </div>`;
  } else if (tab === 'profile') {
    content.innerHTML = `
    <div class="dash-section">
      <h2>My Profile</h2>
      <div class="admin-form" style="max-width:500px;">
        <div class="form-group"><label>Full Name</label><input id="prof-name" value="${currentUser.name||''}"/></div>
        <div class="form-group"><label>Email</label><input value="${currentUser.email||''}" readonly style="background:var(--light-gray);"/></div>
        <div class="form-group"><label>Phone</label><input id="prof-phone" value="${currentUser.phone||''}" placeholder="+91 9876543210"/></div>
        <div class="form-group"><label>Default Address</label><textarea id="prof-addr" rows="3" placeholder="Your address...">${currentUser.address||''}</textarea></div>
        <button class="btn-primary" onclick="updateProfile()">Save Changes</button>
      </div>
    </div>`;
  }
  initScrollReveal();
}

async function updateProfile() {
  const name = document.getElementById('prof-name')?.value;
  const phone = document.getElementById('prof-phone')?.value;
  const address = document.getElementById('prof-addr')?.value;
  const r = await api('/api/profile', { method: 'PUT', body: { name, phone, address } });
  if (r.error) { toast(r.error, 'error'); return; }
  currentUser = r.user;
  updateHeader();
  toast('Profile updated! ✦', 'success');
}

async function viewOrderDetail(orderId) {
  const order = await api('/api/orders/' + orderId);
  if (order.error) { toast(order.error, 'error'); return; }
  const statusLabels = { hold:'On Hold', pending:'Pending', shipping:'Shipping', delivered:'Delivered', cancelled:'Cancelled', placed:'Order Placed', confirmed:'Confirmed', shipped:'Shipped', out_for_delivery:'Out for Delivery' };
  const content = document.getElementById('dash-content');
  content.innerHTML = `
  <div class="dash-section">
    <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.5rem;">
      <button class="back-link" style="background:none;border:none;cursor:pointer;" onclick="showDashTab('orders')"><i class="fas fa-arrow-left"></i> Back to Orders</button>
    </div>
    <h2>Order: ${order.id}</h2>
    <p style="color:var(--gray);margin-bottom:2rem;">${formatDate(order.createdAt)}</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;margin-bottom:2rem;">
      <div class="checkout-section">
        <h3>Items Ordered</h3>
        ${order.items.map(i=>`<div class="co-item" style="margin-bottom:.75rem;"><img src="${safeImageUrl(i.image, i.category)}" ${imageFallbackAttr(i.category, i.image)} style="width:54px;height:54px;border-radius:8px;object-fit:cover;"/><div style="flex:1;margin-left:.75rem;"><div style="font-weight:600;">${i.name}</div><div style="color:var(--gray);font-size:.8rem;">Qty: ${i.quantity} × ${formatCurrency(i.price)}</div></div><div style="font-weight:700;color:var(--rose-dark);">${formatCurrency(i.price*i.quantity)}</div></div>`).join('')}
      </div>
      <div class="checkout-section">
        <h3>Delivery Address</h3>
        <p style="color:var(--gray);font-size:.875rem;line-height:1.7;">${order.address}</p>
        <div style="margin-top:1rem;"><span style="font-weight:600;">Payment:</span> ${order.paymentMethod?.toUpperCase()}</div>
      </div>
    </div>
    <div class="checkout-section">
      <h3>Price Details</h3>
      <div class="summary-row"><span>Subtotal</span><span>${formatCurrency(order.subtotal)}</span></div>
      <div class="summary-row"><span>GST</span><span>${formatCurrency(order.gstTotal||0)}</span></div>
      <div class="summary-row"><span>Shipping</span><span>${order.shipping===0?'FREE':formatCurrency(order.shipping)}</span></div>
      ${order.discount?`<div class="summary-row" style="color:#22c55e;"><span>Discount</span><span>-${formatCurrency(order.discount)}</span></div>`:''}
      <div class="summary-row"><span class="summary-total">Grand Total</span><span class="summary-total">${formatCurrency(order.grandTotal)}</span></div>
    </div>
    <div style="display:flex;gap:1rem;margin-top:1.5rem;">
      <button class="btn-primary" onclick="downloadInvoice('${order.id}')"><i class="fas fa-download"></i> Download GST Invoice</button>
      <button class="btn-outline" onclick="trackOrderFromDash('${order.id}')">Track Order</button>
    </div>
  </div>`;
}

function trackOrderFromDash(orderId) {
  navigate('/track');
  setTimeout(() => {
    const input = document.getElementById('track-input');
    if (input) { input.value = orderId; trackOrder(); }
  }, 500);
}

/* ── GST INVOICE GENERATOR ────────────────────────────────── */
async function downloadInvoice(orderId) {
  const inv = await api('/api/orders/' + orderId + '/invoice');
  if (inv.error) { toast(inv.error, 'error'); return; }
  const html = generateInvoiceHTML(inv);
  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 800);
}

function generateInvoiceHTML(inv) {
  const itemRows = inv.items.map(i => `
    <tr>
      <td>${i.name}</td>
      <td>${i.hsn||'7117'}</td>
      <td>Nos</td>
      <td>${i.quantity}</td>
      <td>₹${i.price.toFixed(2)}</td>
      <td>₹${(i.price*i.quantity).toFixed(2)}</td>
      <td>${i.cgst||1.5}%</td>
      <td>₹${(i.cgstAmt||0).toFixed(2)}</td>
      <td>${i.sgst||1.5}%</td>
      <td>₹${(i.sgstAmt||0).toFixed(2)}</td>
      <td>₹${(i.price*i.quantity+(i.cgstAmt||0)+(i.sgstAmt||0)).toFixed(2)}</td>
    </tr>`).join('');
  return `<!DOCTYPE html><html><head><title>GST Invoice - ${inv.invoiceNo}</title>
  <style>
    body{font-family:Arial,sans-serif;font-size:12px;margin:0;padding:20px;color:#111;}
    .header{display:flex;justify-content:space-between;border-bottom:2px solid #c9748f;padding-bottom:15px;margin-bottom:15px;}
    .company{font-size:22px;font-weight:bold;color:#a85070;font-family:Georgia,serif;}
    .gstin{font-size:10px;color:#555;margin-top:4px;}
    .inv-title{text-align:right;}
    .inv-title h2{font-size:18px;color:#c9748f;margin:0;}
    .parties{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:15px;background:#fdf6f0;padding:12px;border-radius:8px;}
    .party-label{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#888;margin-bottom:6px;}
    .party-name{font-weight:bold;font-size:13px;margin-bottom:4px;}
    table{width:100%;border-collapse:collapse;margin-bottom:15px;font-size:11px;}
    th{background:#1a1a2e;color:#fff;padding:8px 6px;text-align:left;}
    td{padding:7px 6px;border-bottom:1px solid #eee;}
    tr:nth-child(even) td{background:#fdf6f0;}
    .totals{display:flex;justify-content:flex-end;}
    .totals-table{width:320px;}
    .totals-table td{font-size:12px;padding:5px 8px;}
    .total-row td{font-weight:bold;font-size:14px;background:#c9748f;color:#fff;}
    .footer{margin-top:20px;border-top:1px solid #eee;padding-top:10px;font-size:10px;color:#888;text-align:center;}
    .watermark{text-align:center;padding:8px;background:#dcfce7;border-radius:6px;color:#166534;font-weight:bold;font-size:11px;margin-bottom:15px;}
    @media print{button{display:none!important;}}
  </style></head><body>
  <div class="header">
    <div>
      <div class="company">✦ LENCHO ✦</div>
      <div class="gstin">GSTIN: ${inv.seller.gstin}</div>
      <div style="font-size:10px;color:#555;margin-top:4px;">${inv.seller.address}<br/>${inv.seller.phone} | ${inv.seller.email}</div>
    </div>
    <div class="inv-title">
      <h2>TAX INVOICE</h2>
      <div><b>Invoice No:</b> ${inv.invoiceNo}</div>
      <div><b>Invoice Date:</b> ${inv.invoiceDate}</div>
      <div><b>Order ID:</b> ${inv.orderId}</div>
      <div style="margin-top:8px;background:#ede9fe;padding:6px 10px;border-radius:6px;font-size:11px;color:#6d28d9;"><b>Payment:</b> ${inv.paymentMethod?.toUpperCase()}</div>
    </div>
  </div>
  <div class="parties">
    <div><div class="party-label">Sold By (Seller)</div><div class="party-name">${inv.seller.name}</div><div style="color:#555;">${inv.seller.address}</div><div style="color:#555;">GSTIN: ${inv.seller.gstin}</div></div>
    <div><div class="party-label">Billed To (Buyer)</div><div class="party-name">${inv.buyer.name}</div><div style="color:#555;">${inv.buyer.address}</div>${inv.buyer.phone?`<div style="color:#555;">Ph: ${inv.buyer.phone}</div>`:''}</div>
  </div>
  <table>
    <thead><tr><th>Product</th><th>HSN</th><th>Unit</th><th>Qty</th><th>Rate</th><th>Taxable Value</th><th>CGST%</th><th>CGST Amt</th><th>SGST%</th><th>SGST Amt</th><th>Total</th></tr></thead>
    <tbody>${itemRows}</tbody>
  </table>
  <div class="totals">
    <table class="totals-table">
      <tr><td>Taxable Amount:</td><td><b>₹${inv.totalTaxable.toFixed(2)}</b></td></tr>
      <tr><td>Total CGST (${(inv.items[0]?.cgst||1.5)}%):</td><td><b>₹${inv.totalCgst.toFixed(2)}</b></td></tr>
      <tr><td>Total SGST (${(inv.items[0]?.sgst||1.5)}%):</td><td><b>₹${inv.totalSgst.toFixed(2)}</b></td></tr>
      <tr><td>Total GST:</td><td><b>₹${inv.totalGst.toFixed(2)}</b></td></tr>
      <tr><td>Shipping:</td><td><b>${inv.shipping===0?'FREE':'₹'+inv.shipping.toFixed(2)}</b></td></tr>
      ${inv.discount?`<tr><td>Discount:</td><td style="color:green;"><b>-₹${inv.discount.toFixed(2)}</b></td></tr>`:''}
      <tr class="total-row"><td>Grand Total:</td><td>₹${inv.grandTotal.toFixed(2)}</td></tr>
    </table>
  </div>
  <div class="watermark">✓ This is a computer-generated invoice and does not require a physical signature.</div>
  <div class="footer">
    <p><b>Terms:</b> All sales are final. Returns accepted within 7 days. GST charged as per applicable rates.</p>
    <p>Thank you for shopping with Lencho! &nbsp;|&nbsp; www.lencho.in &nbsp;|&nbsp; hello@lencho.in</p>
  </div>
  <div style="text-align:center;margin-top:15px;"><button onclick="window.print()" style="background:#c9748f;color:#fff;border:none;padding:10px 24px;border-radius:99px;font-size:13px;cursor:pointer;">🖨️ Print / Save as PDF</button></div>
  </body></html>`;
}

/* ── WISHLIST PAGE ─────────────────────────────────────────── */
async function renderWishlist() {
  if (!currentUser) { openAuthModal(); navigate('/'); return; }
  const items = await api('/api/wishlist');
  const app = document.getElementById('app');
  if (!items.length) {
    app.innerHTML = `<div class="page-wrap"><h1 class="page-title">My Wishlist</h1><div class="empty-state"><div class="empty-icon">❤️</div><h3>Your wishlist is empty</h3><p>Save your favourite products to buy later!</p><button class="btn-primary" onclick="navigate('/products')">Explore Products</button></div></div>`;
    return;
  }
  app.innerHTML = `<div class="page-wrap"><h1 class="page-title">My Wishlist (${items.length})</h1><div class="wishlist-grid">${items.map(productCardHTML).join('')}</div></div>`;
  initScrollReveal();
}
