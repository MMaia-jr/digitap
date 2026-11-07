// @vitest-environment jsdom
import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
const {refresh}=vi.hoisted(()=>({refresh:vi.fn()}));
vi.mock('next/navigation',()=>({useRouter:()=>({refresh})}));
import {SubmitActivityForm} from '../../src/components/SubmitActivityForm';
const id='30000000-0000-4000-8000-000000000001';
afterEach(()=>{cleanup();vi.clearAllMocks();vi.unstubAllGlobals();});
it('envio exige autorização deliberada do titular',()=>{
 const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);render(<SubmitActivityForm id={id} version={1} title="Encontro fictício"/>);
 expect((screen.getByRole('button',{name:'Enviar atividade para revisão'}) as HTMLButtonElement).disabled).toBe(true);
 fireEvent.submit(screen.getByRole('form'));expect(fetcher).not.toHaveBeenCalled();
});
it('envio inclui versão e consentimento, e atualiza painel sem publicar',async()=>{
 const fetcher=vi.fn().mockResolvedValue({ok:true,json:async()=>({message:'Enviada.'})});vi.stubGlobal('fetch',fetcher);
 render(<SubmitActivityForm id={id} version={2} title="Encontro fictício"/>);fireEvent.click(screen.getByRole('checkbox'));fireEvent.submit(screen.getByRole('form'));
 await waitFor(()=>expect(refresh).toHaveBeenCalledOnce());expect(fetcher.mock.calls[0][0]).toBe('/api/atividades/'+id+'/enviar');
 expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({versao_esperada:2,autoriza_publicacao:true});
});
it('erro mantém motivo visível e não anuncia envio concluído',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:false,json:async()=>({message:'O vínculo está indisponível.'})}));
 render(<SubmitActivityForm id={id} version={1} title="Encontro fictício"/>);fireEvent.click(screen.getByRole('checkbox'));fireEvent.submit(screen.getByRole('form'));
 expect((await screen.findByRole('alert')).textContent).toContain('vínculo está indisponível');expect(refresh).not.toHaveBeenCalled();
});
