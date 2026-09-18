import {clausesFor} from './policy-text.js';
import {questionsFor,interpret,labelContents} from './facts.js';

export async function analyze(input, {apiKey, model='jev-latest', fetchPolicy, fetchImpl=fetch}) {
 if(!apiKey)throw Object.assign(new Error('Analysis is not configured. Set TYPESAFE_API_KEY on the server.'),{status:503});
 const started=performance.now();let source;
 if(typeof input?.text==='string'&&input.text.trim())source={text:input.text,url:null};
 else if(typeof input?.url==='string'&&input.url.length<2048)source=await fetchPolicy(input.url);
 else throw new Error('Enter a policy URL or paste its text.');
 const clauses=clausesFor(source.text);
 const response=await fetchImpl('https://api.typesafe.ai/v1/systemone',{
  method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},
  body:JSON.stringify({model,state:{document:clauses},questions:questionsFor(clauses)}),
  signal:AbortSignal.timeout(45000),
 });
 if(!response.ok)throw new Error(response.status===401?'TypeSafe rejected the API key. Check server configuration.':response.status===429?'TypeSafe is rate limiting requests. Please try again shortly.':`TypeSafe returned HTTP ${response.status}. Please try again.`);
 const payload=await response.json();const rows=interpret(payload.answers||{},clauses);
 return {rows,...labelContents(payload.answers||{}),url:source.url,domain:source.url?new URL(source.url).hostname:'Pasted policy',retrievedAt:new Date().toISOString(),model:payload.model||model,durationMs:Math.round(performance.now()-started),characters:source.text.length};
}

export function analysisError(error){
 return {error:['TimeoutError','AbortError'].includes(error.name)?'Analysis timed out. Please try again.':error.message};
}
