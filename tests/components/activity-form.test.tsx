// @vitest-environment jsdom
import { afterEach,it,expect,vi } from 'vitest';
import { render,screen,fireEvent,cleanup,waitFor } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { ActivityForm } from '../../src/components/ActivityForm';
import type { IdeaView } from '../../src/lib/ideas/service.server';
import type { ActionTemplate } from '../../src/lib/actions/catalog';
const activity={id:'30000000-0000-4000-8000-000000000001',titulo:'Atividade fictícia',descricao:'Descrição inteiramente fictícia.',inicio_previsto:'2030-04-12T18:30:00Z',orientacao_acesso:'Entrada fictícia gratuita.',referencia_oficial:null,estado_editorial:'rascunho' as const,versao_submetida:1};
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it('B02/B04: mudança não salva impede envio acidental da versão anterior',()=>{
 render(<ActivityForm activity={activity}/>);
 expect(screen.getByRole('button',{name:'Enviar atividade'}).hasAttribute('disabled')).toBe(false);
 fireEvent.change(screen.getByLabelText('Título'),{target:{value:''}});
 expect(screen.getByRole('button',{name:'Enviar atividade'}).hasAttribute('disabled')).toBe(true);
});
it('B01: HTML de rascunho bloqueia submit antes da hidratação',()=>{
 const html=renderToString(<ActivityForm/>);const document=new DOMParser().parseFromString(html,'text/html');expect(document.querySelector('button')?.disabled).toBe(true);
});
it('B03: data local inválida recebe erro acessível e não faz requisição',async()=>{
 const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);render(<ActivityForm/>);
 fireEvent.submit(screen.getByRole('form',{name:'Nova atividade'}));
 const alert=await screen.findByRole('alert');expect(document.activeElement).toBe(alert);expect(fetcher).not.toHaveBeenCalled();
 expect(screen.getByLabelText('Data e horário (America/Sao_Paulo)').getAttribute('aria-invalid')).toBe('true');
});

it('E3: conversão mostra sugestão revisada, exige complementos e envia ação explícita uma única vez', async () => {
 const interpretation={estado:'revisao_humana_pendente' as const,verificacao:'nao_verificada' as const,dados:{sujeitos:[],projetos:[],atividades:[{descricao:'Oficina sugerida pela pessoa',trecho:'oficina comunitária'}],capacidades:[],relacoes:[],fontes:[],informacoes_nao_verificadas:[]}};
 const idea:IdeaView={id:'33333333-3333-4333-8333-333333333333',title:'Raízes em Movimento',original_text:'Pessoa relata oficina comunitária.',revised_text:'Texto revisado da proposta.',original_interpretation:interpretation,revised_interpretation:interpretation,version:4,created_at:'2026-11-15T00:00:00Z',updated_at:'2026-11-15T00:00:00Z'};
 const fetcher=vi.fn().mockResolvedValue({ok:true,json:async()=>({next:'/dashboard/atividade/55555555-5555-4555-8555-555555555555'})});
 const navigate=vi.fn();vi.stubGlobal('fetch',fetcher);vi.stubGlobal('crypto',{randomUUID:()=> '44444444-4444-4444-8444-444444444444'});
 render(<ActivityForm sourceIdea={idea} returnTo="/dashboard/pessoa-fisica" onNavigate={navigate}/>);
 expect((screen.getByLabelText('Título') as HTMLInputElement).value).toBe('Raízes em Movimento');
 expect((screen.getByLabelText('Descrição') as HTMLTextAreaElement).value).toBe('Oficina sugerida pela pessoa');
 expect(screen.getByRole('button',{name:'Criar rascunho privado a partir desta ideia'})).toBeTruthy();
 fireEvent.change(screen.getByLabelText('Data e horário (America/Sao_Paulo)'),{target:{value:'2035-04-12T18:30'}});
 fireEvent.change(screen.getByLabelText('Orientação de acesso'),{target:{value:'A pessoa preencherá este acesso.'}});
 fireEvent.submit(screen.getByRole('form',{name:'Nova atividade'}));
 await waitFor(()=>expect(fetcher).toHaveBeenCalledOnce());
 expect(fetcher.mock.calls[0][0]).toBe(`/api/ideias/${idea.id}/atividade`);
 expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({versao_esperada:4,pedido_id:'44444444-4444-4444-8444-444444444444',titulo:'Raízes em Movimento',descricao:'Oficina sugerida pela pessoa'});
 expect(navigate).toHaveBeenCalledWith('/dashboard/pessoa-fisica');
});

