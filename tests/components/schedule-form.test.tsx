// @vitest-environment jsdom
import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {ScheduleForm} from '../../src/components/ScheduleForm';
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it('B10: formulário envia estado esperado e associa erro ao motivo',async()=>{
 const fetcher=vi.fn().mockResolvedValue({ok:false,json:async()=>({message:'Confira os campos.',fields:{motivo:'Motivo obrigatório.'}})});vi.stubGlobal('fetch',fetcher);
 render(<ScheduleForm id="10000000-0000-4000-8000-000000000001" version={1} state="programada"/>);
 fireEvent.change(screen.getByLabelText('Novo estado'),{target:{value:'cancelada'}});
 fireEvent.submit(screen.getByRole('form',{name:'Alteração da programação'}));
 await screen.findByRole('alert');expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({estado_programacao:'cancelada',estado_esperado:'programada',versao_esperada:1});
 expect(screen.getByLabelText('Motivo da alteração').getAttribute('aria-invalid')).toBe('true');
});
it('B10: clique no botão submete o formulário de programação',async()=>{
 const fetcher=vi.fn().mockResolvedValue({ok:false,json:async()=>({message:'Falha temporária.'})});vi.stubGlobal('fetch',fetcher);
 render(<ScheduleForm id="10000000-0000-4000-8000-000000000001" version={1} state="programada"/>);
 fireEvent.change(screen.getByLabelText('Motivo da alteração'),{target:{value:'Alteração fictícia confirmada.'}});
 fireEvent.click(screen.getByRole('button',{name:'Alterar programação'}));
 await screen.findByRole('alert');expect(fetcher).toHaveBeenCalledTimes(1);
});
