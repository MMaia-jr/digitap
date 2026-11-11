// @vitest-environment jsdom
import {beforeEach,afterEach,expect,it,vi} from 'vitest';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import {ActivityParticipation} from '../../src/components/ActivityParticipation';
const id='10000000-0000-4000-8000-000000000001';
const state={authenticated:true,resumo:{apoios:2,intencoes:3,nomes_publicos:['Nome autorizado'],aberta:true},minha_confirmacao:null};
beforeEach(()=>{
 Object.defineProperty(HTMLDialogElement.prototype,'showModal',{configurable:true,value:function(this:HTMLDialogElement){this.setAttribute('open','');}});
 Object.defineProperty(HTMLDialogElement.prototype,'close',{configurable:true,value:function(this:HTMLDialogElement){this.removeAttribute('open');}});
});
afterEach(()=>{cleanup();vi.unstubAllGlobals();delete (HTMLDialogElement.prototype as Partial<HTMLDialogElement>).showModal;delete (HTMLDialogElement.prototype as Partial<HTMLDialogElement>).close;});
function setup(authenticated=true){const fetcher=vi.fn().mockResolvedValue({ok:true,json:async()=>({...state,authenticated})});vi.stubGlobal('fetch',fetcher);return fetcher;}
it('mostra contadores e apenas nomes autorizados retornados pelo endpoint',async()=>{setup();render(<ActivityParticipation activityId={id}/>);expect(await screen.findByText('Nome autorizado')).toBeTruthy();expect(screen.getByText('2 apoios')).toBeTruthy();expect(screen.getByText('3 intenções')).toBeTruthy();expect(screen.getByText(/Apoio é simbólico/)).toBeTruthy();});
it('visitante recebe link de login e não envia confirmação',async()=>{const fetcher=setup(false);render(<ActivityParticipation activityId={id}/>);await screen.findByRole('link',{name:/Entre para apoiar/});expect((screen.getByRole('button',{name:'Apoiar'}) as HTMLButtonElement).disabled).toBe(true);expect(fetcher.mock.calls.every(c=>!c[1]?.method||c[1].method==='GET')).toBe(true);});
it('apoio envia somente tipo, sem contato ou identidade',async()=>{const fetcher=setup();render(<ActivityParticipation activityId={id}/>);const button=await screen.findByRole('button',{name:'Apoiar'});await waitFor(()=>expect((button as HTMLButtonElement).disabled).toBe(false));fetcher.mockResolvedValueOnce({ok:true,json:async()=>({message:'Apoio registrado.'})});fireEvent.click(button);await waitFor(()=>expect(fetcher).toHaveBeenCalledWith('/api/atividades/'+id+'/confirmacoes',expect.objectContaining({method:'POST',body:JSON.stringify({tipo:'apoio'})})));});
it('consentimento de nome público começa desmarcado e WhatsApp é opcional',async()=>{
 setup();
 render(<ActivityParticipation activityId={id}/>);const button=await screen.findByRole('button',{name:'Vou Participar'});await waitFor(()=>expect((button as HTMLButtonElement).disabled).toBe(false));fireEvent.click(button);
 expect((screen.getByRole('checkbox',{name:/Autorizo mostrar meu nome público/}) as HTMLInputElement).checked).toBe(false);expect((screen.getByLabelText('WhatsApp (opcional)') as HTMLInputElement).required).toBe(false);
});
it('modal envia intenção com consentimento opcional explícito e grupo',async()=>{
 const fetcher=setup();render(<ActivityParticipation activityId={id}/>);
 const button=await screen.findByRole('button',{name:'Vou Participar'});await waitFor(()=>expect((button as HTMLButtonElement).disabled).toBe(false));fireEvent.click(button);
 fireEvent.change(screen.getByLabelText('WhatsApp (opcional)'),{target:{value:'+5522999999999'}});
 fireEvent.change(screen.getByLabelText('Quantidade de pessoas, incluindo você'),{target:{value:'3'}});
 fireEvent.click(screen.getByRole('checkbox',{name:/Autorizo mostrar meu nome público/}));
 fetcher.mockResolvedValueOnce({ok:true,json:async()=>({message:'Intenção registrada.',confirmacao:{tipo:'intencao',acompanhantes:3,mostrar_nome:true}})});
 fireEvent.click(screen.getByRole('button',{name:'Registrar intenção'}));
 await waitFor(()=>expect(fetcher).toHaveBeenCalledWith('/api/atividades/'+id+'/confirmacoes',expect.objectContaining({method:'POST',body:JSON.stringify({tipo:'intencao',whatsapp:'+5522999999999',acompanhantes:3,mostrar_nome:true})})));
});
