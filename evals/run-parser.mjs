import {parseLocal} from '../src/core.js';
import {cases} from './parser-cases.mjs';
import {writeFile} from 'node:fs/promises';
const report={date:new Date().toISOString(),parser:process.argv[2]||'current',model:'none; deterministic local rules',source:'30 synthetic spec/feedback-class cases, not the user resume',runs:[]};
for(let run=0;run<3;run++){
 const results=cases.map(c=>{const actual=parseLocal(c.text);const failures=Object.entries(c.expected).filter(([path,value])=>path.split('.').reduce((o,k)=>o?.[k],actual)!==value).map(([path,expected])=>({path,expected,actual:path.split('.').reduce((o,k)=>o?.[k],actual)}));return {id:c.id,pass:failures.length===0,failures};});
 report.runs.push({passed:results.filter(r=>r.pass).length,total:results.length,results});
}
await writeFile(new URL(`./${report.parser}-results.json`,import.meta.url),JSON.stringify(report,null,2));
console.log(`${report.parser}: ${report.runs.map(r=>r.passed+'/'+r.total).join(', ')}; 3 runs`);
for(const result of report.runs[0].results.filter(r=>!r.pass))console.log('FAIL',result.id,JSON.stringify(result.failures));
