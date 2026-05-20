import 'dotenv/config';
import { createServer } from 'node:http';
import { runTick, type TickResult } from './index.js';
import { logAuditTrail } from './walrus.js';

/**
 * DEV HARNESS — not the product UI.
 *
 * @sigmundfreuud owns the real frontend. This is a throwaway local page so we
 * can eyeball that the wiring works: real odds in, real Walrus blob out.
 * No frameworks, no new deps (Node built-in http). Does NOT auto-poll —
 * the-odds-api free tier is ~500 calls/mo, so a tick only runs on button press.
 */

const PORT = Number(process.env.HARNESS_PORT ?? '8787');

let lastTick: TickResult | null = null;
let lastWalrusTest: { blobId: string; url?: string; ts: number } | null = null;

const PAGE = `<!doctype html>
<html><head><meta charset="utf-8"><title>I-Wallet agent — dev harness</title>
<style>
  body{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;background:#0b0e14;color:#cdd6f4;margin:0;padding:24px;line-height:1.5}
  h1{font-size:16px;margin:0 0 4px}
  .warn{color:#f9e2af;font-size:12px;margin:0 0 16px}
  button{font:inherit;background:#313244;color:#cdd6f4;border:1px solid #45475a;border-radius:6px;padding:8px 14px;cursor:pointer;margin-right:8px}
  button:hover{background:#45475a}
  table{border-collapse:collapse;width:100%;margin-top:16px;font-size:13px}
  th,td{border:1px solid #313244;padding:6px 10px;text-align:left}
  th{color:#89b4fa}
  a{color:#94e2d5}
  .note{color:#f9e2af;font-size:12px}
  .muted{color:#6c7086}
  section{margin-top:24px}
</style></head><body>
<h1>I-Wallet agent — dev harness</h1>
<p class="warn">⚠ NOT the product UI. @sigmundfreuud owns the real frontend. This is a local eyeball-the-wiring page only.</p>
<button onclick="tick()">Run tick (calls the-odds-api)</button>
<button onclick="walrusTest()">Write test Walrus blob</button>
<span id="status" class="muted"></span>
<div id="out"></div>
<script>
async function load(){const r=await fetch('/state');render(await r.json())}
async function tick(){st('running tick…');await fetch('/tick',{method:'POST'});st('');load()}
async function walrusTest(){st('writing blob…');await fetch('/walrus-test',{method:'POST'});st('');load()}
function st(s){document.getElementById('status').textContent=s}
function esc(s){return String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}
function render(s){
  let h='';
  if(s.walrusTest){const w=s.walrusTest;h+='<section><h1>Walrus test blob</h1><div>blobId: <code>'+esc(w.blobId)+'</code>'+(w.url?' — <a target="_blank" href="'+esc(w.url)+'">open</a>':'')+'</div></section>'}
  const t=s.lastTick;
  if(!t){h+='<p class="muted">no tick run yet</p>';document.getElementById('out').innerHTML=h;return}
  h+='<section><h1>Last tick — '+new Date(t.ts).toLocaleString()+'</h1>';
  h+='<div class="muted">'+t.events.length+' events · '+t.picks.length+' picks · '+t.bets.length+' bets</div>';
  if(t.picks.length){h+='<h1 style="margin-top:16px">Picks (Claude)</h1><table><tr><th>market</th><th>outcome</th><th>odds</th><th>stake</th><th>rationale</th></tr>';
    for(const p of t.picks){h+='<tr><td>'+esc(p.marketId)+'</td><td>'+esc(p.outcome)+'</td><td>'+p.odds+'</td><td>'+p.stake+'</td><td>'+esc(p.rationale)+'</td></tr>'}
    h+='</table>'}
  if(t.events.length){h+='<h1 style="margin-top:16px">Events</h1><table><tr><th>sport</th><th>home</th><th>away</th><th>home odds</th><th>away odds</th><th>draw</th></tr>';
    for(const e of t.events.slice(0,20)){h+='<tr><td>'+esc(e.sport)+'</td><td>'+esc(e.home)+'</td><td>'+esc(e.away)+'</td><td>'+e.bookmakerOdds.home+'</td><td>'+e.bookmakerOdds.away+'</td><td>'+(e.bookmakerOdds.draw??'—')+'</td></tr>'}
    h+='</table>'}
  if(t.bets.length){h+='<h1 style="margin-top:16px">Bets</h1><table><tr><th>market</th><th>outcome</th><th>stake</th><th>tx</th><th>audit</th></tr>';
    for(const b of t.bets){h+='<tr><td>'+esc(b.pick.marketId)+'</td><td>'+esc(b.pick.outcome)+'</td><td>'+b.pick.stake+'</td><td><code>'+esc(b.digest)+'</code></td><td>'+(b.url?'<a target="_blank" href="'+esc(b.url)+'">blob</a>':esc(b.blobId))+'</td></tr>'}
    h+='</table>'}
  for(const n of t.notes)h+='<p class="note">note: '+esc(n)+'</p>';
  h+='</section>';
  document.getElementById('out').innerHTML=h;
}
load();
</script></body></html>`;

createServer(async (req, res) => {
  try {
    // CORS so the Vite frontend (:5188) can read the feed.
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }
    if (req.method === 'GET' && req.url === '/') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(PAGE);
      return;
    }
    if (req.method === 'GET' && req.url === '/state') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ lastTick, walrusTest: lastWalrusTest }));
      return;
    }
    if (req.method === 'POST' && req.url === '/tick') {
      lastTick = await runTick();
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(lastTick));
      return;
    }
    if (req.method === 'POST' && req.url === '/walrus-test') {
      const r = await logAuditTrail({
        pick: {
          marketId: 'harness-test',
          outcome: 'home',
          stake: 0,
          odds: 0,
          rationale: 'walrus connectivity test from dev harness',
          sport: 'test',
          home: 'Test Home',
          away: 'Test Away',
          homeOdds: 0,
          awayOdds: 0,
        },
        txDigest: `harness-${Date.now()}`,
      });
      lastWalrusTest = { ...r, ts: Date.now() };
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(lastWalrusTest));
      return;
    }
    res.writeHead(404);
    res.end('not found');
  } catch (err) {
    res.writeHead(500, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: (err as Error).message }));
  }
}).listen(PORT, () => {
  const hasKey = !!process.env.SUI_PRIVATE_KEY;
  const hasW = !!process.env.AGENT_WITNESS_W;
  const mode = hasKey && hasW ? 'ON-CHAIN' : 'STUB';
  console.log(`[harness] dev page on http://localhost:${PORT}`);
  console.log(
    `[harness] mode=${mode}  SUI_PRIVATE_KEY=${hasKey ? 'set' : 'MISSING'}  ` +
      `AGENT_WITNESS_W=${hasW ? 'set' : 'MISSING'}  ` +
      `IWALLET_PACKAGE_ID=${process.env.IWALLET_PACKAGE_ID ? 'set' : 'MISSING'}  ` +
      `SETUP_MARKET_ID=${process.env.SETUP_MARKET_ID ? 'set' : 'MISSING'}`,
  );
});
