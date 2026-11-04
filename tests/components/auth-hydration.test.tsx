// @vitest-environment jsdom
import { describe,it,expect,afterEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { render,screen,cleanup } from '@testing-library/react';
import { AuthForm } from '../../src/components/AuthForm';
afterEach(cleanup);
describe('envio de autenticação antes de hidratação',()=>{
  it('HTML inicial desabilita envio nativo até o handler JSON estar disponível',()=>{
    const html=renderToString(<AuthForm mode="signout"/>);
    const document=new DOMParser().parseFromString(html,'text/html');
    expect(document.querySelector('button')?.disabled).toBe(true);
  });
  it('habilita botão quando o componente está montado',()=>{
    render(<AuthForm mode="signout"/>);
    expect(screen.getByRole('button',{name:'Sair'}).hasAttribute('disabled')).toBe(false);
  });
});
