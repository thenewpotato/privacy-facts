import {test} from 'node:test';
import assert from 'node:assert/strict';
import {groups,wording} from '../src/label-copy.js';
import {facts} from './facts.js';
test('each fact appears once; opt-out is nested directly under training',()=>{
 const items=groups.flatMap(g=>g.items);
 assert.deepEqual(items.map(i=>i[0]).sort(),facts.map(f=>f.id).sort());
 assert.deepEqual(groups[0].items.slice(0,2).map(i=>[i[0],!!i[2]]),[['training',false],['optout',true]]);
});
test('plain language preserves uncertainty and missing deadlines',()=>{
 assert.equal(wording({id:'retention'},'not_stated'),'Not stated');
 assert.equal(wording({id:'training'},'not_stated'),'Not stated');
 assert.equal(wording({id:'training'},'unclear'),'Unclear');
 assert.equal(wording({id:'training'},'conditional'),'Sometimes');
 assert.equal(wording({id:'improvement'},'opt_in'),'Only if you opt in');
 assert.equal(wording({id:'optout'},'not_applicable'),'Not needed');
});
test('rows are questions and definitive answers are Yes or No',()=>{
 for(const group of groups)for(const [id,label] of group.items){
  assert.ok(label.endsWith('?'),label);
  if(id==='retention')continue;
  assert.equal(wording({id},'yes'),'Yes');
  assert.equal(wording({id},'no'),'No');
 }
});
test('retention displays duration buckets, not yes/no',()=>{
 assert.equal(wording({id:'retention'},'days_30'),'Up to 30 days');
 assert.equal(wording({id:'retention'},'as_needed'),'As long as needed');
 assert.equal(wording({id:'retention'},'varies'),'Varies by data');
});
