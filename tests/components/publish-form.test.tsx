// @vitest-environment jsdom
import {it,expect,afterEach,vi} from 'vitest';
import {render,screen,fireEvent,act,cleanup} from '@testing-library/react';
import {renderToString} from 'react-dom/server';
import {PublishForm} from '../../src/components/PublishForm';
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
const props={id:'10000000-0000-4000-8000-000000000001',version:1};
it('publicação exige ação explícita e fica desabilitada no HTML antes da hidratação',()=>{const d=new DOMParser().parseFromString(renderToString(<PublishForm {...props}/>),'text/html');expect(d.querySelector('button')?.disabled).toBe(true);expect(d.body.textContent).toContain('versão aprovada');});
it('duplo clique e retry de falha reutilizam pedido, sem payload de snapshot ou autorização',async()=>{
 let release!:(r:unknown)=>void;const fetcher=vi.fn().mockImplementation(()=>new Promise(r=>{release=r;}));vi.stubGlobal('fetch',fetcher);render(<PublishForm {...props}/>);
 const b=screen.getByRole('button',{name:'Publicar versão aprovada'});act(()=>{fireEvent.click(b);fireEvent.click(b);});expect(fetcher).toHaveBeenCalledTimes(1);const first=JSON.parse(fetcher.mock.calls[0][1].body);expect(Object.keys(first).sort()).toEqual(['pedido_id','versao_esperada']);
 await act(async()=>release({ok:false,json:async()=>({message:'Falha temporária.'})}));fireEvent.click(b);expect(JSON.parse(fetcher.mock.calls[1][1].body)).toEqual(first);await act(async()=>release({ok:false,json:async()=>({message:'Falha temporária.'})}));
});
