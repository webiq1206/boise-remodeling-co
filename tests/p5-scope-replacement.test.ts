import test from 'node:test';
import assert from 'node:assert/strict';
import {answersForReplacedScope,analyzedScopeMatches,displayScopeText,normalizeScopeText,replaceAnalyzedScope,scopeFingerprint} from '../lib/p5/scopeReplacement.ts';
import {archiveBrowserDraft,listBrowserDraftRecoveries,replaceBrowserDraft,restoreBrowserDraft,type BrowserDraft} from '../lib/p5/browserDraft.ts';

const extraction=()=>({
  summary:'Old scope',
  facts:[
    {field:'sqft' as const,value:'800',confidence:.99,source:'old scope',evidence:'800 square feet'},
    {field:'taskList' as const,value:'Replace the flooring',confidence:.99,source:'old scope',evidence:'Replace the flooring'},
  ],
  conflicts:[{field:'sqft' as const,values:['800','900'],explanation:'Old conflict'}],
  missingInformation:[],
  reviewNotes:[],
});

test('scope text normalization covers the combined legacy instruction display',()=>{
  assert.equal(displayScopeText('Remodel the kitchen.','Keep the cabinets.'),'Remodel the kitchen.\n\nKeep the cabinets.');
  assert.equal(displayScopeText('Remodel the kitchen. '),'Remodel the kitchen. ','Typing a separator must retain the trailing space');
  assert.equal(normalizeScopeText('same\r\ntext\n'),'same\ntext');
  assert.equal(scopeFingerprint('same\r\ntext'),scopeFingerprint(' same\ntext '));
});

test('replacing analyzed text removes old derived facts and wizard state but retains uploads',()=>{
  const draft={
    text:'Old scope',
    answers:{service:'kitchen',sqft:'800',taskList:'Replace the flooring',location:'Boise',estimatingInstructions:'Old answer'},
    extraction:extraction(),
    conflicts:extraction().conflicts,
    wizard:{skipped:['sqft' as const],resolutions:{sqft:'800'},instructionAnswers:[{id:'old',question:'Old?',answer:'Yes'}]},
    analyzedText:'Old scope',
    analyzedAnswers:JSON.stringify([['taskList','Replace the flooring']]),
    pricedFields:['sqft' as const],
    uploads:[{id:'file',name:'plans.pdf',type:'application/pdf',size:1,sha256:'sha',status:'stored' as const}],
    step:2,
  };
  const replaced=replaceAnalyzedScope(draft,'New scope');
  assert.equal(replaced.text,'New scope');
  assert.deepEqual(replaced.answers,{});
  assert.equal(replaced.extraction,null);
  assert.deepEqual(replaced.conflicts,[]);
  assert.deepEqual(replaced.wizard,{skipped:[],resolutions:{},instructionAnswers:[]});
  assert.deepEqual(replaced.uploads,draft.uploads);
  assert.equal(replaced.analyzedText,undefined);
  assert.equal(replaced.analyzedAnswers,undefined);
  assert.deepEqual(replaced.pricedFields,[]);
  assert.equal(replaced.step,0);
  assert.equal(replaced.dirty,true);
});

test('server-side source replacement does not retain old visitor answers',()=>{
  const retained=answersForReplacedScope({service:'kitchen',sqft:'900',taskList:'Keep the flooring',estimatingInstructions:'legacy'},extraction(),{});
  assert.deepEqual(retained,{});
});

test('analyzed match uses the fingerprint and does not treat contact saves as replacements',()=>{
  const state={text:'Scope',analyzedText:'Scope',analyzedFingerprint:scopeFingerprint('Scope')};
  assert.equal(analyzedScopeMatches(state,' Scope\n'),true);
  assert.equal(analyzedScopeMatches(state,'New scope'),false);
});

function browserDraft():BrowserDraft{
  return {
    id:'11111111-1111-4111-8111-111111111111',
    key:'a'.repeat(64),
    revision:4,
    text:'Old scope',
    answers:{service:'kitchen',taskList:'Old work'},
    extraction:null,
    contact:{name:'Visitor',email:'visitor@example.com',phone:''},
    step:2,
    updatedAt:1,
    uploads:[{id:'file',name:'plans.pdf',type:'application/pdf',size:1,sha256:'sha',status:'stored'}],
  };
}

test('explicit new project archives the browser draft and keeps it restorable',()=>{
  const previous=(globalThis as any).localStorage;
  const values=new Map<string,string>();
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{
    getItem:(key:string)=>values.get(key)||null,
    setItem:(key:string,value:string)=>{values.set(key,value);},
    removeItem:(key:string)=>{values.delete(key);},
  }});
  try{
    const original=browserDraft();
    const archived=archiveBrowserDraft(original);
    assert.equal(archived?.key,original.id);
    assert.equal(listBrowserDraftRecoveries()[0]?.draft.id,original.id);
    assert.deepEqual(restoreBrowserDraft(original.id),original);
    const replacement=replaceBrowserDraft(original,'bathroom');
    assert.notEqual(replacement.draft.id,original.id);
    assert.deepEqual(replacement.draft.answers,{service:'bathroom'});
    assert.deepEqual(replacement.draft.uploads,[]);
    assert.equal(restoreBrowserDraft(original.id)?.answers.service,'kitchen');
  }finally{
    if(previous===undefined)delete (globalThis as any).localStorage;
    else Object.defineProperty(globalThis,'localStorage',{configurable:true,value:previous});
  }
});

test('explicit replacement fails closed when recovery cannot be written',()=>{
  const previous=(globalThis as any).localStorage;
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{
    getItem:()=>null,
    setItem:()=>{throw new Error('quota');},
  }});
  try{assert.throws(()=>replaceBrowserDraft(browserDraft()),/could not be archived/);}
  finally{
    if(previous===undefined)delete (globalThis as any).localStorage;
    else Object.defineProperty(globalThis,'localStorage',{configurable:true,value:previous});
  }
});