import {analyze,analysisError} from '../../../lib/analyze.js';
import {fetchPolicy} from '../../../lib/fetch-policy-cloudflare.js';
import {boundedText} from '../../../lib/bounded-text.js';

export async function onRequest({request,env}) {
 const headers={'Cache-Control':'no-store'};
 if(request.method!=='POST')return Response.json({error:'Use POST.'},{status:405,headers:{...headers,Allow:'POST'}});
 if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))return Response.json({error:'Send application/json.'},{status:415,headers});
 let input;
 try{input=JSON.parse(await boundedText(request.body,90*1024));}
 catch{return Response.json({error:'Invalid or oversized request.'},{status:400,headers});}
 try{return Response.json(await analyze(input,{apiKey:env.TYPESAFE_API_KEY,model:env.TYPESAFE_MODEL,fetchPolicy}),{headers});}
 catch(error){return Response.json(analysisError(error),{status:error.status||400,headers});}
}
