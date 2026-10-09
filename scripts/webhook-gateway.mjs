import http from 'node:http';
const allowed=new Set(['/api/webhooks/shopify','/api/webhooks/stripe']);
const landing='<!doctype html><html lang="az"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Resolve — Shopify connection</title><style>body{font:16px system-ui;color:#172033;background:#f6f7fb;margin:0;padding:10vh 24px}main{max-width:600px;margin:auto;background:white;border:1px solid #e4e7ef;border-radius:16px;padding:40px}h1{font-size:36px;letter-spacing:-1px}p{line-height:1.8;color:#65718b}small{color:#969eb0}.brand{color:#4f46e5;font-weight:700}</style><main><span class="brand">Resolve</span><h1>Shopify bağlantısı</h1><p>Resolve müştəri hadisələrini qəbul edən və uyğun dəstək addımını hazırlayan tətbiqdir.</p><p>Bu ünvan test inteqrasiyası üçündür. İdarəetmə paneli ayrıca, lokal iş sahəsində açılır. Bağlantı konfiqurasiyası hələ tamamlanır.</p><small>Test mühiti · Müştəri məlumatları bu səhifədə göstərilmir.</small></main></html>';
const server=http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','no-store');res.setHeader('Content-Security-Policy',"default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'");
 const path=(req.url||'').split('?')[0];
 if(req.method==='GET'&&path==='/'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});return res.end(landing)}
 if(req.method!=='POST'||!allowed.has(path)){res.writeHead(404);return res.end('Not found')}
 if(Number(req.headers['content-length']||0)>1000000){res.writeHead(413);return res.end('Payload too large')}
 let size=0;const chunks=[];try{for await(const chunk of req){size+=chunk.length;if(size>1000000){res.writeHead(413);res.end('Payload too large');return}chunks.push(chunk)}
 const headers={'content-type':'application/json'};for(const name of ['stripe-signature','x-shopify-hmac-sha256','x-shopify-shop-domain','x-shopify-webhook-id','x-shopify-topic']){if(typeof req.headers[name]==='string')headers[name]=req.headers[name]}
 const upstream=await fetch('http://127.0.0.1:5173'+path,{method:'POST',headers,body:Buffer.concat(chunks),redirect:'error',signal:AbortSignal.timeout(4500)});
 // Never forward customer bodies, errors or framework diagnostics through the public gateway.
 res.writeHead(upstream.status,{'Content-Type':'application/json'});res.end(JSON.stringify({received:upstream.ok}));
 }catch{res.writeHead(503);res.end('Service unavailable')}
});
server.requestTimeout=10000;server.headersTimeout=10000;
server.listen(8789,'127.0.0.1',()=>console.log('Restricted webhook gateway: http://127.0.0.1:8789'));
