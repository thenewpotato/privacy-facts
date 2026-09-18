import { lookup } from 'node:dns/promises';
import https from 'node:https';
import http from 'node:http';
import ipaddr from 'ipaddr.js';
import {extractText} from './policy-text.js';
export {extractText,clausesFor} from './policy-text.js';
export function isPublic(address){try{return ipaddr.process(address).range()==='unicast';}catch{return false;}}
export async function fetchPolicy(input){
 let url=new URL(input); const deadline=Date.now()+20000;
 for(let redirects=0;redirects<=4;redirects++){
  if(!['https:','http:'].includes(url.protocol)||url.username||url.password|| (url.port&&!['80','443'].includes(url.port))) throw new Error('Use a public HTTP or HTTPS policy URL.');
  const host=url.hostname.replace(/^\[|\]$/g,'');
  const addresses=await Promise.race([lookup(host,{all:true}),new Promise((_,reject)=>{const t=setTimeout(()=>reject(new Error('DNS lookup timed out.')),5000);t.unref();})]);
  if(!addresses.length||addresses.some(a=>!isPublic(a.address))) throw new Error('Private and local network URLs are not supported.');
  const remaining=deadline-Date.now();if(remaining<=0)throw new Error('The website took too long to respond.');
  const result=await new Promise((resolve,reject)=>{
   const selected=addresses[0];
   const req=(url.protocol==='https:'?https:http).get(url,{headers:{'User-Agent':'PrivacyFacts/1.0 (public policy reader)','Accept':'text/html,text/plain','Cache-Control':'no-cache'},lookup:(_host,opts,cb)=>opts.all?cb(null,[selected]):cb(null,selected.address,selected.family)},res=>{
    if(res.statusCode>=300&&res.statusCode<400&&res.headers.location){res.resume();resolve({redirect:res.headers.location});return;}
    if(res.statusCode!==200){res.resume();reject(new Error(`This website returned HTTP ${res.statusCode}. Try pasting the policy text instead.`));return;}
    const type=res.headers['content-type']||'';if(!/text\/(html|plain)/i.test(type)){res.resume();reject(new Error('This version reads HTML and text policies. Paste the text from PDFs instead.'));return;}
    let size=0;const chunks=[];res.on('data',c=>{size+=c.length;if(size>2_000_000){req.destroy(new Error('This page is too large. Paste just the policy text.'));return;}chunks.push(c);});res.on('end',()=>resolve({body:Buffer.concat(chunks).toString(),type}));res.on('error',reject);
   });const timer=setTimeout(()=>req.destroy(new Error('The website took too long to respond.')),remaining);req.on('close',()=>clearTimeout(timer));req.on('error',reject);
  });
  if(result.redirect){url=new URL(result.redirect,url);continue;}
  return {text:result.type.includes('html')?extractText(result.body):result.body,url:url.href};
 }
 throw new Error('Too many redirects. Paste the policy text instead.');
}
