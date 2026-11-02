/* Worker for the training diary: serves the static page (ASSETS) and the storage API (D1).
   The site sits behind Cloudflare Access; every request must carry a valid Access JWT,
   and the email in it is the owner of the rows. Without ACCESS_TEAM_DOMAIN/ACCESS_AUD the API refuses everything.
   Routes: GET /api/sync, PUT|DELETE /api/{workouts|templates|settings}/{id}; everything else is a static asset. */

const KINDS=new Set(['workouts','templates','settings']);
const OKID=/^[A-Za-z0-9_-]{1,64}$/;
const MAX_BODY=256*1024;

const json=(d,status=200)=>new Response(JSON.stringify(d),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});

/* ---------- Access JWT ---------- */
let certs=null,certsAt=0;
async function accessKeys(team,force){
  if(!force&&certs&&Date.now()-certsAt<3600e3)return certs;
  const r=await fetch(team+'/cdn-cgi/access/certs');
  if(!r.ok)throw new Error('certs '+r.status);
  certs=(await r.json()).keys||[];certsAt=Date.now();
  return certs;
}
const b64u=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(s.length/4)*4,'=')),c=>c.charCodeAt(0));
const part=s=>JSON.parse(new TextDecoder().decode(b64u(s)));

async function userOf(request,env){
  if(env.DEV_USER)return String(env.DEV_USER).toLowerCase(); // local `wrangler dev` only (.dev.vars)
  const team=String(env.ACCESS_TEAM_DOMAIN||'').replace(/\/+$/,''),aud=env.ACCESS_AUD;
  if(!team||!aud)return null;
  const tok=request.headers.get('cf-access-jwt-assertion');
  if(!tok)return null;
  const [h,p,s]=tok.split('.');
  if(!h||!p||!s)return null;
  let head,claims;
  try{head=part(h);claims=part(p)}catch(e){return null}
  if(head.alg!=='RS256')return null;
  let jwk=(await accessKeys(team)).find(k=>k.kid===head.kid);
  if(!jwk)jwk=(await accessKeys(team,true)).find(k=>k.kid===head.kid); // keys rotated
  if(!jwk)return null;
  const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  if(!await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,b64u(s),new TextEncoder().encode(h+'.'+p)))return null;
  const now=Date.now()/1000,auds=Array.isArray(claims.aud)?claims.aud:[claims.aud];
  if(!auds.includes(aud)||claims.iss!==team||!(claims.exp>now)||(claims.nbf&&claims.nbf>now+60)||!claims.email)return null;
  return String(claims.email).toLowerCase();
}

/* ---------- storage ---------- */
let ready=false;
async function schema(db){
  if(ready)return;
  await db.prepare('CREATE TABLE IF NOT EXISTS items(user TEXT NOT NULL,kind TEXT NOT NULL,id TEXT NOT NULL,data TEXT,updated INTEGER NOT NULL,deleted INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(user,kind,id))').run();
  ready=true;
}

async function handleApi(request,env,seg){
  if(!env.DB)return json({error:'no_db'},503);
  const user=await userOf(request,env);
  if(!user)return json({error:'unauthorized'},401);
  await schema(env.DB);
  const m=request.method;

  if(seg.length===1&&seg[0]==='sync'&&m==='GET'){
    const {results}=await env.DB.prepare('SELECT kind,id,data,deleted FROM items WHERE user=?').bind(user).all();
    const out={workouts:[],templates:[],settings:null,deleted:{workouts:[],templates:[]}};
    for(const r of results){
      if(r.deleted){if(out.deleted[r.kind])out.deleted[r.kind].push(r.id);continue}
      const d=JSON.parse(r.data);
      if(r.kind==='settings')out.settings=d;else out[r.kind].push(d);
    }
    return json(out);
  }

  if(seg.length===2&&KINDS.has(seg[0])&&OKID.test(seg[1])){
    const [kind,id]=seg;
    if(m==='PUT'){
      const body=await request.text();
      if(body.length>MAX_BODY)return json({error:'too_large'},413);
      let o;try{o=JSON.parse(body)}catch(e){return json({error:'bad_json'},400)}
      if(!o||typeof o!=='object'||Array.isArray(o))return json({error:'bad_json'},400);
      if(kind!=='settings'&&o.id!==id)return json({error:'id_mismatch'},400);
      await env.DB.prepare('INSERT INTO items(user,kind,id,data,updated,deleted) VALUES(?,?,?,?,?,0) ON CONFLICT(user,kind,id) DO UPDATE SET data=excluded.data,updated=excluded.updated,deleted=0')
        .bind(user,kind,id,body,Date.now()).run();
      return json({ok:true});
    }
    if(m==='DELETE'){
      /* tombstone, so other devices drop their copy instead of uploading it again */
      await env.DB.prepare('INSERT INTO items(user,kind,id,data,updated,deleted) VALUES(?,?,?,NULL,?,1) ON CONFLICT(user,kind,id) DO UPDATE SET data=NULL,updated=excluded.updated,deleted=1')
        .bind(user,kind,id,Date.now()).run();
      return json({ok:true});
    }
    return json({error:'method'},405);
  }
  return json({error:'not_found'},404);
}

export default {
  async fetch(request,env){
    const path=new URL(request.url).pathname;
    if(path.startsWith('/api/')){
      let seg;try{seg=path.slice(5).split('/').filter(Boolean).map(decodeURIComponent)}catch(e){return json({error:'bad_path'},400)}
      return handleApi(request,env,seg);
    }
    return env.ASSETS.fetch(request);
  }
};
