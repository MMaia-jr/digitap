// @vitest-environment jsdom
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {cleanup,render,screen,fireEvent,waitFor} from '@testing-library/react';
const viewer=vi.hoisted(()=>vi.fn());
vi.mock('server-only',()=>({}));
vi.mock('next/navigation',()=>({redirect:(path:string)=>{throw new Error('redirect:'+path);}}));
vi.mock('../../src/components/Viewer.server',()=>({getViewer:viewer}));
import {ProposalForm} from '../../src/components/ProposalForm';
import IdeaPage from '../../src/app/meu-espaco/ideia/page';
import Workspace from '../../src/app/meu-espaco/page';
import {AppHeader} from '../../src/components/AppHeader';
vi.mock('../../src/components/AuthForm',()=>({AuthForm:()=>null}));
const preview={estado:'revisao_humana_pendente',verificacao:'nao_verificada',dados:{
 sujeitos:[{tipo:'pessoa_fisica',descricao:'Ana',trecho:'Ana propõe'}],projetos:[{descricao:'Raízes',trecho:'projeto Raízes'}],
 atividades:[{descricao:'Oficina',trecho:'uma oficina'}],capacidades:[{descricao:'Ensinar',trecho:'pode ensinar'}],
 relacoes:[{origem:'Ana',destino:'Raízes',tipo:'colaboração proposta',trecho:'quer colaborar'}],
 fontes:[{descricao:'Relato',trecho:'relato da pessoa'}],informacoes_nao_verificadas:[{descricao:'Data pendente',trecho:'data a definir'}],
}};
beforeEach(()=>{viewer.mockResolvedValue({kind:'ready',name:'Ana',dashboard:'/meu-espaco'});});
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.clearAllMocks();});
it('entrada em Meu espaço e navegação de perfil existente permitem descrever ideia',async()=>{
 render(await Workspace());expect(screen.getByRole('link',{name:'Organizar uma ideia'}).getAttribute('href')).toBe('/meu-espaco/ideia');cleanup();
 viewer.mockResolvedValue({kind:'ready',name:'Ana',dashboard:'/dashboard/pessoa-fisica'});render(await AppHeader());expect(screen.getByRole('link',{name:'Descreva sua ideia'}).getAttribute('href')).toBe('/meu-espaco/ideia');
});
it('página exige sessão e falha fechada se indisponível',async()=>{
 viewer.mockResolvedValue({kind:'visitor'});await expect(IdeaPage()).rejects.toThrow('redirect:/login');viewer.mockResolvedValue({kind:'unavailable'});render(await IdeaPage());expect(screen.queryByRole('textbox')).toBeNull();
});
it('envia só o texto ao endpoint local e apresenta sete categorias não verificadas',async()=>{
 const f=vi.fn().mockResolvedValue({ok:true,json:async()=>({interpretacao:preview})});vi.stubGlobal('fetch',f);render(<ProposalForm/>);
 fireEvent.change(screen.getByLabelText('Sua proposta'),{target:{value:'Uma ideia de oficina'}});fireEvent.click(screen.getByRole('button',{name:'Interpretar proposta'}));
 await screen.findByRole('heading',{name:'Prévia para revisão humana'});
 expect(f).toHaveBeenCalledExactlyOnceWith('/api/propostas/interpretar',expect.objectContaining({method:'POST',credentials:'same-origin',body:JSON.stringify({texto:'Uma ideia de oficina'})}));
 for(const name of ['Possíveis sujeitos','Possíveis projetos','Atividades propostas','Capacidades declaradas','Relações alegadas','Fontes citadas','Informações não verificadas'])expect(screen.getByRole('heading',{name})).toBeTruthy();
 expect(screen.getByText('Ana propõe')).toBeTruthy();expect(screen.getByText(/^Interpretação não verificada\./)).toBeTruthy();expect(screen.queryByRole('button',{name:/publicar|salvar|criar vínculo/i})).toBeNull();
});
it('não aceita texto vazio e limita o tamanho no formulário',async()=>{
 const f=vi.fn();vi.stubGlobal('fetch',f);render(<ProposalForm/>);expect(screen.getByLabelText('Sua proposta').getAttribute('maxlength')).toBe('2000');fireEvent.submit(screen.getByRole('button',{name:'Interpretar proposta'}).closest('form')!);expect(f).not.toHaveBeenCalled();
});
it('impede envio duplicado durante a espera',async()=>{
 let finish!:(v:unknown)=>void;const f=vi.fn(()=>new Promise(resolve=>{finish=resolve;}));vi.stubGlobal('fetch',f);render(<ProposalForm/>);
 fireEvent.change(screen.getByLabelText('Sua proposta'),{target:{value:'Ideia'}});const form=screen.getByRole('button',{name:'Interpretar proposta'}).closest('form')!;fireEvent.submit(form);fireEvent.submit(form);expect(f).toHaveBeenCalledOnce();finish({ok:true,json:async()=>({interpretacao:preview})});await screen.findByRole('heading',{name:'Prévia para revisão humana'});
});
it.each([401,429,503])('falha HTTP %s nunca mostra detalhes internos',async status=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:false,status,json:async()=>({message:'SECRET_MARKER'})}));render(<ProposalForm/>);fireEvent.change(screen.getByLabelText('Sua proposta'),{target:{value:'Ideia'}});fireEvent.submit(screen.getByRole('button',{name:'Interpretar proposta'}).closest('form')!);await screen.findByRole('alert');expect(screen.queryByText(/SECRET_MARKER/)).toBeNull();
});
it('orçamento indisponível conserva o texto e explica que o resto do produto continua disponível',async()=>{
 const fetcher=vi.fn().mockResolvedValue({ok:false,status:402,json:async()=>({message:'SECRET_MARKER'})});
 vi.stubGlobal('fetch',fetcher);
 render(<ProposalForm/>);
 const field=screen.getByLabelText('Sua proposta') as HTMLTextAreaElement;
 fireEvent.change(field,{target:{value:'Uma ideia privada'}});
 fireEvent.click(screen.getByRole('button',{name:'Interpretar proposta'}));
 expect((await screen.findByRole('alert')).textContent).toContain('As demais funcionalidades continuam disponíveis.');
 expect(field.value).toBe('Uma ideia privada');
 expect(screen.queryByText(/SECRET_MARKER/)).toBeNull();
 expect(fetcher).toHaveBeenCalledOnce();
});
it('retira a ação de IA se o servidor informar revogação da autorização do beta e preserva o texto', async () => {
 const fetcher=vi.fn().mockResolvedValue(Response.json({fields:{interpretationAccess:'beta'}},{status:403}));
 vi.stubGlobal('fetch',fetcher);
 render(<ProposalForm/>);
 fireEvent.change(screen.getByLabelText('Sua proposta'),{target:{value:'Texto para preservar.'}});
 fireEvent.click(screen.getByRole('button',{name:'Interpretar proposta'}));
 expect((await screen.findByRole('alert')).textContent).toContain('reservada às contas autorizadas no beta');
 expect(screen.getByLabelText('Sua proposta')).toHaveProperty('value','Texto para preservar.');
 expect(screen.queryByRole('button',{name:'Interpretar proposta'})).toBeNull();
 expect(screen.queryByLabelText('Usar contexto autorizado')).toBeNull();
 expect(fetcher).toHaveBeenCalledOnce();
});
it('apresenta saída como texto, nunca como HTML executável',async()=>{
 const malicious={...preview,dados:{...preview.dados,atividades:[{descricao:'<img src=x onerror=alert(1)>',trecho:'trecho declarado'}]}};
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({interpretacao:malicious})}));render(<ProposalForm/>);fireEvent.change(screen.getByLabelText('Sua proposta'),{target:{value:'Ideia'}});fireEvent.submit(screen.getByRole('button',{name:'Interpretar proposta'}).closest('form')!);await screen.findByRole('heading',{name:'Prévia para revisão humana'});expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeTruthy();expect(document.querySelector('img[src="x"]')).toBeNull();
});
it('editar a proposta descarta a prévia anterior',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({interpretacao:preview})}));render(<ProposalForm/>);fireEvent.change(screen.getByLabelText('Sua proposta'),{target:{value:'Ideia'}});fireEvent.submit(screen.getByRole('button',{name:'Interpretar proposta'}).closest('form')!);await screen.findByRole('heading',{name:'Prévia para revisão humana'});fireEvent.change(screen.getByLabelText('Sua proposta'),{target:{value:'Outra ideia'}});await waitFor(()=>expect(screen.queryByRole('heading',{name:'Prévia para revisão humana'})).toBeNull());
});
it('permite optar pelo contexto, escolher um sujeito e consentir separadamente com o envio ao provedor',async()=>{
 const subjectId='22222222-2222-4222-8222-222222222222';
 const f=vi.fn().mockImplementation(async(url:string)=>url==='/api/e4?action=subjects'
  ?{ok:true,json:async()=>({subjects:[{id:subjectId,name:'Pessoa sintética Alfa',type:'pessoa_fisica'}]})}
  :{ok:true,json:async()=>({interpretacao:preview})});
 vi.stubGlobal('fetch',f);render(<ProposalForm/>);
 expect(screen.getByLabelText('Usar contexto autorizado')).toBeTruthy();
 fireEvent.click(screen.getByLabelText('Usar contexto autorizado'));
 expect(screen.getByText(/contexto selecionado poderá conter dados privados.*será enviado a um provedor externo de IA/i)).toBeTruthy();
 await screen.findByRole('option',{name:/Pessoa sintética Alfa/});
 expect((screen.getByLabelText('Sujeito do contexto') as HTMLSelectElement).value).toBe('');
 fireEvent.change(screen.getByLabelText('Sua proposta'),{target:{value:'Uma oficina gratuita'}});
 fireEvent.change(screen.getByLabelText('Sujeito do contexto'),{target:{value:subjectId}});
 fireEvent.submit(screen.getByRole('button',{name:'Interpretar proposta'}).closest('form')!);
 await screen.findByRole('alert');expect(f).toHaveBeenCalledTimes(1);
 fireEvent.click(screen.getByLabelText('Autorizo o envio do contexto selecionado ao provedor de IA'));
 fireEvent.submit(screen.getByRole('button',{name:'Interpretar proposta'}).closest('form')!);
 await screen.findByRole('heading',{name:'Prévia para revisão humana'});
 expect(f).toHaveBeenNthCalledWith(2,'/api/propostas/interpretar',expect.objectContaining({
  method:'POST',credentials:'same-origin',body:JSON.stringify({texto:'Uma oficina gratuita',contexto:{subjectId,consentimento:true}}),
 }));
 expect(screen.getByText(/^Interpretação não verificada\./)).toBeTruthy();
 expect(screen.queryByRole('button',{name:/publicar|criar atividade/i})).toBeNull();
});

