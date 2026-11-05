// @vitest-environment jsdom
import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,cleanup,waitFor,act} from '@testing-library/react';
import {renderToString} from 'react-dom/server';
import {RecordWorkflowForm} from '../../src/components/RecordWorkflowForm';
import {ContestRecordForm} from '../../src/components/ContestRecordForm';
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
const props={id:'10000000-0000-4000-8000-000000000001',digest:'a'.repeat(64),state:'em_revisao',editorial:true,evidence:[]};
it('C05: SSR bloqueia ações até hidratação e aprovação não oferece publicação imediata',()=>{const doc=new DOMParser().parseFromString(renderToString(<RecordWorkflowForm {...props}/>),'text/html');expect([...doc.querySelectorAll('button')].every(b=>b.disabled)).toBe(true);expect(doc.body.textContent).not.toContain('Publicar registro');});
it('C05/C07: duplo clique não duplica; retry mantém chave e erro recebe foco',async()=>{
 let resolve!:(value:unknown)=>void;const f=vi.fn().mockImplementation(()=>new Promise(r=>resolve=r));vi.stubGlobal('fetch',f);render(<RecordWorkflowForm {...props}/>);fireEvent.change(screen.getByLabelText('Autorização específica do registro'),{target:{value:props.id}});const button=screen.getByRole('button',{name:'Aprovar registro'});act(()=>{fireEvent.click(button);fireEvent.click(button);});expect(f).toHaveBeenCalledTimes(1);const first=JSON.parse(f.mock.calls[0][1].body);expect(first).toMatchObject({acao:'aprovar',autorizacao_id:props.id,evidencias_aprovadas:[],conteudo_esperado:props.digest});await act(async()=>resolve({ok:false,json:async()=>({message:'Autorização recusada.'})}));const alert=await screen.findByRole('alert');await waitFor(()=>expect(document.activeElement).toBe(alert));fireEvent.click(button);expect(JSON.parse(f.mock.calls[1][1].body)).toEqual(first);await act(async()=>resolve({ok:false,json:async()=>({message:'Autorização recusada.'})}));
});
it('C08: registro contestado não oferece aprovação/publicação como resolução',()=>{render(<RecordWorkflowForm {...props} apuracao="contestado"/>);expect(screen.queryByRole('button',{name:'Aprovar registro'})).toBeNull();});
it('C08: divergência é enviada com hash esperado e erro é associado ao campo',async()=>{const f=vi.fn().mockResolvedValue({ok:false,json:async()=>({message:'Confira a divergência.',fields:{divergencia:'Texto obrigatório.'}})});vi.stubGlobal('fetch',f);render(<ContestRecordForm id={props.id} digest={props.digest}/>);fireEvent.submit(screen.getByRole('form',{name:'Contestação do registro'}));await screen.findByRole('alert');expect(screen.getByLabelText('Divergência registrada').getAttribute('aria-invalid')).toBe('true');expect(JSON.parse(f.mock.calls[0][1].body).conteudo_esperado).toBe(props.digest);});
