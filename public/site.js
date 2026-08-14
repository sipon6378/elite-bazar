let store;
let cart = JSON.parse(localStorage.getItem('eb_cart') || '[]');
const $ = (x) => document.getElementById(x);

async function api(u, o = {}) {
  const r = await fetch(u, {
    ...o,
    headers: { 'Content-Type': 'application/json', ...(o.headers || {}) }
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw Error(d.error || 'সমস্যা হয়েছে');
  return d;
}

async function csrf() {
  return (await fetch('/api/csrf')).json();
}

async function init() {
  try {
    store = await api('/api/store');
    // Remove stale cart entries that no longer exist in the current catalog.
    // This prevents an old localStorage product ID from blocking a new order.
    const valid = new Map(store.products.map(p => [Number(p.id), p]));
    const before = cart.length;
    cart = cart.filter(item => valid.has(Number(item.id)));
    if (cart.length !== before) localStorage.setItem('eb_cart', JSON.stringify(cart));
    // Keep requested quantities within the currently available stock.
    cart = cart.map(item => {
      const p = valid.get(Number(item.id));
      const stock = Math.max(0, Number(p.stock) || 0);
      return { ...item, id: Number(item.id), qty: Math.max(1, Math.min(Number(item.qty) || 1, Math.max(stock, 1))) };
    }).filter(item => (Number(valid.get(item.id)?.stock) || 0) > 0);
    localStorage.setItem('eb_cart', JSON.stringify(cart));
    render();
    renderCart();
    updatePay();
  } catch (e) {
    console.error(e);
    $('productsGrid').innerHTML = '<p>সাইটের তথ্য লোড করা যায়নি। পেজটি আবার চালু করুন।</p>';
  }
}

function render() {
  const s = store.settings;
  const map = {
    announcement: 'announcement', heroTitle: 'hero_title', heroSub: 'hero_subtitle',
    supportPhone: 'support_phone', offerBadge: 'offer_badge', offerTitle: 'offer_title',
    offerText: 'offer_text', footerText: 'footer_text'
  };
  for (const [id, key] of Object.entries(map)) $(id).textContent = s[key] || '';
  $('heroBtn').textContent = (s.hero_button_text || 'এখনই শপ করুন') + ' →';
  $('heroBtn').href = s.hero_button_link || '#products';
  if (s.hero_image) $('heroImage').src = s.hero_image;
  for (const [id, key] of [['messenger', 'messenger_url'], ['whatsapp', 'whatsapp_url'], ['facebook', 'facebook_url']]) {
    $(id).href = s[key] || '#';
  }
  showProducts('সব');
}

function showProducts(category) {
  const list = category === 'সব' ? store.products : store.products.filter(p => p.category_bn === category);
  $('productsGrid').innerHTML = list.map(p => {
    const imgs = getImages(p);
    const stock = Math.max(0, Number(p.stock) || 0);
    return `<article class="product ${stock === 0 ? 'soldOut' : ''}">
      ${p.badge_bn ? `<span class="badge">${escapeHtml(p.badge_bn)}</span>` : ''}
      <button class="pic productPic" type="button" data-view-id="${p.id}" aria-label="${escapeAttr(p.name_bn)} এর ছবি দেখুন">
        ${imgs.length ? `<img src="${escapeAttr(imgs[0])}" alt="${escapeAttr(p.name_bn)}">${imgs.length > 1 ? `<span class="photoCount">${imgs.length}টি ছবি</span>` : ''}` : '⌚'}
        ${stock === 0 ? '<span class="stockOut">স্টক আউট</span>' : ''}
      </button>
      <div class="info">
        <div class="cat">${escapeHtml(p.category_bn)}</div>
        <h3>${escapeHtml(p.name_bn)}</h3>
        <div class="price">৳${Number(p.price).toLocaleString('bn-BD')}${p.compare_price ? ` <span class="compare">৳${Number(p.compare_price).toLocaleString('bn-BD')}</span>` : ''}</div>
        <small class="stockText">${stock > 0 ? `স্টকে আছে: ${stock}টি` : 'স্টক আউট'}</small>
        <button class="add" type="button" data-add-id="${p.id}" ${stock === 0 ? 'disabled' : ''}>${stock > 0 ? 'কার্টে যোগ করুন' : 'স্টক আউট'}</button>
      </div>
    </article>`;
  }).join('');
}

function getImages(p) {
  if (Array.isArray(p.images) && p.images.length) return p.images.map(x => x.path).filter(Boolean);
  return p.image_path ? [p.image_path] : [];
}

let galleryProduct = null, galleryIndex = 0;
function openGallery(id) {
  const p = store.products.find(x => x.id === id); if (!p) return;
  const imgs = getImages(p); if (!imgs.length) return;
  galleryProduct = p; galleryIndex = 0; renderGallery();
  $('gallery').classList.add('show'); $('gallery').setAttribute('aria-hidden','false');
}
function renderGallery() {
  if (!galleryProduct) return;
  const imgs = getImages(galleryProduct);
  $('galleryImage').src = imgs[galleryIndex];
  $('galleryImage').alt = galleryProduct.name_bn;
  $('galleryTitle').textContent = galleryProduct.name_bn;
  $('galleryPrev').disabled = imgs.length < 2;
  $('galleryNext').disabled = imgs.length < 2;
  $('galleryThumbs').innerHTML = imgs.map((src,i)=>`<button type="button" class="galleryThumb ${i===galleryIndex?'active':''}" data-gallery-index="${i}"><img src="${escapeAttr(src)}" alt="ছবি ${i+1}"></button>`).join('');
}
function closeGallery() { $('gallery').classList.remove('show'); $('gallery').setAttribute('aria-hidden','true'); galleryProduct=null; }
function galleryMove(delta) { if (!galleryProduct) return; const n=getImages(galleryProduct).length; galleryIndex=(galleryIndex+delta+n)%n; renderGallery(); }

function escapeHtml(s) {
  return String(s ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}
function escapeAttr(s) { return escapeHtml(s); }

function add(id) {
  const p = store.products.find(x => x.id === id);
  const stock = Number(p?.stock) || 0;
  if (!p || stock <= 0) return alert('এই পণ্যটি এখন স্টক আউট।');
  const x = cart.find(x => x.id === id);
  if (x) {
    if (x.qty >= stock) return alert(`এই পণ্যের সর্বোচ্চ ${stock}টি স্টকে আছে।`);
    x.qty++;
  } else cart.push({ id, qty: 1 });
  localStorage.setItem('eb_cart', JSON.stringify(cart));
  renderCart();
  openCart();
}

function renderCart() {
  const items = cart.map(c => {
    const p = store?.products.find(x => x.id === c.id);
    return p ? { ...p, qty: c.qty } : null;
  }).filter(Boolean);
  $('cartCount').textContent = items.reduce((s, x) => s + x.qty, 0).toLocaleString('bn-BD');
  $('cartItems').innerHTML = items.length ? items.map(x => `
    <div class="cartRow">
      <span>${escapeHtml(x.name_bn)}<br>৳${(x.price * x.qty).toLocaleString('bn-BD')} × ${x.qty}</span>
      <button class="remove" type="button" data-remove-id="${x.id}">বাদ দিন</button>
    </div>`).join('') : '<p style="color:#888">কার্টে কোনো পণ্য নেই।</p>';
  $('cartTotal').textContent = items.reduce((s, x) => s + x.price * x.qty, 0).toLocaleString('bn-BD');
}

function removeItem(id) {
  cart = cart.filter(x => x.id !== id);
  localStorage.setItem('eb_cart', JSON.stringify(cart));
  renderCart();
}
function openCart() { $('drawer').classList.add('open'); $('shade').classList.add('show'); }
function closeCart() { $('drawer').classList.remove('open'); $('shade').classList.remove('show'); }

$('cartBtn').onclick = openCart;
$('closeCart').onclick = closeCart;
$('shade').onclick = closeCart;
$('menu').onclick = () => $('nav').classList.toggle('open');

$('productsGrid').addEventListener('click', (e) => {
  const addButton = e.target.closest('[data-add-id]');
  if (addButton) add(Number(addButton.dataset.addId));
});

$('cartItems').addEventListener('click', (e) => {
  const removeButton = e.target.closest('[data-remove-id]');
  if (removeButton) removeItem(Number(removeButton.dataset.removeId));
});

$('productsGrid').addEventListener('click', (e) => { const v=e.target.closest('[data-view-id]'); if(v) openGallery(Number(v.dataset.viewId)); });
$('galleryClose').onclick = closeGallery;
$('gallery').addEventListener('click', e => { if(e.target === $('gallery')) closeGallery(); const t=e.target.closest('[data-gallery-index]'); if(t){galleryIndex=Number(t.dataset.galleryIndex);renderGallery();} });
$('galleryPrev').onclick = () => galleryMove(-1);
$('galleryNext').onclick = () => galleryMove(1);
document.addEventListener('keydown', e => { if(!$('gallery').classList.contains('show')) return; if(e.key==='Escape') closeGallery(); if(e.key==='ArrowLeft') galleryMove(-1); if(e.key==='ArrowRight') galleryMove(1); });

document.querySelectorAll('.filters button').forEach(b => b.onclick = () => {
  document.querySelectorAll('.filters button').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  showProducts(b.dataset.cat);
});

$('checkout').onclick = () => {
  if (!cart.length) return alert('আপনার কার্ট খালি।');
  $('modal').classList.add('show');
  updatePay();
};
$('closeModal').onclick = () => $('modal').classList.remove('show');
document.querySelectorAll('input[name=pay]').forEach(x => x.onchange = updatePay);

function updatePay() {
  if (!store) return;
  const selected = document.querySelector('input[name=pay]:checked');
  if (!selected) return;
  const m = selected.value, s = store.settings;
  if (m === 'bkash') {
    $('payInfo').innerHTML = `bKash নম্বর: <b>${escapeHtml(s.bkash_number || 'সেট করা হয়নি')}</b><br>টাকা পাঠিয়ে Transaction ID দিন।`;
    $('trx').style.display = 'block'; $('trx').required = true;
  } else if (m === 'nagad') {
    $('payInfo').innerHTML = `Nagad নম্বর: <b>${escapeHtml(s.nagad_number || 'সেট করা হয়নি')}</b><br>টাকা পাঠিয়ে Transaction ID দিন।`;
    $('trx').style.display = 'block'; $('trx').required = true;
  } else {
    $('payInfo').textContent = 'ক্যাশ অন ডেলিভারি নির্বাচন করা হয়েছে।';
    $('trx').style.display = 'none'; $('trx').required = false; $('trx').value = '';
  }
}

$('orderForm').onsubmit = async (e) => {
  e.preventDefault();
  try {
    const c = (await csrf()).token;
    const payment_method = document.querySelector('input[name=pay]:checked').value;
    const d = await api('/api/orders', {
      method: 'POST',
      headers: { 'x-csrf-token': c },
      body: JSON.stringify({
        customer_name: $('name').value,
        phone: $('phone').value,
        address: $('address').value,
        note: $('note').value,
        payment_method,
        transaction_id: $('trx').value,
        items: cart
      })
    });
    $('msg').textContent = `অর্ডার সফল! নম্বর: ${d.order_code}`;
    cart = [];
    localStorage.removeItem('eb_cart');
    renderCart();
    e.target.reset();
    updatePay();
    store = await api('/api/store');
    render();
    renderCart();
  } catch (x) {
    $('msg').textContent = x.message;
  }
};

init();