it('invalida a prévia ao ativar ou desativar o contexto depois de interpretar', async () => {
  const subjectId = '22222222-2222-4222-8222-222222222222';
  const save = vi.fn().mockResolvedValue(undefined);
  const f = vi.fn().mockImplementation(async (url: string) => url === '/api/e4?action=subjects'
    ? { ok: true, json: async () => ({ subjects: [{ id: subjectId, name: 'Pessoa sintética Alfa', type: 'pessoa_fisica' }] }) }
    : { ok: true, json: async () => ({ interpretacao: preview }) });
  vi.stubGlobal('fetch', f);
  render(<ProposalForm onSave={save} />);
  fireEvent.change(screen.getByLabelText('Sua proposta'), { target: { value: 'Uma oficina gratuita' } });
  fireEvent.click(screen.getByRole('button', { name: 'Interpretar proposta' }));
  await screen.findByRole('heading', { name: 'Prévia para revisão humana' });
  expect(screen.getByRole('button', { name: 'Salvar rascunho' })).toBeTruthy();

  fireEvent.click(screen.getByLabelText('Usar contexto autorizado'));
  await waitFor(() => expect(screen.queryByRole('heading', { name: 'Prévia para revisão humana' })).toBeNull());
  expect(screen.queryByRole('button', { name: 'Salvar rascunho' })).toBeNull();

  await screen.findByRole('option', { name: /Pessoa sintética Alfa/ });
  fireEvent.change(screen.getByLabelText('Sujeito do contexto'), { target: { value: subjectId } });
  fireEvent.click(screen.getByLabelText('Autorizo o envio do contexto selecionado ao provedor de IA'));
  fireEvent.click(screen.getByRole('button', { name: 'Interpretar proposta' }));
  await screen.findByRole('heading', { name: 'Prévia para revisão humana' });

  fireEvent.click(screen.getByLabelText('Usar contexto autorizado'));
  await waitFor(() => expect(screen.queryByRole('heading', { name: 'Prévia para revisão humana' })).toBeNull());
  expect(screen.queryByRole('button', { name: 'Salvar rascunho' })).toBeNull();
  expect(save).not.toHaveBeenCalled();
  expect(f).toHaveBeenCalledTimes(3); // duas interpretações e uma consulta E4
});

