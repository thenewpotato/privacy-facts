import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fetchPolicy} from './fetch-policy-cloudflare.js';
import {boundedText} from './bounded-text.js';
import {analyze} from './analyze.js';
import {facts} from './facts.js';
import {onRequest} from '../functions/privacy-facts/api/analyze.js';

const policy='We do not sell your data. '.repeat(25);
const dns=()=>Response.json({Status:0,Answer:[{type:1,data:'93.184.216.34'}]});
const answers=Object.fromEntries(facts.map(f=>[f.id,{choice:'not_stated',confidence:.9}]));
test('arbitrary public hosts and redirects work without forwarding credentials',async()=>{
 const targets=[];
 const result=await fetchPolicy('https://unlisted.example/privacy',{fetchImpl:async(url,options)=>{
  if(url.startsWith('https://cloudflare-dns.com/'))return dns();
  targets.push(url);assert.equal(options.redirect,'manual');assert.equal(options.headers.Authorization,undefined);
  return targets.length===1?new Response(null,{status:302,headers:{location:'/policy'}}):new Response(`<main><p>${policy}</p></main>`,{headers:{'content-type':'text/html'}});
 }});
 assert.equal(result.url,'https://unlisted.example/policy');assert.equal(result.text,policy.trim());assert.equal(targets.length,2);
});
test('rejects private URLs, credentials, ports, and redirect destinations',async()=>{
 for(const url of ['http://127.0.0.1','http://[::1]','http://[::ffff:127.0.0.1]','http://169.254.169.254','http://localhost','ftp://example.com','https://user:pass@example.com','https://example.com:123']){
  await assert.rejects(fetchPolicy(url,{fetchImpl:()=>{throw Error('must not fetch');}}),/public HTTP|Private and local/);
 }
 await assert.rejects(fetchPolicy('https://public.example',{fetchImpl:async url=>url.includes('dns-query')?dns():new Response(null,{status:302,headers:{location:'http://10.0.0.1'}})}),/Private and local/);
});
test('mixed public/private DNS and failed DNS are rejected before origin fetch',async()=>{
 for(const answer of [{Status:0,Answer:[{type:1,data:'93.184.216.34'},{type:28,data:'::1'}]},{Status:2},{Status:0,Answer:[]}]){
  await assert.rejects(fetchPolicy('https://unlisted.example',{fetchImpl:async url=>{assert.ok(url.includes('dns-query'));return Response.json(answer);}}));
 }
});
test('bounds response size, redirect count, content type, and time',async()=>{
 for(const response of [()=>new Response('x'.repeat(2_000_001),{headers:{'content-type':'text/plain'}}),()=>new Response('pdf',{headers:{'content-type':'application/pdf'}}),()=>new Response(null,{status:302,headers:{location:'/again'}})]){
  await assert.rejects(fetchPolicy('https://example.com',{fetchImpl:async url=>url.includes('dns-query')?dns():response()}));
 }
 await assert.rejects(fetchPolicy('https://example.com',{timeoutMs:5,fetchImpl:(_url,{signal})=>new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('aborted','AbortError'))))}),/aborted/);
});
test('bounded text counts bytes, not characters',async()=>{
 await assert.rejects(boundedText(new Response('éé').body,3),/size limit/);
});
test('shared analysis preserves contract for URL and pasted inputs',async()=>{
 for(const input of [{text:policy},{url:'https://example.com/privacy'}]){
  const result=await analyze(input,{apiKey:'test-only',fetchPolicy:async()=>({text:policy,url:input.url}),fetchImpl:async(url,options)=>{
   assert.equal(url,'https://api.typesafe.ai/v1/systemone');assert.equal(options.headers.Authorization,'Bearer test-only');
   assert.equal(JSON.parse(options.body).model,'jev-latest');return Response.json({answers,model:'test-model'});
  }});
  assert.equal(result.rows.length,14);assert.equal(result.model,'test-model');assert.equal(result.characters,policy.length);
 }
 await assert.rejects(analyze(null,{apiKey:'test-only'}),/Enter a policy/);
 await assert.rejects(analyze({text:policy},{apiKey:''}),/not configured/);
});
test('Pages handler rejects methods, invalid JSON, oversized input and missing config',async()=>{
 for(const [request,status] of [
  [new Request('https://site.test/api'),405],
  [new Request('https://site.test/api',{method:'POST',body:'x'}),415],
  [new Request('https://site.test/api',{method:'POST',headers:{'content-type':'application/json'},body:'{'}),400],
  [new Request('https://site.test/api',{method:'POST',headers:{'content-type':'application/json'},body:'x'.repeat(92161)}),400],
  [new Request('https://site.test/api',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text:policy})}),503],
 ]){const res=await onRequest({request,env:{}});assert.equal(res.status,status);assert.equal(res.headers.get('cache-control'),'no-store');}
});
test('Pages response uses shared results and never returns the server key',async(t)=>{
 t.mock.method(globalThis,'fetch',async()=>Response.json({answers,model:'test-model'}));
 const request=new Request('https://site.test/privacy-facts/api/analyze',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text:policy})});
 const response=await onRequest({request,env:{TYPESAFE_API_KEY:'test-secret-never-return'}});
 assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
 const body=await response.text();assert.equal(JSON.parse(body).rows.length,14);assert.ok(!body.includes('test-secret-never-return'));
});
test('upstream failures and malformed results remain failures',async()=>{
 for(const response of [()=>new Response(null,{status:401}),()=>new Response(null,{status:429}),()=>Response.json({answers:{}})]){
  await assert.rejects(analyze({text:policy},{apiKey:'test-only',fetchImpl:async()=>response()}));
 }
});
