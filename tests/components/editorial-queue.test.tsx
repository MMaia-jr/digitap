// @vitest-environment jsdom
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
vi.mock('server-only',()=>({}));
const mocks=vi.hoisted(()=>({queue:vi.fn(),refresh:vi.fn(),redirect:vi.fn()}));
vi.mock('../../src/lib/activities/service.server',()=>({activities:{reviewQueue:mocks.queue}}));
vi.mock('next/navigation',()=>({useRouter:()=>({refresh:mocks.refresh}),redirect:mocks.redirect}));
import Queue from '../../src/app/admin/atividades/page';
import {ActivityError} from '../../src/lib/activities/domain';
const row={id:'30000000-0000-4000-8000-000000000001',titulo:'Oficina Fictícia',nome_publicador:'Pessoa Fictícia',descricao:'Descrição factual fictícia.',inicio_previsto:'2030-04-12T18:30:00Z',orientacao_acesso:'Acesso gratuito.',referencia_oficial:null,estado_editorial:'enviada',versao_submetida:1};
beforeEach(()=>{vi.clearAllMocks();mocks.queue.mockResolvedValue([row]);mocks.redirect.mockImplementation(()=>{throw new Error('REDIRECT_LOGIN');});});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it('lista somente a fila do serviço com sujeito, data e ações editoriais',async()=>{
 render(await Queue());expect(screen.getByText('Pessoa Fictícia')).toBeTruthy();
 expect(screen.getByRole('button',{name:'Aprovar Publicação'})).toBeTruthy();
 expect(screen.getByRole('button',{name:'Rejeitar'})).toBeTruthy();
 expect(document.querySelector('time')?.getAttribute('datetime')).toBe(row.inicio_previsto);
});
it('aprovação usa endpoint protegido e atualiza fila',async()=>{
 const fetcher=vi.fn().mockResolvedValue({ok:true,json:async()=>({message:'Atividade aprovada e publicada.'})});vi.stubGlobal('fetch',fetcher);
 render(await Queue());fireEvent.click(screen.getByRole('button',{name:'Aprovar Publicação'}));
 await waitFor(()=>expect(mocks.refresh).toHaveBeenCalledOnce());
 expect(fetcher.mock.calls[0][0]).toBe('/api/admin/atividades/'+row.id+'/decidir');
 expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({acao:'aprovar_publicacao',versao_esperada:1});
});
it('organização sem permissão não recebe atividades nem botões',async()=>{
 mocks.queue.mockRejectedValue(new ActivityError(403,'Acesso negado.'));render(await Queue());
 expect(screen.queryByText(row.titulo)).toBeNull();expect(screen.queryByRole('button',{name:'Aprovar Publicação'})).toBeNull();
 expect(screen.getByRole('heading',{name:'Acesso editorial indisponível'})).toBeTruthy();
});
it('visitante vai para login',async()=>{
 mocks.queue.mockRejectedValue(new ActivityError(401,'Autenticação necessária.'));
 await expect(Queue()).rejects.toThrow('REDIRECT_LOGIN');expect(mocks.redirect).toHaveBeenCalledWith('/login');
});

it('rejeição envia o motivo digitado, sem aprovar ou publicar',async()=>{
 const fetcher=vi.fn().mockResolvedValue({ok:true,json:async()=>({message:'Atividade rejeitada.'})});vi.stubGlobal('fetch',fetcher);
 render(await Queue());fireEvent.change(screen.getByLabelText('Motivo da rejeição'),{target:{value:'Faltam informações de acesso suficientes.'}});
 fireEvent.click(screen.getByRole('button',{name:'Rejeitar'}));await waitFor(()=>expect(mocks.refresh).toHaveBeenCalledOnce());
 expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({acao:'rejeitar',motivo:'Faltam informações de acesso suficientes.'});
});
