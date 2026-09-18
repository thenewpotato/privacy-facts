import ipaddr from 'ipaddr.js';
import {extractText} from './policy-text.js';
import {boundedText} from './bounded-text.js';

const isPublic=address=>{try{return ipaddr.process(address).range()==='unicast';}catch{return false;}};

export async function validatePublicURL(url, fetchImpl, signal) {
 if(!['https:','http:'].includes(url.protocol)||url.username||url.password||(url.port&&!['80','443'].includes(url.port)))throw new Error('Use a public HTTP or HTTPS policy URL.');
 const host=url.hostname.replace(/^\[|\]$/g,'').replace(/\.$/,'');
 if(ipaddr.isValid(host)){
  if(!isPublic(host))throw new Error('Private and local network URLs are not supported.');
  return;
 }
 if(!host.includes('.')||/(^|\.)(localhost|local|internal|test|invalid)$/.test(host))throw new Error('Private and local network URLs are not supported.');
 const addresses=(await Promise.all(['A','AAAA'].map(async type=>{
  const endpoint=new URL('https://cloudflare-dns.com/dns-query');endpoint.searchParams.set('name',host);endpoint.searchParams.set('type',type);
  const res=await fetchImpl(endpoint.href,{headers:{Accept:'application/dns-json'},signal,redirect:'manual'});
  if(!res.ok)throw new Error('Unable to validate policy hostname.');
  const answer=JSON.parse(await boundedText(res.body,65536));
  if(answer.Status!==0)throw new Error('Unable to resolve policy hostname.');
  return (answer.Answer||[]).filter(r=>r.type===1||r.type===28).map(r=>r.data);
 }))).flat();
 if(!addresses.length||addresses.some(a=>!isPublic(a)))throw new Error('Private and local network URLs are not supported.');
}

// Workers fetch resolves again: this DNS check is NOT Node's connection pinning.
// Use public fetch only; never attach private-network bindings or user credentials.
export async function fetchPolicy(input,{fetchImpl=fetch,timeoutMs=20000}={}) {
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeoutMs);
 let url=new URL(input);
 try{for(let redirects=0;redirects<=4;redirects++){
  await validatePublicURL(url,fetchImpl,controller.signal);
  const res=await fetchImpl(url.href,{redirect:'manual',signal:controller.signal,headers:{Accept:'text/html,text/plain','Cache-Control':'no-cache','User-Agent':'PrivacyFacts/1.0 (public policy reader)'}});
  if(res.status>=300&&res.status<400&&res.headers.has('location')){
   await res.body?.cancel();url=new URL(res.headers.get('location'),url);continue;
  }
  const type=(res.headers.get('content-type')||'').toLowerCase();
  if(res.status!==200){await res.body?.cancel();throw new Error(`This website returned HTTP ${res.status}. Try pasting the policy text instead.`);}
  if(!/text\/(html|plain)/.test(type)){await res.body?.cancel();throw new Error('This version reads HTML and text policies. Paste the text from PDFs instead.');}
  const body=await boundedText(res.body,2_000_000);
  return {text:type.includes('html')?extractText(body):body,url:url.href};
 }throw new Error('Too many redirects. Paste the policy text instead.');}finally{clearTimeout(timer);}
}
