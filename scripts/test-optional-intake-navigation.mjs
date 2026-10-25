import {build} from 'esbuild';
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd();
const bundle=await build({stdin:{contents:`import React from 'react'; import {createRoot} from 'react-dom/client'; import {OptionalIntake} from './components/approved/OptionalIntake'; createRoot(document.getElementById('root')).render(<OptionalIntake/>);`,resolveDir:root,loader:'tsx'},bundle:true,write:false,jsx:'automatic',nodePaths:[path.resolve('node_modules')],plugins:[{name:'isolated-estimator',setup(b){b.onResolve({filter:/^\.\/ApprovedEstimate$/},()=>({path:'fixture',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:`export function ApprovedEstimate(){return <section id="calculator"><h2>Project review</h2><input aria-label="Project details"/></section>}`,loader:'tsx',resolveDir:root}));}}]});
await fs.mkdir(root+'/p5-verification',{recursive:true});
const browser=await chromium.launch();const results=[];
try{
 for(const width of [320,390,768,1024,1440])for(const mode of ['closed','button','initial-hash','hash-change']){
  const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block'});
  await context.route('**/*',r=>r.fulfill({contentType:'text/html',body:'<a href="#calculator">Estimate cost</a><div id="root"></div>'}));
  const page=await context.newPage();
  await page.goto('http://fixture.test/'+(mode==='initial-hash'?'#calculator':''));
  await page.addScriptTag({content:bundle.outputFiles[0].text});
  if(mode!=='initial-hash')await page.getByRole('button',{name:'Open the optional intake'}).waitFor();
  if(mode==='button')await page.getByRole('button',{name:'Open the optional intake'}).click();
  if(mode==='hash-change')await page.getByRole('link',{name:'Estimate cost'}).click();
  if(mode==='closed')assert.equal(await page.locator('#calculator').count(),0);
  else{await page.locator('#calculator').waitFor();assert.equal(await page.evaluate(()=>document.activeElement?.id),'calculator');assert.equal(await page.locator('#calculator').count(),1);}
  results.push({width,mode,passed:true});await context.close();
 }
}finally{await browser.close();await fs.writeFile(root+'/p5-verification/optional-intake-navigation.json',JSON.stringify(results,null,2));}
console.log(JSON.stringify(results));
