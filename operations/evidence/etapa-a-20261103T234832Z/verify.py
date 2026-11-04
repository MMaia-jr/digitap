from pathlib import Path
import base64,json,os,re,secrets,subprocess,sys
ROOT=Path(__file__).resolve().parents[3]
OUT=Path(__file__).resolve().parent
os.chdir(ROOT)
KEYS=('SUPABASE_SECRET_KEY','APOIO_HMAC_SECRET')
actual={key:set() for key in KEYS}
for key in KEYS:
    if os.environ.get(key): actual[key].add(os.environ[key])
for name in ('.env','.env.local','.env.production','.env.production.local'):
    file=ROOT/name
    if not file.is_file():continue
    for line in file.read_text().splitlines():
        found=re.match(r'^\s*(?:export\s+)?(SUPABASE_SECRET_KEY|APOIO_HMAC_SECRET)\s*=\s*(.*?)\s*$',line)
        if not found:continue
        key,value=found.groups()
        if len(value)>1 and value[0]==value[-1] and value[0] in ('"',"'"):value=value[1:-1]
        else:value=value.split(' #',1)[0].strip()
        if value and '$' not in value and not re.search('SUBSTITUIR|FICTICI|SOMENTE_SERVIDOR|SEGREDO_ALEATORIO',value,re.I):actual[key].add(value)
canaries={'SUPABASE_SECRET_KEY':'sb_secret_'+secrets.token_urlsafe(32),'APOIO_HMAC_SECRET':secrets.token_urlsafe(48)}
values={key:actual[key]|{canaries[key]} for key in KEYS}
def variants(value):
    data=value.encode()
    return [data,base64.b64encode(data),base64.urlsafe_b64encode(data).rstrip(b'=')]
def hits(data):
    return [key for key in KEYS if any(part in data for value in values[key] for part in variants(value))]
def sanitized(text):
    for key in KEYS:
        for value in values[key]:
            for part in variants(value):text=text.replace(part.decode(),'[VALOR_REDACTADO]')
    return text
# Positive control stays in memory: prove that the exact-value detector can find both canaries.
assert set(hits((' '.join(canaries.values())).encode()))==set(KEYS)
results={};raw_log_matches=[]
for command,name in [(['npm','test'],'test'),(['npm','run','lint'],'lint'),(['npm','run','typecheck'],'typecheck'),(['npm','run','build'],'build')]:
    env=os.environ.copy();env['NO_COLOR']='1';env['NEXT_TELEMETRY_DISABLED']='1'
    if name=='build':env.update(canaries)
    result=subprocess.run(command,env=env,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
    raw=result.stdout
    if hits(raw.encode()):raw_log_matches.append(name)
    (OUT/(name+'.log')).write_text(sanitized('$ '+' '.join(command)+'\n'+raw))
    results[name]={'command':' '.join(command),'exit_code':result.returncode}
    if name=='test':
        summary=next((line for line in raw.splitlines() if re.match(r'^\s*Tests\s+',line)), '')
        counts={state:int(count) for count,state in re.findall(r'(\d+)\s+(passed|failed|skipped|todo)',summary)}
        results[name].update({'summary':summary.strip(),'PASS':counts.get('passed',0),'FAIL':counts.get('failed',0),'SKIP':counts.get('skipped',0),'TODO':counts.get('todo',0)})
public=set()
for directory in ('.next/static','public','out'):
    path=ROOT/directory
    if path.is_dir():public.update(p for p in path.rglob('*') if p.is_file())
for directory in ('.next/server/app','.next/server/pages'):
    path=ROOT/directory
    if path.is_dir():public.update(p for p in path.rglob('*') if p.is_file() and p.suffix in ('.html','.rsc','.body','.txt','.json'))
public_matches=[str(p.relative_to(ROOT)) for p in sorted(public) if hits(p.read_bytes())]
logfiles=[p for p in (ROOT/'operations').rglob('*') if p.is_file() and p.suffix in ('.log','.json','.md','.txt')]
logmatches=[str(p.relative_to(ROOT)) for p in logfiles if hits(p.read_bytes())]
tracked=subprocess.check_output(['git','ls-files','-z']).split(b'\0');tracked=[p.decode() for p in tracked if p]
working_matches=[p for p in tracked if (ROOT/p).is_file() and hits((ROOT/p).read_bytes())]
commits=subprocess.check_output(['git','rev-list','--all'],text=True).splitlines()
blobs=set()
for commit in commits:
    for line in subprocess.check_output(['git','ls-tree','-r',commit],text=True).splitlines():
        fields=line.split(None,3)
        if len(fields)>2 and fields[1]=='blob':blobs.add(fields[2])
history_matches=[]
for blob in blobs:
    if hits(subprocess.check_output(['git','cat-file','blob',blob])):history_matches.append(blob)
summary={'commands':results,'database_tests':{'PASS':0,'FAIL':0,'SKIP':0,'NOT_RUN':89,'reason':'85 casos de segurança + 4 onboarding; stack parado, não executados.'},'canary_scan':{'positive_control_in_memory':'PASS','canaries_set_for_build':list(KEYS),'actual_values_available':{key:bool(actual[key]) for key in KEYS},'public_files_scanned':len(public),'static_files_scanned':sum('/.next/static/' in str(p) for p in public),'public_value_matches':public_matches,'raw_command_logs_with_matches':raw_log_matches,'operation_files_scanned':len(logfiles),'operation_value_matches':logmatches,'tracked_files_scanned':len(tracked),'tracked_value_matches':working_matches,'git_commits_scanned':len(commits),'git_blobs_scanned':len(blobs),'git_history_value_matches':history_matches,'scope':'Comparação exata e Base64 de canários/valores disponíveis. Sem tráfego autenticado real, cookies ou execução dinâmica em navegador.'}}
(OUT/'results.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
(OUT/'git-log.txt').write_text(subprocess.check_output(['git','log','--oneline','-10'],text=True))
(OUT/'git-status.txt').write_text(subprocess.check_output(['git','status','--short','--untracked-files=all'],text=True))
print(json.dumps({'evidence':str(OUT.relative_to(ROOT)),'results':summary},ensure_ascii=False))
