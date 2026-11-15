import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

/** Execute the actual component in a child so an unhandled optional import is
 * observed without contaminating the parent test runner. Only framework and
 * chunk-loading boundaries are replaced; no network or business service exists. */
function rejectedPrewarm(failActive: boolean) {
  const script = String.raw`
    const {readFileSync}=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
    const effects=[],listeners={},unhandled=[],toasts=[];let active=false,attempts=0,loader;
    process.on('unhandledRejection',error=>unhandled.push(String(error)));
    const actualToaster=()=>null;
    const DynamicToaster=()=>null;
    const deps={
      'next/dynamic':{default:fn=>{loader=fn;return DynamicToaster;}},
      react:{useEffect:fn=>effects.push(fn),useRef:()=>({current:null}),useState:()=>[active,value=>{active=value;}]},
      '@/hooks/use-toast':{useToast:()=>({toasts})},
      'react/jsx-runtime':{jsx:(type,props)=>({type,props})},
    };
    const exports={};
    vm.runInNewContext(ts.transpileModule(readFileSync('components/ui/deferred-toaster.tsx','utf8'),{
      compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}
    }).outputText,{
      exports,require:name=>{
        if(name==='@/components/ui/toaster'){
          attempts++;if(attempts===1||${failActive})throw new Error('Synthetic chunk request cancelled');
          return {Toaster:actualToaster};
        }
        if(!Object.hasOwn(deps,name))throw new Error('Unexpected dependency '+name);
        return deps[name];
      },
      document:{addEventListener:()=>{},removeEventListener:()=>{}},
      window:{addEventListener:(name,fn)=>{listeners[name]=fn;},removeEventListener:()=>{}},
    });
    (async()=>{
      exports.DeferredToaster();for(const effect of effects.splice(0))effect();
      listeners.pointerdown();
      await new Promise(resolve=>setTimeout(resolve,20));
      toasts.push({id:'synthetic-toast'});
      exports.DeferredToaster();for(const effect of effects.splice(0))effect();
      const tree=exports.DeferredToaster();let activeLoaded=false,activeError=null;
      try{activeLoaded=(await loader())===actualToaster;}catch(error){activeError=String(error);}
      console.log(JSON.stringify({unhandled,attempts,activePath:tree.type===DynamicToaster,activeLoaded,activeError}));
    })().catch(error=>{console.error(error);process.exitCode=1;});
  `;
  const result = spawnSync(process.execPath, ['-e', script], {encoding: 'utf8', timeout: 15000});
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout.trim());
}

test('cancelled optional toast prewarm is handled and later real toast retries the loader', () => {
  const result = rejectedPrewarm(false);
  assert.deepEqual(result.unhandled, []);
  assert.equal(result.attempts, 2);
  assert.equal(result.activePath, true);
  assert.equal(result.activeLoaded, true);
  assert.equal(result.activeError, null);
});

test('handling optional prewarm does not swallow an actual active loader failure', () => {
  const result = rejectedPrewarm(true);
  assert.deepEqual(result.unhandled, []);
  assert.equal(result.attempts, 2);
  assert.equal(result.activePath, true);
  assert.equal(result.activeLoaded, false);
  assert.match(result.activeError, /Synthetic chunk request cancelled/);
});
