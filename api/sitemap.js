const SITE = 'https://alagat.com';
const SUPA_URL = process.env.SUPABASE_URL || 'https://ohkgmzwpzijxcttqytrq.supabase.co';
const SUPA_KEY = process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9oa2dtendwemlqeGN0dHF5dHJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExNzA1ODgsImV4cCI6MjA5Njc0NjU4OH0.Qx2paUh-d7LTTHFSljt7cnoenOdzOdcno9PGobtRb_g';

const PAGE = 1000;
const MAX_PAGES = 40;

async function fetchPage(offset) {
  const url = SUPA_URL + '/rest/v1/requests' +
    '?select=ad_number,created_at&status=in.(open,accepted)&order=created_at.desc' +
    '&limit=' + PAGE + '&offset=' + offset;
  const r = await fetch(url, { headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY } });
  if (!r.ok) throw new Error('supabase ' + r.status);
  return r.json();
}

module.exports = async (req, res) => {
  try {
    let rows = [];
    for (let p = 0; p < MAX_PAGES; p++) {
      const chunk = await fetchPage(p * PAGE);
      rows = rows.concat(chunk);
      if (chunk.length < PAGE) break;
    }
    const urls = ['  <url><loc>' + SITE + '/</loc></url>'];
    for (const r of rows) {
      const n = String(r.ad_number || '');
      if (!/^\d{1,12}$/.test(n)) continue;
      const d = r.created_at ? new Date(r.created_at) : null;
      const last = d && !isNaN(d) ? '<lastmod>' + d.toISOString().slice(0, 10) + '</lastmod>' : '';
      urls.push('  <url><loc>' + SITE + '/request/' + n + '</loc>' + last + '</url>');
    }
    const xml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls.join('\n') + '\n</urlset>\n';
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.status(200).send(xml);
  } catch (e) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.status(500).send('sitemap temporarily unavailable');
  }
};
