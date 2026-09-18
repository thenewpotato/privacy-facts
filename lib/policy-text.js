import { load } from 'cheerio/slim';
export function extractText(html){const $=load(html);$('script,style,nav,header,footer,noscript,svg,form').remove();const scope=$('main').length?$('main').first():$('body').length?$('body'):$.root();scope.find('p,h1,h2,h3,h4,li,br,div,section').append('\n');return scope.text().split('\n').map(s=>s.replace(/\s+/g,' ').trim()).filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).join('\n');}
export function clausesFor(text){
 if(text.trim().length<400)throw new Error('We could not find enough policy text. This page may need JavaScript. Paste the policy below instead.');
 if(text.length>60000)throw new Error('This policy exceeds the demo’s 60,000-character limit. Paste a shorter complete section to analyze.');
 const lines=text.split(/\n+/).map(s=>s.trim()).filter(Boolean);const clauses=[];
 for(const line of lines){if(line.length>4000)throw new Error('Please paste the policy with paragraph breaks.');const last=clauses.at(-1);if(last&&last.text.length+line.length<800)last.text+='\n'+line;else clauses.push({id:`c${clauses.length+1}`,text:line});}
 if(clauses.length>200)throw new Error('Too many policy sections. Paste a shorter complete section.');return clauses;
}
