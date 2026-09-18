export const groups = [
{title:'Your content', items:[['training','Can they train public AI on your content?'],['optout','Can you opt out?',true],['improvement','Can they use your content to improve the product?'],['human','Can staff read your content?']]},
 {title:'Following the money (and you)', items:[['sale','Can they sell your data?'],['ads','Can they share it for targeted ads?'],['tracking','Can they track you across sites?'],['location','Can they collect your exact location?']]},
 {title:'Who else gets a bite?', items:[['provider_training','Can other companies train public AI on your content?'],['provider_ads','Can other companies use your data for ads?'],['provider_sale','Can other companies sell your data?'],['transfer','Can your data move with a company sale?']]},
 {title:'The leftovers', items:[['retention','How long do they keep your data?'],['deletion','Can you request deletion?']]},
];

export function wording(f,s){
 if(s==='unclear')return 'Unclear';
 if(s==='not_stated')return 'Not stated';
 if(f.id==='retention')return {days_30:'Up to 30 days',days_90:'31–90 days',year_1:'91 days–1 year',over_year:'Over 1 year',until_deleted:'Until you delete it',as_needed:'As long as needed',varies:'Varies by data',indefinite:'Indefinitely'}[s]||'Unclear';
 if(s==='opt_in')return 'Only if you opt in';
 if(s==='conditional')return 'Sometimes';
 if(s==='not_applicable')return f.id==='optout'?'Not needed':'Doesn’t apply';
 return s==='yes'?'Yes':'No';
}
