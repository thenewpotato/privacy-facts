import express from 'express';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {fetchPolicy,clausesFor} from './lib/fetch-policy.js';
import {questionsFor,interpret,labelContents} from './lib/facts.js';
const app=express();const root=path.dirname(fileURLToPath(import.meta.url));
app.disable('x-powered-by');app.use(express.json({limit:'90kb'}));
app.use('/privacy-facts/api',(_req,res,next)=>{res.set('Cache-Control','no-store');next();});
app.get('/privacy-facts/api/health',(_req,res)=>res.json({configured:!!process.env.TYPESAFE_API_KEY}));
const requests=new Map();let active=0;
app.post('/privacy-facts/api/analyze',async(req,res)=>{
 const key=req.socket.remoteAddress;const now=Date.now();const recent=(requests.get(key)||[]).filter(t=>now-t<60000);
 if(recent.length>=6||active>=4)return res.status(429).json({error:'A little busy. Please try again in a minute.'});
 requests.set(key,[...recent,now]);if(!process.env.TYPESAFE_API_KEY)return res.status(503).json({error:'Add TYPESAFE_API_KEY to .env and restart the server to analyze a policy.'});
 active++;try{
  const started=performance.now();let source;
  if(typeof req.body.text==='string'&&req.body.text.trim())source={text:req.body.text,url:null};
  else if(typeof req.body.url==='string'&&req.body.url.length<2048)source=await fetchPolicy(req.body.url);
  else throw new Error('Enter a policy URL or paste its text.');
  const clauses=clausesFor(source.text);const model=process.env.TYPESAFE_MODEL||'jev-latest';
  const api=await fetch('https://api.typesafe.ai/v1/systemone',{method:'POST',headers:{Authorization:`Bearer ${process.env.TYPESAFE_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model,state:{document:clauses},questions:questionsFor(clauses)}),signal:AbortSignal.timeout(45000)});
  if(!api.ok)throw new Error(api.status===401?'TypeSafe rejected the API key. Check .env.':api.status===429?'TypeSafe is rate limiting requests. Please try again shortly.':`TypeSafe returned HTTP ${api.status}. Please try again.`);
  const payload=await api.json();const rows=interpret(payload.answers||{},clauses);
  res.json({rows,...labelContents(payload.answers||{}),url:source.url,domain:source.url?new URL(source.url).hostname:'Pasted policy',retrievedAt:new Date().toISOString(),model:payload.model||model,durationMs:Math.round(performance.now()-started),characters:source.text.length});
 }catch(error){res.status(400).json({error:error.name==='TimeoutError'?'Analysis timed out. Please try again.':error.message});}finally{active--;}
});
const gc=setInterval(()=>{for(const [k,v] of requests)if(v.every(t=>Date.now()-t>60000))requests.delete(k);},60000);gc.unref();
app.get('/',(_req,res)=>res.redirect('/privacy-facts/'));
if(process.env.NODE_ENV==='production'){
 app.use('/privacy-facts',express.static(path.join(root,'dist')));
}else{const {createServer}=await import('vite');const vite=await createServer({root,server:{middlewareMode:true},appType:'spa'});app.use(vite.middlewares);}
app.use((err,_req,res,_next)=>res.status(400).json({error:'Invalid or oversized request.'}));
app.listen(Number(process.env.PORT)||4317,'127.0.0.1',()=>console.log(`Privacy Facts: http://localhost:${process.env.PORT||4317}/privacy-facts/`));
