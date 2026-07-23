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
  return '<!doctype html><html lang="ar" di