it('E4.1: adapta um modelo e cria somente um rascunho após confirmação explícita', async () => {
 const template: ActionTemplate = {
  id: 'acao-v1-boletim-comunitario', title: 'Produzir boletim de informação comunitária',
  objective: 'Reunir informações úteis escolhidas pela comunidade.', category: 'comunicacao',
  experience: 'iniciante', effort: '2 a 4 horas, estimativa indicativa', effortBand: 'leve', modality: 'remota',
  stages: ['Definir tema e público com participantes.'], expectedOutcome: 'Uma primeira versão revisável.',
  care: ['Verificar autorização antes de reproduzir conteúdo de terceiros.'],
 };
 const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ next: '/dashboard/atividade/55555555-5555-4555-8555-555555555555' }) });
 const navigate = vi.fn();
 vi.stubGlobal('fetch', fetcher);
 render(<ActivityForm actionTemplate={template} returnTo="/dashboard/pessoa-fisica" onNavigate={navigate} />);
 expect((screen.getByLabelText('Título') as HTMLInputElement).value).toBe(template.title);
 expect((screen.getByLabelText('Descrição') as HTMLTextAreaElement).value).toContain(template.objective);
 expect(screen.getByText(/modelo sugerido; ainda não é uma atividade real/i)).toBeTruthy();
 fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Boletim local adaptado' } });
 fireEvent.change(screen.getByLabelText('Descrição'), { target: { value: 'Descrição adaptada pela pessoa.' } });
 fireEvent.change(screen.getByLabelText('Data e horário (America/Sao_Paulo)'), { target: { value: '2035-04-12T18:30' } });
 fireEvent.change(screen.getByLabelText('Orientação de acesso'), { target: { value: 'Condições serão combinadas.' } });
 fireEvent.submit(screen.getByRole('form', { name: 'Nova atividade' }));
 await waitFor(() => expect(fetcher).toHaveBeenCalledOnce());
 expect(fetcher.mock.calls[0][0]).toBe('/api/atividades');
 expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({ titulo: 'Boletim local adaptado', descricao: 'Descrição adaptada pela pessoa.' });
 expect(navigate).toHaveBeenCalledWith('/dashboard/pessoa-fisica');
});

it('AFLORA-02: reabre edição retrospectiva sem mudar o horário original de São Paulo',async()=>{
 const fetcher=vi.fn().mockResolvedValue({ok:true,json:async()=>({next:'/dashboard/atividade/'+activity.id})});
 vi.stubGlobal('fetch',fetcher);
 const rendered=render(<ActivityForm activity={{...activity,inicio_previsto:'2026-11-18T17:15:00.000Z',retrospectiva:true}} allowRetrospective onNavigate={()=>{}}/>);
 expect((screen.getByRole('checkbox',{name:'Esta atividade já aconteceu'}) as HTMLInputElement).checked).toBe(true);
 expect((rendered.container.querySelector('#inicio_previsto') as HTMLInputElement).value).toBe('2026-11-18T14:15');
 fireEvent.submit(screen.getByRole('form',{name:'Editar rascunho'}));
 await waitFor(()=>expect(fetcher).toHaveBeenCalledOnce());
 expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({inicio_previsto:'2026-11-18T17:15:00.000Z',retrospectiva:true});
});

