// @vitest-environment jsdom
import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,cleanup,act} from '@testing-library/react';
import {renderToString} from 'react-dom/server';
import {WithdrawForm} from '../../src/components/WithdrawForm';
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
const props={id:'10000000-0000-4000-8000-000000000001',version:2};
it('B09: HTML inicial exige hidratação para retirada explícita',()=>{const d=new DOMParser().parseFromString(renderToString(<WithdrawForm {...props}/>),'text/html');expect(d.querySelector('button')?.disabled).toBe(true);});
it('B09 RED acessibilidade: erro do motivo é associado ao campo e recebe foco',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:false,json:async()=>({message:'Confira os campos indicados.',fields:{motivo:'Use de 10 a 1500 caracteres.'}})}));render(<WithdrawForm {...props}/>);fireEvent.submit(screen.getByRole('form',{name:'Retirada de publicação'}));const alert=await screen.findByRole('alert');expect(alert).toBe(document.activeElement);expect(screen.getByLabelText('Motivo da retirada').getAttribute('aria-invalid')).toBe('true');
});
it('B09: falha e repetição preservam chave; duplo clique não duplica pedido',async()=>{
 let resolve!:(v:unknown)=>void;const f=vi.fn().mockImplementation(()=>new Promise(r=>resolve=r));vi.stubGlobal('fetch',f);render(<WithdrawForm {...props}/>);fireEvent.change(screen.getByLabelText('Motivo da retirada'),{target:{value:'Motivo fictício restrito.'}});const form=screen.getByRole('form',{name:'Retirada de publicação'});act(()=>{fireEvent.submit(form);fireEvent.submit(form);});expect(f).toHaveBeenCalledTimes(1);const body=JSON.parse(f.mock.calls[0][1].body);await act(async()=>resolve({ok:false,json:async()=>({message:'Falha temporária.'})}));fireEvent.submit(form);expect(JSON.parse(f.mock.calls[1][1].body)).toEqual(body);await act(async()=>resolve({ok:false,json:async()=>({message:'Falha temporária.'})}));
});
