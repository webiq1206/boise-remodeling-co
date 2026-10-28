import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const manifest=JSON.parse(readFileSync('docs/branding-20261028.json','utf8'));
test('deployed family assets match the approved October 28 masters byte for byte',()=>{
 for(const asset of manifest.assets) assert.equal(createHash('sha256').update(readFileSync(asset.destination)).digest('hex'),asset.sha256,asset.destination);
});
test('header uses one complete outlined lockup without a duplicate subtitle or icon',()=>{
 const source=readFileSync('components/approved/ApprovedBrand.tsx','utf8');
 assert.match(source,/approved-family-lockup/);
 assert.equal((source.match(/<img /g)||[]).length,1);
 assert.ok(!source.includes('approved-endorsement'));
 assert.match(source,/aria-label/);
 const css=readFileSync('app/approved-system.css','utf8');
 assert.match(css,/approved-family-lockup\{[^}]*height:auto/);
});
test('manifest icons resolve and maskable images use their padded variants',()=>{
 const web=JSON.parse(readFileSync('public/site.webmanifest','utf8'));
 for(const icon of web.icons){assert.ok(readFileSync('public'+icon.src).length>0);if(icon.purpose==='maskable')assert.match(icon.src,/brand-maskable-/);}
});
