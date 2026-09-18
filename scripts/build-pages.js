import {cp,mkdir,writeFile} from 'node:fs/promises';
// Stage at the URL prefix; the ordinary Vite dist remains usable by Express.
await mkdir('.cloudflare-site/privacy-facts',{recursive:true});
await cp('dist','.cloudflare-site/privacy-facts',{recursive:true});
await writeFile('.cloudflare-site/_routes.json',JSON.stringify({version:1,include:['/privacy-facts/api/*'],exclude:[]}));