it('AUT-ORG-01: consentimento começa desmarcado e só segue no envio da versão',async()=>{
 const fetcher=vi.fn().mockResolvedValue({ok:true,json:async()=>({next:'/dashboard/atividade/'+activity.id})});
 vi.stubGlobal('fetch',fetcher);
 render(<ActivityForm activity={activity} organizationConsent="required" onNavigate={()=>{}}/>);
 const consent=screen.getByRole('checkbox',{name:/Autorizo a divulgação desta versão/}) as HTMLInputElement;
 const send=screen.getByRole('button',{name:'Enviar atividade'}) as HTMLButtonElement;
 const save=screen.getByRole('button',{name:'Salvar alterações'}) as HTMLButtonElement;
 expect(consent.checked).toBe(false);
 expect(send.disabled).toBe(true);
 expect(save.disabled).toBe(false);
 fireEvent.click(consent);
 expect(send.disabled).toBe(false);
 fireEvent.click(send);
 await waitFor(()=>expect(fetcher).toHaveBeenCalledOnce());
 expect(fetcher.mock.calls[0][0]).toBe('/api/atividades/'+activity.id+'/enviar');
 expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({versao_esperada:1,autoriza_publicacao:true});
});

it('AUT-ORG-01: salvar continua privado e a edição exige nova escolha de versão',async()=>{
 const fetcher=vi.fn().mockResolvedValue({ok:true,json:async()=>({next:'/dashboard/atividade/'+activity.id})});
 vi.stubGlobal('fetch',fetcher);
 const onNavigate=vi.fn();
 const {rerender}=render(<ActivityForm activity={activity} organizationConsent="required" onNavigate={onNavigate}/>);
 const option=()=>screen.getByRole('checkbox',{name:/Autorizo a divulgação desta versão/}) as HTMLInputElement;
 fireEvent.click(option());
 fireEvent.submit(screen.getByRole('form',{name:'Editar rascunho'}));
 await waitFor(()=>expect(onNavigate).toHaveBeenCalledOnce());
 expect(fetcher.mock.calls[0][1].method).toBe('PATCH');
 expect(JSON.parse(fetcher.mock.calls[0][1].body)).not.toHaveProperty('autoriza_publicacao');
 rerender(<ActivityForm activity={{...activity,versao_submetida:2}} organizationConsent="required" onNavigate={onNavigate}/>);
 expect(option().checked).toBe(false);
 expect((screen.getByRole('button',{name:'Enviar atividade'}) as HTMLButtonElement).disabled).toBe(true);
});

it('AUT-ORG-01: sem escopo de autorização mantém edição e bloqueia envio',()=>{
 render(<ActivityForm activity={activity} organizationConsent="unavailable"/>);
 expect(screen.queryByRole('checkbox',{name:/Autorizo a divulgação desta versão/})).toBeNull();
 expect((screen.getByRole('button',{name:'Enviar atividade'}) as HTMLButtonElement).disabled).toBe(true);
 expect((screen.getByRole('button',{name:'Salvar alterações'}) as HTMLButtonElement).disabled).toBe(false);
});

it('AUT-ORG-01: representação com escopo de envio não ganha controles de edição',async()=>{
 const fetcher=vi.fn().mockResolvedValue({ok:true,json:async()=>({next:'/dashboard/atividade/'+activity.id})});
 vi.stubGlobal('fetch',fetcher);
 render(<ActivityForm activity={activity} organizationConsent="required" sendOnly onNavigate={()=>{}}/>);
 expect(screen.queryByRole('button',{name:'Salvar alterações'})).toBeNull();
 expect(screen.queryByLabelText('Título')).toBeNull();
 fireEvent.submit(screen.getByRole('form'));
 expect(fetcher).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('checkbox',{name:/Autorizo a divulgação desta versão/}));
 fireEvent.click(screen.getByRole('button',{name:'Enviar atividade'}));
 await waitFor(()=>expect(fetcher).toHaveBeenCalledOnce());
 expect(fetcher.mock.calls[0][1].method).toBe('POST');
});
