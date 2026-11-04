import { mkdirSync,writeFileSync } from 'node:fs';
// Deliberately omit assertion values, request bodies, URLs with queries and stacks.
export default class Reporter {
  checks=[];
  onTestEnd(test,result){
    const status=result.status==='passed'?'PASS':result.status==='skipped'?'SKIP':'FAIL';
    const entry={id:test.title.split(':')[0],test:test.title,status,duration_ms:result.duration,
      errors:result.errors.map(e=>({category:e.message?.includes('Timeout')?'timeout':'assertion-or-runtime',lines:(e.stack??'').split('\n').filter(l=>/^\s+at .*tests\/e2e\//.test(l)).map(l=>l.replace(process.cwd(),'.'))}))};
    this.checks.push(entry);console.log(`${entry.id}: ${status}`);
  }
  onError(){console.log('Erro do runner; conteúdo omitido para proteger credenciais.');}
  onEnd(result){
    const summary={status:result.status,PASS:this.checks.filter(c=>c.status==='PASS').length,FAIL:this.checks.filter(c=>c.status==='FAIL').length,SKIP:this.checks.filter(c=>c.status==='SKIP').length,checks:this.checks};
    mkdirSync('operations/evidence/incremento-2c',{recursive:true});
    writeFileSync('operations/evidence/incremento-2c/e2e.json',JSON.stringify(summary,null,2)+'\n');
    console.log(JSON.stringify({status:summary.status,PASS:summary.PASS,FAIL:summary.FAIL,SKIP:summary.SKIP}));
  }
}