it('invalida a prévia contextual e revoga o consentimento ao mudar de sujeito', async () => {
  const first = '22222222-2222-4222-8222-222222222222';
  const second = '33333333-3333-4333-8333-333333333333';
  const f = vi.fn().mockImplementation(async (url: string) => url === '/api/e4?action=subjects'
    ? { ok: true, json: async () => ({ subjects: [
      { id: first, name: 'Pessoa sintética Alfa', type: 'pessoa_fisica' },
      { id: second, name: 'Coletivo sintético Beta', type: 'coletivo_informal' },
    ] }) }
    : { ok: true, json: async () => ({ interpretacao: preview }) });
  vi.stubGlobal('fetch', f);
  render(<ProposalForm />);
  fireEvent.change(screen.getByLabelText('Sua proposta'), { target: { value: 'Uma oficina gratuita' } });
  fireEvent.click(screen.getByLabelText('Usar contexto autorizado'));
  await screen.findByRole('option', { name: /Pessoa sintética Alfa/ });
  fireEvent.change(screen.getByLabelText('Sujeito do contexto'), { target: { value: first } });
  fireEvent.click(screen.getByLabelText('Autorizo o envio do contexto selecionado ao provedor de IA'));
  fireEvent.click(screen.getByRole('button', { name: 'Interpretar proposta' }));
  await screen.findByRole('heading', { name: 'Prévia para revisão humana' });

  fireEvent.change(screen.getByLabelText('Sujeito do contexto'), { target: { value: second } });
  await waitFor(() => expect(screen.queryByRole('heading', { name: 'Prévia para revisão humana' })).toBeNull());
  expect((screen.getByLabelText('Autorizo o envio do contexto selecionado ao provedor de IA') as HTMLInputElement).checked).toBe(false);
  expect(f).toHaveBeenCalledTimes(2); // não envia nada ao provedor ao trocar de sujeito
});

it('permite cancelar a espera sem aceitar uma resposta tardia', async()=>{
 let finish!:(value:unknown)=>void;
 const transport=vi.fn<(url:string,init:RequestInit)=>Promise<unknown>>(()=>new Promise(resolve=>{finish=resolve;}));
 vi.stubGlobal('fetch',transport);
 render(<ProposalForm/>);
 fireEvent.change(screen.getByLabelText('Sua proposta'),{target:{value:'Uma ideia de oficina'}});
 fireEvent.click(screen.getByRole('button',{name:'Interpretar proposta'}));
 expect(screen.getByRole('status').textContent).toContain('Aguarde');
 fireEvent.click(screen.getByRole('button',{name:'Cancelar interpretação'}));
 expect(transport.mock.calls[0][1].signal?.aborted).toBe(true);
 finish({ok:true,json:async()=>({interpretacao:preview})});
 await screen.findByText('Interpretação cancelada.');
 expect(screen.queryByRole('heading',{name:'Prévia para revisão humana'})).toBeNull();
});
