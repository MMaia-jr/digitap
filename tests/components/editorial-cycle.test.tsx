// @vitest-environment jsdom
import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {ActivityForm} from '../../src/components/ActivityForm';
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it('acontecendo agora preenche data, bloqueia edição e salva com intenção explícita',async()=>{
 const navigate=vi.fn(),fetcher=vi.fn().mockResolvedValue({ok:true,json:async()=>({next:'/dashboard/atividade/30000000-0000-4000-8000-000000000001'})});vi.stubGlobal('fetch',fetcher);
 render(<ActivityForm returnTo="/dashboard/pessoa-fisica" onNavigate={navigate}/>);
 fireEvent.click(screen.getByRole('checkbox',{name:'A atividade está acontecendo agora'}));
 const date=screen.getByLabelText('Data e horário (America/Sao_Paulo)') as HTMLInputElement;
 expect(date.readOnly).toBe(true);expect(date.value).not.toBe('');
 fireEvent.submit(screen.getByRole('form',{name:'Nova atividade'}));
 await waitFor(()=>expect(fetcher).toHaveBeenCalledOnce());
 const body=JSON.parse(fetcher.mock.calls[0][1].body);expect(body.acontecendo_agora).toBe(true);
 expect(Math.abs(Date.parse(body.inicio_previsto)-Date.now())).toBeLessThan(10000);
 await waitFor(()=>expect(navigate).toHaveBeenCalledWith('/dashboard/pessoa-fisica'));
});
it('desmarcar agora restaura a data escolhida e a edição',()=>{
 render(<ActivityForm/>);const date=screen.getByLabelText('Data e horário (America/Sao_Paulo)') as HTMLInputElement;
 fireEvent.change(date,{target:{value:'2030-04-12T15:30'}});
 const checkbox=screen.getByRole('checkbox',{name:'A atividade está acontecendo agora'});fireEvent.click(checkbox);fireEvent.click(checkbox);
 expect(date.readOnly).toBe(false);expect(date.value).toBe('2030-04-12T15:30');
});
