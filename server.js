import express from 'express';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {fetchPolicy} from './lib/fetch-policy.js';
import {analyze,analysisError} from './lib/analyze.js';
const app=express();const root=path.dirname(fileURLToPath(import.meta.url));
app.disable('x-powered-by');app.use(express.json({limit:'90kb'}));
app.use('/privacy-facts/api',(_req,res,next)=>{res.set('Cache-Control','no-store');next();});
app.get('/privacy-facts/api/health',(_req,res)=>res.json({configured:!!process.env.TYPESAFE_API_KEY}));
app.post('/privacy-facts/api/analyze',async(req,res)=>{
 try{res.json(await analyze(req.body,{apiKey:process.env.TYPESAFE_API_KEY,model:process.env.TYPESAFE_MODEL,fetchPolicy}));}
 catch(error){res.status(error.status||400).json(analysisError(error));}
});
app.get('/',(_req,res)=>res.redirect('/privacy-facts/'));
if(process.env.NODE_ENV==='production'){
 app.use('/privacy-facts',express.static(path.join(root,'dist')));
}else{const {createServer}=await import('vite');const vite=await createServer({root,server:{middlewareMode:true},appType:'spa'});app.use(vite.middlewares);}
app.use((err,_req,res,_next)=>res.status(400).json({error:'Invalid or oversized request.'}));
app.listen(Number(process.env.PORT)||4317,'127.0.0.1',()=>console.log(`Privacy Facts: http://localhost:${process.env.PORT||4317}/privacy-facts/`));
