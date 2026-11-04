from pathlib import Path
import subprocess,json,re
out=Path(__file__).resolve().parent
root=out.parents[2]
command=['./node_modules/.bin/supabase','start','--workdir',str(root),'--network-id','a-praca-v1-5-loopback','--exclude','realtime,storage-api,imgproxy,postgres-meta,studio,edge-runtime,logflare,vector,supavisor']
result=subprocess.run(command,cwd=root,text=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
def redact(text):
 text=re.sub(r'sb_(?:secret|publishable)_[A-Za-z0-9_-]+','[CHAVE_OMITIDA]',text)
 text=re.sub(r'eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+','[JWT_OMITIDO]',text)
 text=re.sub(r'(postgres(?:ql)?://)[^\s/@]+:[^\s/@]+@',r'\1[CREDENCIAL_OMITIDA]@',text)
 return text
(out/'start-stderr.log').write_text(redact(result.stderr))
summary={'command':command,'exit_code':result.returncode,'stdout':'Omitido integralmente: CLI pode retornar credenciais locais.'}
(out/'start.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(summary,ensure_ascii=False))
if result.returncode:
 try:
  detail=json.loads(result.stdout)
  error=detail.get('error',{})
  safe={'code':error.get('code'),'message':redact(str(error.get('message','Erro sem detalhe público.')))}
  (out/'start-error.json').write_text(json.dumps(safe,ensure_ascii=False,indent=2)+'\n')
  print(json.dumps(safe,ensure_ascii=False))
 except (ValueError,AttributeError):print('Falha de startup; stdout omitido por segurança.')
 print(redact(result.stderr)[-2000:])
raise SystemExit(result.returncode)
