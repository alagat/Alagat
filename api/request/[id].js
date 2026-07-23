const SUPA_URL = 'https://ohkgmzwpzijxcttqytrq.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9oa2dtendwemlqeGN0dHF5dHJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExNzA1ODgsImV4cCI6MjA5Njc0NjU4OH0.Qx2paUh-d7LTTHFSljt7cnoenOdzOdcno9PGobtRb_g';
const SITE = 'https://alagat.com';

const COLUMNS = ['id','title','description','category','budget_text','duration','work_type','city','is_urgent','media_urls','created_at','ad_number','offers_count','status'].join(',');

const D = '[0-9\\u0660-\\u0669\\u06F0-\\u06F9]';
const SEP = '[\\s\\-\\.\\u060C()\\u2013\\u2014]*';
const RE_URL = /(?:https?:\/\/|www\.)[^\s<]+/gi;
const RE_EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const RE_PHONE = new RegExp('(?:\\+|00)?(?:' + D + SEP + '){9,16}', 'g');
const RE_HANDLE = /@[A-Za-z0-9_]{3,}/g;
const MASK = '[تم إخفاء وسيلة التواصل]';

function stripContacts(text){
  return String(text == null ? '' : text)
    .replace(RE_URL, MASK).replace(RE_EMAIL, MASK)
    .replace(RE_PHONE, MASK).replace(RE_HANDLE, MASK);
}
function esc(s){
  return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  });
}
function oneLine(s, max){
  const t = String(s == null ? '' : s).replace(/\s+/g,' ').trim();
  return t.length > max ? t.slice(0, max-1).trim() + '…' : t;
}
function jsonLd(obj){ return JSON.stringify(obj).replace(/</g,'\\u003c'); }
function arDate(iso){
  try{ return new Intl.DateTimeFormat('ar-SA',{year:'numeric',month:'long',day:'numeric'}).format(new Date(iso)); }
  catch(e){ return ''; }
}
function firstImage(media){
  if(!Array.isArray(media) || !media.length) return null;
  const shots = media.map(function(m){ return typeof m === 'string' ? {url:m,type:'image'} : m; })
    .filter(function(m){ return m && m.url && m.type !== 'video'; });
  return shots.length ? shots[0].url : null;
}

const HEAD_COMMON = '<meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<link rel="preconnect" href="https://fonts.googleapis.com">'+
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'+
  '<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;800&display=swap" rel="stylesheet">';

const CSS = `
*{box-sizing:border-box}
body{margin:0;font-family:'Cairo',system-ui,sans-serif;background:#faf8f6;color:#1d1a1d;line-height:1.75;padding:28px 18px 64px}
main{max-width:720px;margin:0 auto}
.brand{display:inline-block;font-weight:800;font-size:1.05rem;text-decoration:none;background:linear-gradient(135deg,#c9a227,#7f1d3d);-webkit-background-clip:text;background-clip:text;color:transparent;margin-bottom:26px}
h1{font-size:1.55rem;font-weight:800;line-height:1.45;margin:0 0 14px}
.facts{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 22px;padding:0;list-style:none}
.facts li{font-size:.8rem;background:#fff;border:1px solid #e7e0da;border-radius:999px;padding:5px 13px;color:#4a4348}
.facts li.budget{border-color:#c9a227;color:#7a6011;font-weight:600}
.desc{font-size:1rem;white-space:pre-wrap;margin:0 0 26px}
figure{margin:0 0 26px}
figure img{width:100%;border-radius:14px;display:block;margin-bottom:10px;border:1px solid #e7e0da}
.cta{display:inline-block;background:linear-gradient(135deg,#c9a227,#7f1d3d);color:#fff;text-decoration:none;font-weight:700;padding:13px 30px;border-radius:11px}
.note{font-size:.8rem;color:#6d6469;margin-top:26px;border-top:1px solid #e7e0da;padding-top:16px}
:focus-visible{outline:2px solid #7f1d3d;outline-offset:3px}
`;

function errorPage(title, message){
  return '<!doctype html><html lang="ar" dir="rtl"><head>' + HEAD_COMMON +
    '<meta name="robots" content="noindex">' +
    '<title>' + esc(title) + ' | علاقات</title><style>' + CSS + '</style></head><body><main>' +
    '<a class="brand" href="' + SITE + '/">علاقات</a>' +
    '<h1>' + esc(title) + '</h1>' +
    '<p class="desc">' + esc(message) + '</p>' +
    '<a class="cta" href="' + SITE + '/">تصفّح الطلبات المتاحة</a>' +
    '</main></body></html>';
}

