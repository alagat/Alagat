// api/translate.js
// ترجمة عنوان/وصف طلب للإنجليزية مع تخزين مؤقت (كاش) بقاعدة البيانات
// كل طلب يُترجم مرة واحدة فقط طوال عمره — أي طلب لاحق لنفس المعرّف يرجع من الكاش مباشرة

const SUPABASE_URL = 'https://ohkgmzwpzijxcttqytrq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9oa2dtendwemlqeGN0dHF5dHJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExNzA1ODgsImV4cCI6MjA5Njc0NjU4OH0.Qx2paUh-d7LTTHFSljt7cnoenOdzOdcno9PGobtRb_g';
// مفتاح Service Role — يُضاف كمتغيّر بيئة بـ Vercel (Settings → Environment Variables) باسم
// SUPABASE_SERVICE_ROLE_KEY، تجيبه من Supabase: Project Settings → API → service_role key
// بدونه: الترجمة تشتغل لكن بدون حفظ بالكاش (تترجم من جديد كل مرة)
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || null;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST' && req.method !== 'GET') { res.status(405).json({ error: 'Method not allowed' }); return; }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const requestId = body.requestId || (req.query && req.query.requestId);
    if (!requestId) { res.status(400).json({ error: 'requestId required' }); return; }

    // 1) اقرأ الصف — لو الترجمة موجودة بالكاش أصلاً، رجّعها فوراً بدون أي استدعاء خارجي
    const readRes = await fetch(
      `${SUPABASE_URL}/rest/v1/requests?id=eq.${encodeURIComponent(requestId)}&select=title,description,title_en,description_en`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
    );
    const rows = await readRes.json();
    if (!Array.isArray(rows) || rows.length === 0) { res.status(404).json({ error: 'not found' }); return; }
    const row = rows[0];

    if (row.title_en && row.description_en) {
      res.status(200).json({ title_en: row.title_en, description_en: row.description_en, cached: true });
      return;
    }

    // 2) ترجم العنوان والوصف بالتوازي
    const [title_en, description_en] = await Promise.all([
      translateText(row.title || ''),
      translateText(row.description || '')
    ]);

    // 3) احفظ بالكاش (لو متوفر مفتاح service role) — لو غير متوفر، نرجّع الترجمة بدون حفظ
    var cacheDebug = null;
    if (SERVICE_KEY) {
      try {
        const writeRes = await fetch(`${SUPABASE_URL}/rest/v1/requests?id=eq.${encodeURIComponent(requestId)}`, {
          method: 'PATCH',
          headers: {
            apikey: SERVICE_KEY,
            Authorization: `Bearer ${SERVICE_KEY}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal'
          },
          body: JSON.stringify({ title_en, description_en })
        });
        if (!writeRes.ok) {
          const errBody = await writeRes.text();
          cacheDebug = { status: writeRes.status, body: errBody };
          console.error('translate cache write failed with status:', writeRes.status, errBody);
        } else {
          const contentRange = writeRes.headers.get('content-range');
          // نتحقق فوراً هل فعلاً انحفظت القيمة بقراءة الصف من جديد
          const verifyRes = await fetch(
            `${SUPABASE_URL}/rest/v1/requests?id=eq.${encodeURIComponent(requestId)}&select=title_en,description_en`,
            { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
          );
          const verifyRows = await verifyRes.json();
          cacheDebug = {
            writeStatus: writeRes.status,
            contentRange: contentRange,
            afterWrite: verifyRows && verifyRows[0]
          };
        }
      } catch (cacheErr) {
        cacheDebug = { error: String(cacheErr && cacheErr.message) };
        console.error('translate cache write failed:', cacheErr);
      }
    } else {
      cacheDebug = { note: 'SERVICE_KEY not set' };
    }

    res.status(200).json({ title_en, description_en, cached: false, _debug_cache: cacheDebug });
  } catch (e) {
    console.error('translate handler error:', e);
    res.status(500).json({ error: 'translation failed' });
  }
};

// يحاول MyMemory أولاً (حصة مجانية معلنة رسمياً)، ولو فشل ينتقل لـ Google غير الرسمي كبديل
async function translateText(text) {
  if (!text || !text.trim()) return '';
  try {
    return await translateWithMyMemory(text);
  } catch (e1) {
    console.error('MyMemory failed, falling back:', e1 && e1.message);
    try {
      return await translateWithGoogleUnofficial(text);
    } catch (e2) {
      console.error('Google fallback failed too:', e2 && e2.message);
      throw new Error('all translation providers failed');
    }
  }
}

async function translateWithMyMemory(text) {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=ar|en`;
  const r = await fetch(url);
  const d = await r.json();
  const translated = d && d.responseData && d.responseData.translatedText;
  if (!translated || (d.responseStatus && d.responseStatus !== 200)) throw new Error('MyMemory returned no translation');
  return translated;
}

async function translateWithGoogleUnofficial(text) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ar&tl=en&dt=t&q=${encodeURIComponent(text)}`;
  const r = await fetch(url);
  const d = await r.json();
  if (!Array.isArray(d) || !Array.isArray(d[0])) throw new Error('Google unofficial returned unexpected shape');
  return d[0].map(function (chunk) { return chunk[0]; }).join('');
}
