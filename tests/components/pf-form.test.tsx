// @vitest-environment jsdom
import { afterEach, it, expect, vi } from 'vitest';
import { render,screen,fireEvent,cleanup,waitFor } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { AuthForm } from '../../src/components/AuthForm';
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it('PF-07 formulário PF pede nome público e envia ao endpoint próprio',async()=>{
 const fetcher=vi.fn().mockResolvedValue({ok:true,json:async()=>({message:'Confirme seu e-mail.'})});vi.stubGlobal('fetch',fetcher);
 render(<AuthForm mode={'signup_pf' as ComponentProps<typeof AuthForm>['mode']}/>);
 fireEvent.change(screen.getByLabelText('E-mail'),{target:{value:'pf@example.invalid'}});
 fireEvent.change(screen.getByLabelText('Senha'),{target:{value:'SenhaFicticia123!'}});
 fireEvent.change(screen.getByLabelText('Nome público'),{target:{value:'Pessoa Fictícia'}});
 fireEvent.submit(screen.getByRole('form',{name:'Criar acesso como pessoa física'}));
 await waitFor(()=>expect(fetcher).toHaveBeenCalledOnce());
 expect(fetcher.mock.calls[0][0]).toBe('/api/auth/cadastro-pf');
 expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({email:'pf@example.invalid',password:'SenhaFicticia123!',nome_publico:'Pessoa Fictícia'});
 await screen.findByRole('status');expect((screen.getByLabelText('Senha') as HTMLInputElement).value).toBe('');
});
