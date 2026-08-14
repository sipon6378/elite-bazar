let csrfToken = '', settings = {}, products = [];
const $ = (x) => document.getElementById(x);

async function api(u, o = {}) {
  const r = await fetch(u, { ...o, headers: { 'Content-Type': 'application/json', ...(o.headers || {}) } });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw Error(d.error || 'সমস্যা হয়েছে');
  return d;
}
async function csrf() { csrfToken = (await (await fetch('/api/csrf')).json()).token; }

async function load() {
  settings = await api('/api/admin/settings');
  products = await api('/api/admin/products');
  renderSettings(); renderProducts(); renderPayment(); await renderOrders();
}
async function init() {
  try {
    await api('/api/admin/me');
    $('login').hidden = true; $('app').hidden = false; await load();
  } catch {}
}

$('loginForm').onsubmit = async (e) => {
  e.preventDefault();
  try {
    await csrf();
    await api('/api/admin/login', { method: 'POST', headers: { 'x-csrf-token': csrfToken }, body: JSON.stringify({ email: $('email').value, password: $('password').value }) });
    $('login').hidden = true; $('app').hidden = false; await load();
  } catch (x) { $('loginMsg').textContent = x.message; }
};

$('logout').onclick = async () => { await csrf(); await api('/api/admin/logout', { method: 'POST', headers: { 'x-csrf-token': csrfToken } }); location.reload(); };