function requestPage(r){
  const title = stripContacts(r.title || 'طلب خدمة');
  const desc = stripContacts(r.description || '');
  const metaDesc = oneLine(desc || title, 155);
  const canonical = SITE + '/request/' + r.ad_number;
  const img = firstImage(r.media_urls);
  const indexable = r.status === 'open';

  const facts = [];
  if(r.category) facts.push({txt:r.category});
  if(r.city) facts.push({txt:'📍 ' + r.city});
  if(r.work_type) facts.push({txt:r.work_type});
  if(r.duration) facts.push({txt:'⏱ ' + r.duration});
  if(r.budget_text) facts.push({txt:'الميزانية: ' + r.budget_text, cls:'budget'});
  if(r.is_urgent) facts.push({txt:'🔥 عاجل'});
  if(r.created_at) facts.push({txt:arDate(r.created_at)});
  if(r.ad_number) facts.push({txt:'رقم الإعلان: ' + r.ad_number});
  const offers = Number(r.offers_count || 0);
  facts.push({txt: offers > 0 ? offers + ' عرض مقدَّم' : 'لا توجد عروض بعد'});

  const ld = {
    '@context':'https://schema.org','@type':'Service',
    name: oneLine(title,110), description: oneLine(desc,300),
    serviceType: r.category || undefined, areaServed: r.city || undefined,
    url: canonical,
    provider:{'@type':'Organization', name:'علاقات', url:SITE}
  };

  return '<!doctype html><html lang="ar" dir="rtl"><head>' + HEAD_COMMON +
    '<title>' + esc(oneLine(title,60)) + ' | علاقات</title>' +
    '<meta name="description" content="' + esc(metaDesc) + '">' +
    '<link rel="canonical" href="' + esc(canonical) + '">' +
    (indexable ? '' : '<meta name="robots" content="noindex,follow">') +
    '<meta property="og:type" content="article">' +
    '<meta property="og:site_name" content="علاقات">' +
    '<meta property="og:locale" content="ar_SA">' +
    '<meta property="og:title" content="' + esc(oneLine(title,60)) + '">' +
    '<meta property="og:description" content="' + esc(metaDesc) + '">' +
    '<meta property="og:url" content="' + esc(canonical) + '">' +
    (img ? '<meta property="og:image" content="' + esc(img) + '">' : '') +
    '<meta name="twitter:card" content="' + (img ? 'summary_large_image' : 'summary') + '">' +
    '<script type="application/ld+json">' + jsonLd(ld) + '</script>' +
    '<style>' + CSS + '</style></head><body><main>' +
    '<a class="brand" href="' + SITE + '/">علاقات</a>' +
    '<h1>' + esc(title) + '</h1>' +
    '<ul class="facts">' +
      facts.map(function(f){
        return '<li' + (f.cls ? ' class="' + f.cls + '"' : '') + '>' + esc(f.txt) + '</li>';
      }).join('') +
    '</ul>' +
    (desc ? '<p class="desc">' + esc(desc) + '</p>' : '') +
    (img ? '<figure><img src="' + esc(img) + '" alt="' + esc(oneLine(title,90)) + '" loading="lazy"></figure>' : '') +
    '<a class="cta" href="' + SITE + '/">قدّم عرضك على هذا الطلب</a>' +
    '<p class="note">تُعرض تفاصيل التواصل داخل منصة علاقات بعد تسجيل الدخول.</p>' +
    '</main></body></html>';
}

module.exports = async function handler(req, res){
  res.setHeader('Content-Type','text/html; charset=utf-8');

  const id = String(req.query.id || '').trim();
  if(!/^\d{1,12}$/.test(id)){
    res.setHeader('Cache-Control','public, s-maxage=3600');
    return res.status(404).send(errorPage('طلب غير موجود','الرابط الذي فتحته غير صحيح.'));
  }

  let rows;
  try{
    const url = SUPA_URL + '/rest/v1/requests?ad_number=eq.' + id + '&select=' + encodeURIComponent(COLUMNS) + '&limit=1';
    const resp = await fetch(url, {
      headers:{ apikey:SUPA_KEY, Authorization:'Bearer ' + SUPA_KEY, Accept:'application/json' }
    });
    if(!resp.ok) throw new Error('supabase ' + resp.status);
    rows = await resp.json();
  }catch(err){
    res.setHeader('Cache-Control','no-store');
    return res.status(503).send(errorPage('تعذّر تحميل الطلب','حدث خطأ مؤقت. حاول تحديث الصفحة بعد قليل.'));
  }

  if(!Array.isArray(rows) || rows.length === 0){
    res.setHeader('Cache-Control','public, s-maxage=3600');
    return res.status(410).send(errorPage('هذا الطلب لم يعد متاحًا','قد يكون صاحبه حذفه أو أُغلق.'));
  }

  res.setHeader('Cache-Control','public, s-maxage=600, stale-while-revalidate=86400');
  return res.status(200).send(requestPage(rows[0]));
}
