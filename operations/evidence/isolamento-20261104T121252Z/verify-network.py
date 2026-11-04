from pathlib import Path
import subprocess,json,re,socket,ipaddress
OUT=Path(__file__).resolve().parent;ROOT=OUT.parents[2]
def command(args):return subprocess.run(args,cwd=ROOT,text=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
def stop_own():
 args=['./node_modules/.bin/supabase','stop','--project-id','a-praca-v1-5','--workdir',str(ROOT)]
 result=command(args)
 return {'command':args,'exit_code':result.returncode,'stdout_omitted':True,'volumes_delete_flag':False}
def connect(address,port):
 try:
  with socket.create_connection((address,port),timeout=1):return {'connected':True}
 except OSError as error:return {'connected':False,'errno':error.errno,'error_type':type(error).__name__}
ps=command(['docker','ps','--filter','name=^/supabase_.*_a-praca-v1-5$','--format','{{.ID}}\t{{.Names}}'])
if ps.returncode:raise SystemExit('Não foi possível inspecionar o Docker; nenhuma credencial impressa.')
containers=[];ports=set();protocols=set()
for line in ps.stdout.splitlines():
 ident,name=line.split('\t',1)
 if not name.startswith('supabase_') or not name.endswith('_a-praca-v1-5'):raise SystemExit('Container fora do escopo.')
 inspected=command(['docker','inspect','--format','{{json .NetworkSettings.Ports}}',ident]);listed=command(['docker','port',ident])
 if inspected.returncode or listed.returncode:raise SystemExit('Inspeção de portas inconclusiva.')
 bindings=json.loads(inspected.stdout) or {}
 containers.append({'id':ident,'name':name,'inspect_ports':bindings,'docker_port':listed.stdout.strip()})
 for internal,entries in bindings.items():
  for binding in entries or []:ports.add(int(binding['HostPort']));protocols.add(internal.rsplit('/',1)[1])
result={'containers':containers,'published_ports':sorted(ports),'protocols':sorted(protocols),'listeners':{},'positive':[],'negative':[],'ipv6_loopback_check':[],'limitations':['Provas de conexão executadas do próprio Mac; nenhum segundo dispositivo foi utilizado.','Metadados Docker Desktop 4.87.0 anunciam :: sem listener IPv6 visível; não equivalem à observação de bind real.','Teste negativo sozinho poderia ser mascarado por firewall; combinado com listeners e controle positivo.']}
failures=[];addresses_by_port={}
if not ports:failures.append('Nenhuma porta publicada identificada.')
if protocols-{'tcp'}:failures.append('Há protocolo não TCP; prova específica necessária.')
for port in sorted(ports):
 observed=command(['lsof','-nP',f'-iTCP:{port}','-sTCP:LISTEN'])
 result['listeners'][str(port)]={'exit_code':observed.returncode,'output':observed.stdout}
 addresses=[]
 for line in observed.stdout.splitlines()[1:]:
  match=re.search(r'\s(\S+):'+str(port)+r'\s+\(LISTEN\)$',line)
  if not match:failures.append(f'Listener não interpretado na porta {port}.');continue
  addr=match.group(1).strip('[]');addresses.append(addr)
  if addr not in {'127.0.0.1','::1'}:failures.append(f'Listener fora de loopback: {addr}:{port}')
 addresses_by_port[port]=addresses
 if observed.returncode or not addresses:failures.append(f'Listener não comprovado na porta {port}.')
if failures:
 result.update({'status':'FAILED_OR_INCONCLUSIVE','failures':failures,'stop':stop_own()})
 (OUT/'network.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'status':result['status'],'failures':failures,'stop':result['stop']},ensure_ascii=False));raise SystemExit(1)
interfaces=[];interface=None;up=False
conf=command(['/sbin/ifconfig','-a'])
if conf.returncode:failures.append('Não foi possível inventariar interfaces do Mac.')
for line in conf.stdout.splitlines():
 header=re.match(r'^([^\s:]+): flags=\d+<([^>]+)>',line)
 if header:interface=header.group(1);up='UP' in header.group(2).split(',') and 'LOOPBACK' not in header.group(2).split(',');continue
 match=re.match(r'\s+inet(6)?\s+(\S+)',line)
 if not match or not up:continue
 addr=match.group(2);base=addr.split('%')[0]
 try:ip=ipaddress.ip_address(base)
 except ValueError:continue
 if ip.is_loopback or ip.is_unspecified or ip.is_multicast:continue
 if ip.version==6 and ip.is_link_local and '%' not in addr:addr+='%' + interface
 interfaces.append({'interface':interface,'address':addr,'family':ip.version})
result['interfaces_tested']=interfaces
if not interfaces:failures.append('Nenhuma interface não-loopback disponível para teste negativo.')
for port in sorted(ports):
 for address in addresses_by_port[port]:
  check={'address':address,'port':port,**connect(address,port)};result['positive'].append(check)
  if not check['connected']:failures.append(f'Controle positivo falhou: {address}:{port}')
 if '::1' not in addresses_by_port[port]:
  check={'address':'::1','port':port,**connect('::1',port)};result['ipv6_loopback_check'].append(check)
  if check['connected']:failures.append(f'IPv6 aceita conexão sem listener comprovado: {port}')
 for item in interfaces:
  check={**item,'port':port,**connect(item['address'],port)};result['negative'].append(check)
  if check['connected']:failures.append(f"EXPOSTA: {item['interface']}:{port}")
if failures:result.update({'status':'FAILED_OR_INCONCLUSIVE','failures':failures,'stop':stop_own()})
else:result.update({'status':'LOCAL_EFFECTIVE_LOOPBACK_CONFIRMED','failures':[],'metadata_discrepancy':True})
(OUT/'network.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'status':result['status'],'ports':sorted(ports),'positive_pass':sum(x['connected'] for x in result['positive']),'negative_connections_accepted':sum(x['connected'] for x in result['negative']),'negative_probes':len(result['negative']),'interfaces':[x['interface'] for x in interfaces],'metadata_discrepancy':True,'failures':failures,'stop':result.get('stop')},ensure_ascii=False))
raise SystemExit(1 if failures else 0)
