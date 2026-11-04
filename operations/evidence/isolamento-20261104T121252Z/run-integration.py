from pathlib import Path
import subprocess,json,re
out=Path(__file__).resolve().parent;root=out.parents[2]
network=json.loads((out/'network.json').read_text())
if network['status']!='LOCAL_EFFECTIVE_LOOPBACK_CONFIRMED':raise SystemExit('Integração bloqueada por isolamento não comprovado.')
cmd=['npm','run','test:onboarding:db']
result=subprocess.run(cmd,cwd=root,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
text=result.stdout
text=re.sub(r'sb_(?:secret|publishable)_[A-Za-z0-9_-]+','[CHAVE_OMITIDA]',text)
text=re.sub(r'eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+','[JWT_OMITIDO]',text)
(out/'integration.log').write_text('$ '+' '.join(cmd)+'\n'+text)
line=next((line for line in text.splitlines() if re.match(r'^\s*Tests\s+',line)),'')
counts={state:int(n) for n,state in re.findall(r'(\d+)\s+(passed|failed|skipped|todo)',line)}
summary={'command':cmd,'exit_code':result.returncode,'PASS':counts.get('passed',0),'FAIL':counts.get('failed',0),'SKIP':counts.get('skipped',0),'TODO':counts.get('todo',0),'vitest_summary':line.strip()}
(out/'integration.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n');print(json.dumps(summary,ensure_ascii=False));print(text[-3500:])
raise SystemExit(result.returncode)
