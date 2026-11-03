// @vitest-environment jsdom
import { afterEach,describe,it,expect,vi } from 'vitest';
import { render,screen,fireEvent,waitFor,cleanup } from '@testing-library/react';
import { AuthForm } from '../../src/components/AuthForm';
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
describe('componentes simulados de autenticação',()=>{
 it('cadastro tem labels, autocomplete e botão acessíveis',()=>{
   render(<AuthForm mode="signup"/>);
   expect(screen.getByLabelText('E-mail').getAttribute('autocomplete')).toBe('email');
   expect(screen.getByLabelText('Senha').getAttribute('autocomplete')).toBe('new-password');
   expect(screen.getByRole('button',{name:'Criar acesso'})).toBeTruthy();
 });
 it('login usa autocomplete de senha atual',()=>{render(<AuthForm mode="signin"/>);expect(screen.getByLabelText('Senha').getAttribute('autocomplete')).toBe('current-password');});
 it('recuperação pede somente e-mail',()=>{render(<AuthForm mode="recover"/>);expect(screen.queryByLabelText('Senha')).toBeNull();expect(screen.getByLabelText('E-mail')).toBeTruthy();});
 it('erros do servidor são associados ao campo e recebem foco',async()=>{
   vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:false,json:async()=>({message:'Confira os campos.',fields:{email:'E-mail inválido.'}})}));
   render(<AuthForm mode="signup"/>);fireEvent.submit(screen.getByRole('button',{name:'Criar acesso'}).closest('form')!);
   const alert=await screen.findByRole('alert');expect(alert.textContent).toContain('Confira os campos.');
   expect(screen.getByLabelText('E-mail').getAttribute('aria-invalid')).toBe('true');
   expect(screen.getByLabelText('E-mail').getAttribute('aria-describedby')).toContain('email-error');
   expect(document.activeElement).toBe(alert);
 });
 it('falha de rede tem mensagem acessível sem sucesso falso',async()=>{
   vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new Error('detalhe privado')));render(<AuthForm mode="recover"/>);
   fireEvent.submit(screen.getByRole('button',{name:'Enviar link de recuperação'}).closest('form')!);
   expect((await screen.findByRole('alert')).textContent).toContain('Não foi possível');expect(document.body.textContent).not.toContain('detalhe privado');
 });
 it('não segue redirect externo recebido na resposta',async()=>{
   const navigate=vi.fn();vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({message:'Ok',next:'https://externo.invalid'})}));
   render(<AuthForm mode="signin" onNavigate={navigate}/>);fireEvent.submit(screen.getByRole('button',{name:'Entrar'}).closest('form')!);
   await screen.findByRole('status');expect(navigate).not.toHaveBeenCalled();
 });
 it('redefine senha sem expor token como campo visível',async()=>{
   const fetcher=vi.fn().mockResolvedValue({ok:false,json:async()=>({message:'Expirado.'})});vi.stubGlobal('fetch',fetcher);
   render(<AuthForm mode="reset" tokenHash={'a'.repeat(64)}/>);
   expect(screen.queryByLabelText(/token/i)).toBeNull();fireEvent.change(screen.getByLabelText('Nova senha'),{target:{value:'SenhaFicticia123!'}});
   fireEvent.submit(screen.getByRole('button',{name:'Atualizar senha'}).closest('form')!);
   await waitFor(()=>expect(fetcher).toHaveBeenCalled());
   expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({password:'SenhaFicticia123!',token_hash:'a'.repeat(64)});
 });
 it('organização não pede ID nem papel',async()=>{
   const fetcher=vi.fn().mockResolvedValue({ok:true,json:async()=>({message:'Pendente.'})});vi.stubGlobal('fetch',fetcher);render(<AuthForm mode="organization"/>);
   fireEvent.change(screen.getByLabelText('Nome público da organização'),{target:{value:'Organização Fictícia'}});
   fireEvent.submit(screen.getByRole('button',{name:'Vincular organização'}).closest('form')!);
   await waitFor(()=>expect(fetcher).toHaveBeenCalled());expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({nome_publico:'Organização Fictícia'});
 });
});

describe('envio antes da hidratação',()=>{
 it('formulário nunca envia credenciais por GET',()=>{
   render(<AuthForm mode="signin"/>);const form=screen.getByRole('button',{name:'Entrar'}).closest('form')!;
   expect(form.getAttribute('method')).toBe('post');expect(form.getAttribute('action')).toBe('/api/auth/login');
 });
});

describe('navegação por teclado simulada',()=>{
 it('ordem de Tab percorre email, senha e botão',async()=>{
   const {default:userEvent}=await import('@testing-library/user-event');const user=userEvent.setup();render(<AuthForm mode="signin"/>);
   await user.tab();expect(document.activeElement).toBe(screen.getByLabelText('E-mail'));
   await user.tab();expect(document.activeElement).toBe(screen.getByLabelText('Senha'));
   await user.tab();expect(document.activeElement).toBe(screen.getByRole('button',{name:'Entrar'}));
 });
});