document.querySelectorAll('.tabs button').forEach(b => b.onclick = () => {
  document.querySelectorAll('.tabs button').forEach(x => x.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
  b.classList.add('active'); $(b.dataset.tab).classList.add('active');
});

function esc(s) { return String(s || '').replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;'); }

function renderSettings() {
  const labels = {
    site_name: 'সাইটের নাম', tagline: 'ট্যাগলাইন', announcement: 'উপরের ঘোষণা', hero_title: 'হিরো শিরোনাম',
    hero_subtitle: 'হিরো বর্ণনা', hero_button_text: 'হিরো বাটনের লেখা', hero_button_link: 'হিরো বাটনের লিংক',
    hero_image: 'হিরো ছবির URL', offer_badge: 'অফার ব্যাজ', offer_title: 'অফার শিরোনাম', offer_text: 'অফার লেখা',
    support_phone: 'সাপোর্ট ফোন', facebook_url: 'Facebook লিংক', messenger_url: 'Messenger লিংক',
    whatsapp_url: 'WhatsApp লিংক', footer_text: 'Footer লেখা'
  };
  $('siteForm').innerHTML = Object.entries(labels).map(([k, v]) => `<input data-key="${k}" placeholder="${v}" value="${esc(settings[k])}">`).join('');
}

$('saveSite').onclick = async () => {
  try {
    await csrf(); const b = {};
    document.querySelectorAll('#siteForm input').forEach(i => b[i.dataset.key] = i.value);
    await api('/api/admin/settings', { method: 'POST', headers: { 'x-csrf-token': csrfToken }, body: JSON.stringify(b) });
    $('siteMsg').textContent = 'সাইট আপডেট হয়েছে।';
    settings = await api('/api/admin/settings'); renderPayment();
  } catch (x) { $('siteMsg').textContent = x.message; }
};

$('savePay').onclick = async () => {
  try {
    await csrf();
    await api('/api/admin/settings', { method: 'POST', headers: { 'x-csrf-token': csrfToken }, body: JSON.stringify({ bkash_number: $('bkash').value, nagad_number: $('nagad').value }) });
    settings = await api('/api/admin/settings');
    $('payMsg').textContent = 'পেমেন্ট নম্বর আপডেট হয়েছে।';
  } catch (x) { $('payMsg').textContent = x.message; }
};
function renderPayment() { $('bkash').value = settings.bkash_number || ''; $('nagad').value = settings.nagad_number || ''; }

$('productForm').onsubmit = async (e) => {
  e.preventDefault();
  try {
    await csrf();
    const d = await api('/api/admin/products', { method: 'POST', headers: { 'x-csrf-token': csrfToken }, body: JSON.stringify({
      name_bn: $('pName').value, category_bn: $('pCat').value, price: $('pPrice').value, compare_price: $('pCompare').value,
      badge_bn: $('pBadge').value, stock: $('pStock').value, image_path: $('pImage').value, description_bn: $('pDesc').value
    }) });
    const files = Array.from($('pImages').files || []);
    if (files.length) {
      if (files.length > 5) throw Error('সর্বোচ্চ ৫টি ছবি নির্বাচন করুন।');
      const fd = new FormData(); files.forEach(f => fd.append('images', f));
      const r = await fetch('/api/admin/products/' + d.id + '/images', { method:'POST', headers:{'x-csrf-token':csrfToken}, body:fd });
      const x = await r.json().catch(()=>({})); if(!r.ok) throw Error(x.error || 'ছবি আপলোড করা যায়নি।');
    }
    e.target.reset(); $('pPreview').innerHTML=''; $('productMsg').textContent = 'পণ্য ও ছবি যোগ হয়েছে.';
    products = await api('/api/admin/products'); renderProducts();
  } catch (x) { $('productMsg').textContent = x.message; }
};

$('pImages').addEventListener('change', () => {
  const files=Array.from($('pImages').files||[]); $('pPreview').innerHTML='';
  files.slice(0,5).forEach(f=>{const img=document.createElement('img');img.alt=f.name;img.src=URL.createObjectURL(f);$('pPreview').appendChild(img);});
});

function renderProducts() {
  $('productList').innerHTML = products.length ? products.map(p => `
    <div class="adminProduct">
      <div><b>${esc(p.name_bn)}</b><br><small>${esc(p.category_bn)} • ৳${Number(p.price).toLocaleString('bn-BD')} • স্টক ${p.stock}</small>
      <div class="uploadPreview">${(p.images||[]).map(im=>`<div style="position:relative"><img src="${esc(im.path)}" alt=""><button type="button" data-image-delete-id="${im.id}" style="position:absolute;right:2px;top:2px">✕</button></div>`).join('')}</div></div>
      <div class="actions">
        <button type="button" data-edit-id="${p.id}">দাম/স্টক সম্পাদনা</button>
        <button type="button" data-add-images-id="${p.id}">আরও ছবি</button>
        <button type="button" class="danger" data-delete-id="${p.id}">মুছুন</button>
      </div>
    </div>`).join('') : '<p style="color:#888">কোনো পণ্য নেই।</p>';
}

$('productList').addEventListener('click', async (e) => {
  const edit = e.target.closest('[data-edit-id]');
  const del = e.target.closest('[data-delete-id]');
  const addImages = e.target.closest('[data-add-images-id]');
  const delImage = e.target.closest('[data-image-delete-id]');
  if (edit) await editP(Number(edit.dataset.editId));
  if (del) await delP(Number(del.dataset.deleteId));
  if (addImages) await addImagesP(Number(addImages.dataset.addImagesId));
  if (delImage) await delImageP(Number(delImage.dataset.imageDeleteId));
});

async function addImagesP(id) {
  const input=document.createElement('input'); input.type='file'; input.accept='image/jpeg,image/png,image/webp'; input.multiple=true;
  input.onchange=async()=>{const files=Array.from(input.files||[]); if(!files.length)return; if(files.length>5) return alert('একবারে সর্বোচ্চ ৫টি ছবি নির্বাচন করুন।'); try{await csrf();const fd=new FormData();files.forEach(f=>fd.append('images',f));const r=await fetch('/api/admin/products/'+id+'/images',{method:'POST',headers:{'x-csrf-token':csrfToken},body:fd});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'ছবি আপলোড করা যায়নি।');products=await api('/api/admin/products');renderProducts();}catch(x){alert(x.message)}};
  input.click();
}
async function delImageP(id) { if(!confirm('এই ছবিটি মুছে ফেলবেন?'))return; try{await csrf();await api('/api/admin/product-images/'+id,{method:'DELETE',headers:{'x-csrf-token':csrfToken}});products=await api('/api/admin/products');renderProducts();}catch(x){alert(x.message)} }

async function editP(id) {
  const p = products.find(x => x.id === id); if (!p) return;
  const name = prompt('পণ্যের নাম', p.name_bn), price = prompt('দাম', p.price), stock = prompt('স্টক', p.stock);
  if (name === null) return;
  const priceNumber = Number(price), stockNumber = Number(stock);
  if (!Number.isFinite(priceNumber) || !Number.isFinite(stockNumber) || priceNumber < 0 || stockNumber < 0) return alert('দাম ও স্টক সঠিক সংখ্যা দিন।');
  try {
    await csrf();
    await api('/api/admin/products/' + id, { method: 'PUT', headers: { 'x-csrf-token': csrfToken }, body: JSON.stringify({ name_bn: name, price: priceNumber, stock: stockNumber }) });
    products = await api('/api/admin/products'); renderProducts();
  } catch (x) { alert(x.message); }
}

async function delP(id) {
  if (!confirm('পণ্যটি মুছে ফেলবেন?')) return;
  try {
    await csrf();
    await api('/api/admin/products/' + id, { method: 'DELETE', headers: { 'x-csrf-token': csrfToken } });
    products = await api('/api/admin/products'); renderProducts();
  } catch (x) { alert(x.message); }
}

async function renderOrders() {
  try {
    const a = await api('/api/orders');
    $('orderList').innerHTML = a.length ? a.map(o => `
      <div class="adminOrder">
        <b>${esc(o.order_code)}</b>
        <p>👤 ${esc(o.customer_name)}<br>📱 ${esc(o.phone)}<br>🏠 ${esc(o.address)}</p>
        <p>পেমেন্ট: <b>${esc(o.payment_method)}</b><br>Transaction ID: <b>${esc(o.transaction_id || 'নেই')}</b><br>পেমেন্ট: <span class="status">${esc(o.payment_status)}</span><br>অর্ডার: <span class="status">${esc(o.order_status)}</span><br>মোট: ৳${Number(o.total).toLocaleString('bn-BD')}</p>
        <div class="actions">
          <button type="button" data-order-id="${o.id}" data-status-key="payment_status" data-status-value="confirmed">পেমেন্ট নিশ্চিত</button>
          <button type="button" data-order-id="${o.id}" data-status-key="payment_status" data-status-value="rejected">পেমেন্ট বাতিল</button>
          <button type="button" data-order-id="${o.id}" data-status-key="order_status" data-status-value="confirmed">অর্ডার নিশ্চিত</button>
          <button type="button" data-order-id="${o.id}" data-status-key="order_status" data-status-value="shipped">পাঠানো হয়েছে</button>
          <button type="button" data-order-id="${o.id}" data-status-key="order_status" data-status-value="completed">সম্পন্ন</button><button type="button" class="danger" data-order-id="${o.id}" data-status-key="order_status" data-status-value="cancelled">অর্ডার বাতিল</button>
        </div>
      </div>`).join('') : '<p style="color:#888">কোনো অর্ডার নেই।</p>';
  } catch (x) { $('orderList').innerHTML = `<p>${esc(x.message)}</p>`; }
}

$('orderList').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-order-id]'); if (!b) return;
  await orderSt(Number(b.dataset.orderId), b.dataset.statusKey, b.dataset.statusValue);
});

async function orderSt(id, k, v) {
  try {
    await csrf();
    await api('/api/admin/orders/' + id, { method: 'PATCH', headers: { 'x-csrf-token': csrfToken }, body: JSON.stringify({ [k]: v }) });
    await renderOrders();
  } catch (x) { alert(x.message); }
}

init();
