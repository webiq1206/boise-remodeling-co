import fs from 'node:fs';
import ts from 'typescript';
const brandPath='lib/p5/brand.ts';
const original=fs.readFileSync(brandPath,'utf8');
const js=ts.transpileModule(original,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {ESTIMATOR_BRAND}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
try{
  // The original brand content is restored byte-for-byte. This is only a
  // compatibility input for the reviewed integration script, not a rebrand.
  fs.writeFileSync(brandPath,'export const ESTIMATOR_BRAND = '+JSON.stringify(ESTIMATOR_BRAND,null,2)+' as const;\n');
  await import('./integrate-p5-mobile-seo.mjs');
}finally{fs.writeFileSync(brandPath,original);}
const helper='lib/brand-page-metadata.ts';
fs.writeFileSync(helper,fs.readFileSync(helper,'utf8').replace("from './p5/brand';","from './p5/brand.ts';"));
