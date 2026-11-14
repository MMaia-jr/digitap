// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import Signup from '../../src/app/cadastro/page';
import OrganizationSignup from '../../src/app/cadastro/organizacao/page';
import PersonSignup from '../../src/app/cadastro/pessoa-fisica/page';

afterEach(()=>{cleanup();vi.unstubAllEnvs();});
function personalPage(Page:typeof Signup){
 vi.stubEnv('NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED','false');
 render(<Page/>);
}
function link(name:string,path:string){
 expect(screen.getByRole('link',{name}).getAttribute('href')).toBe(path);
}
describe('ONB-01 — entradas pessoais e organizacionais',()=>{
 it('/cadastro apresenta PF e mantém o formulário PF existente',()=>{
  personalPage(Signup);
  expect(screen.getByRole('heading',{level:1}).textContent).toContain('pessoa física');
  expect(screen.getByRole('form',{name:'Criar acesso como pessoa física'}).getAttribute('action')).toBe('/api/auth/cadastro-pf');
  expect(screen.getByLabelText('E-mail')).toBeTruthy();expect(screen.getByLabelText('Senha')).toBeTruthy();
  expect(screen.queryByLabelText('Nome público')).toBeNull();
  expect(screen.getByText(/não precisa cadastrar uma organização/i)).toBeTruthy();
  expect(screen.queryByLabelText('Nome público da organização')).toBeNull();
 });
 it('/cadastro oferece organização como alternativa e acesso à conta existente',()=>{
  personalPage(Signup);link('Cadastro de organização','/cadastro/organizacao');link('Já tenho conta','/login');
  link('como os dados são usados','/privacidade');
 });
 it('entrada PF anterior continua usando seu contrato e aponta para organização explícita',()=>{
  personalPage(PersonSignup);
  expect(screen.getByRole('form',{name:'Criar acesso como pessoa física'}).getAttribute('action')).toBe('/api/auth/cadastro-pf');
  link('Cadastro de organização','/cadastro/organizacao');link('Já tenho conta','/login');
 });
});

it('/cadastro/organizacao preserva signup e permite voltar ao cadastro pessoal',()=>{
 personalPage(OrganizationSignup);
 expect(screen.getByText(/confirme seu e-mail antes de cadastrar a organização/i)).toBeTruthy();
 expect(screen.getByRole('form',{name:'Criar acesso'}).getAttribute('action')).toBe('/api/auth/cadastro');
 expect(screen.getByLabelText('E-mail')).toBeTruthy();expect(screen.getByLabelText('Senha')).toBeTruthy();
 expect(screen.queryByLabelText('Nome público')).toBeNull();
 link('Sou pessoa física','/cadastro');link('Já tenho conta','/login');link('como os dados são usados','/privacidade');
});
