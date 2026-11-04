// @vitest-environment jsdom
import {it,afterEach,expect,vi} from 'vitest';
import {render,screen,fireEvent,cleanup,act} from '@testing-library/react';
import {renderToString} from 'react-dom/server';
import {ReviewForm} from '../../src/components/ReviewForm';
const activity={id:'10000000-0000-4000-8000-000000000001',titulo:'Atividade fictícia',descricao:'Descrição fictícia de revisão.',inicio_previsto:'2030-04-12T18:30:00Z',orientacao_acesso:'Entrada fictícia.',referencia_oficial:null,versao_submetida:1,estado_editorial:'enviada' as const};
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it('SSR bloqueia ações até hidratação e não oferece aprovação de enviada',()=>{
 const doc=new DOMParser().parseFromString(renderToString(<ReviewForm activity={activity}/>),'text/html');
 const buttons=[...doc.querySelectorAll('button')];expect(buttons.length).toBe(3);expect(buttons.every(b=>b.disabled)).toBe(true);expect(doc.body.textContent).not.toContain('Aprovar versão');
});
it('duplo clique e retry após falha mantêm uma requisição e a chave original',async()=>{
 let release!:(result:unknown)=>void;const fetcher=vi.fn().mockImplementation(()=>new Promise(r=>{release=r;}));vi.stubGlobal('fetch',fetcher);
 render(<ReviewForm activity={activity}/>);const button=screen.getByRole('button',{name:'Iniciar revisão'});
 act(()=>{fireEvent.click(button);fireEvent.click(button);});expect(fetcher).toHaveBeenCalledTimes(1);
 const first=JSON.parse(fetcher.mock.calls[0][1].body);expect(first).toMatchObject({acao:'iniciar',estado_esperado:'enviada',versao_esperada:1});
 await act(async()=>release({ok:false,json:async()=>({message:'Falha temporária.'})}));
 fireEvent.click(button);expect(fetcher).toHaveBeenCalledTimes(2);expect(JSON.parse(fetcher.mock.calls[1][1].body).pedido_id).toBe(first.pedido_id);
 await act(async()=>release({ok:false,json:async()=>({message:'Falha temporária.'})}));
});
it('motivo recusado recebe foco e erro associado ao campo',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:false,json:async()=>({message:'Confira os campos.',fields:{motivo:'Motivo obrigatório.'}})}));
 render(<ReviewForm activity={activity}/>);fireEvent.click(screen.getByRole('button',{name:'Devolver atividade'}));
 const alert=await screen.findByRole('alert');expect(document.activeElement).toBe(alert);expect(screen.getByLabelText('Motivo (devolução ou rejeição)').getAttribute('aria-describedby')).toBe('motivo-error');
});
