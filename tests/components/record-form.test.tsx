// @vitest-environment jsdom
import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {RecordForm} from '../../src/components/RecordForm';
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it('C01: registro envia relato privado e apresenta erro de data associado',async()=>{
 const fetcher=vi.fn().mockResolvedValue({ok:false,json:async()=>({message:'Data futura.',fields:{data_realizacao:'Não informe realização futura.'}})});vi.stubGlobal('fetch',fetcher);
 render(<RecordForm id="10000000-0000-4000-8000-000000000001" version={1}/>);
 fireEvent.change(screen.getByLabelText('Data efetiva'),{target:{value:'2030-01-01'}});fireEvent.submit(screen.getByRole('form',{name:'Registro de realização'}));await screen.findByRole('alert');expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({data_realizacao:'2030-01-01',versao_esperada:1});expect(screen.getByLabelText('Data efetiva').getAttribute('aria-invalid')).toBe('true');
});
