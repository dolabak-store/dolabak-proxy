// Mirror of the Dolabak store. Forwards every request to the main site and its database/admin API.
const http = require('http');
const UP = process.env.UPSTREAM || 'https://dolabak.pages.dev';
const SKIP = new Set(['host','connection','content-length','transfer-encoding','keep-alive','upgrade','x-forwarded-for','x-forwarded-proto','x-forwarded-host','x-forwarded-port','x-real-ip','forwarded','via','cf-connecting-ip','true-client-ip','x-render-routing','rndr-id','cdn-loop']);
http.createServer(async (req, res) => {
  try {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const body = Buffer.concat(chunks);
    const headers = {};
    for (const [k, v] of Object.entries(req.headers)) if (!SKIP.has(k)) headers[k] = v;
    delete headers['accept-encoding'];
    const r = await fetch(UP + req.url, {
      method: req.method, headers,
      body: ['GET', 'HEAD'].includes(req.method) || !body.length ? undefined : body,
      redirect: 'manual'
    });
    const out = {};
    r.headers.forEach((v, k) => {
      if (['content-encoding','content-length','transfer-encoding','connection','set-cookie'].includes(k)) return;
      out[k] = v;
    });
    if (out.location) out.location = out.location.replace(UP, '');
    const buf = Buffer.from(await r.arrayBuffer());
    out['content-length'] = buf.length;
    res.writeHead(r.status, out);
    res.end(req.method === 'HEAD' ? undefined : buf);
  } catch (e) {
    res.writeHead(502, { 'content-type': 'text/plain' });
    res.end('Bad gateway');
  }
}).listen(process.env.PORT || 8080, () => console.log('mirror up'));
