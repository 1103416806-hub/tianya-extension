import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../src/pdf-compat.js',import.meta.url),'utf8');
test('Promise fallback resolves values',async()=>{
 const kit=runInNewContext('delete Promise.withResolvers;'+source+';Promise.withResolvers()');kit.resolve('ok');assert.equal(await kit.promise,'ok');
});
test('Promise fallback preserves rejection and subclasses',async()=>{
 const result=runInNewContext('delete Promise.withResolvers;'+source+';class Custom extends Promise{};const kit=Custom.withResolvers();({kit,isSubclass:kit.promise instanceof Custom})');assert.equal(result.isSubclass,true);result.kit.reject(new Error('expected'));await assert.rejects(result.kit.promise,/expected/);
});
test('Existing native implementation is never replaced',()=>{
 assert.equal(runInNewContext('const before=Promise.withResolvers;'+source+';Promise.withResolvers===before'),true);
});
