// @vitest-environment jsdom
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {cleanup,render,screen,fireEvent,waitFor} from '@testing-library/react';
const viewer=vi.hoisted(()=>vi.fn());
vi.mock('server-only',()=>({}));
vi.mock('next/navigation',()=>({redirect:(path:string)=>{throw new Error('redirect:'+path);}}));
vi.mock('../../src/components/Viewer.server',()=>({getViewer:viewer}));
import {ProposalForm} from '../../src/components/ProposalForm';
import IdeaPage from '../../src/app/meu-espaco/ideia/page';
import Workspace from '../../src/app/meu-espaco/page';
import {AppHeader} from '../../src/components/AppHeader';
vi.mock('../../src/components/AuthForm',()=>({AuthForm:()=>null}));
const preview={estado:'revisao_humana_pendente',verificacao:'nao_verificada',dados:{
 sujeitos:[{tipo:'pessoa_fisica',descricao:'Ana',trecho:'Ana propõe'}],projetos:[{descricao:'Raízes',trecho:'projeto Raízes'}],
 atividades:[{descricao:'Oficina',trecho:'uma oficina'}],capacidades:[{descricao:'Ensinar',trecho:'pode ensinar'}],
 relacoes:[{origem:'Ana',destino:'Raízes',tipo:'colaboração proposta',trecho:'quer colaborar'}],
 fontes:[{descricao:'Relato',trecho:'relato da pessoa'}],informacoes_nao_verificadas:[{descricao:'Data pendente',trecho:'data a definir'}],
}};
beforeEach(()=>{viewer.mockResolvedValue({kind:'ready',name:'Ana',dashboard:'/meu-espaco'});});
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.clearAllMocks();});
it('entrada em Meu espaço e navegação de perfil existente permitem descrever ideia',async()=>{
 render(await Workspace());expect(screen.getByRole('link',{name:'Descreva sua ideia'}).getAttribute('href')).toBe('/meu-espaco/ideia');cleanup();
 viewer.mockResolvedValue({kind:'ready',name:'Ana',dashboard:'/dashboard/pessoa-fisica'});render(await AppHeader());expect(screen.getByRole('link',{name:'Descreva sua ideia'}).getAttribute('href')).toBe('/meu-espaco/ideia');
});
it('página exige sessão e falha fechada se indisponível',async()=>{
 viewer.mockResolvedValue({kind:'visitor'});await expect(IdeaPage()).rejects.toThrow('redirect:/login');viewer.mockResolvedValue({kind:'unavailable'});render(await IdeaPage());expect(screen.queryByRole('textbox')).toBeNull();
});
it('envia só o texto ao endpoint local e apresenta sete categorias não verificadas',async()=>{
 const f=vi.fn().mockResolvedValue({ok:true,json:async()=>({interpretacao:preview})});vi.stubGlobal('fetch',f);render(<ProposalForm/>);
 fireEvent.change(screen.getByLabelText('Sua proposta'),{target:{value:'Uma ideia de oficina'}});fireEvent.click(screen.getByRole('button',{name:'Interpretar proposta'}));
 await screen.findByRole('heading',{name:'Prévia para revisão humana'});
 expect(f).toHaveBeenCalledExactlyOnceWith('/api/propostas/interpretar',expect.objectContaining({method:'POST',credentials:'same-origin',body:JSON.stringify({texto:'Uma ideia de oficina'})}));
 for(const name of ['Possíveis sujeitos','Possíveis projetos','Atividades propostas','Capacidades declaradas','Relações alegadas','Fontes citadas','Informações não verificadas'])expect(screen.getByRole('heading',{name})).toBeTruthy();
 expect(screen.getByText('Ana propõe')).toBeTruthy();expect(screen.getByText(/^Interpretação não verificada\./)).toBeTruthy();expect(screen.queryByRole('button',{name:/publicar|salvar|criar vínculo/i})).toBeNull();
});
it('não aceita texto vazio e limita o tamanho no formulário',async()=>{
 const f=vi.fn();vi.stubGlobal('fetch',f);render(<ProposalForm/>);expect(screen.getByLabelText('Sua proposta').getAttribute('maxlength')).toBe('2000');fireEvent.submit(screen.getByRole('button',{name:'Interpretar proposta'}).closest('form')!);expect(f).not.toHaveBeenCalled();
});
it('impede envio duplicado durante a espera',async()=>{
 let finish!:(v:unknown)=>void;const f=vi.fn(()=>new Promise(resolve=>{finish=resolve;}));vi.stubGlobal('fetch',f);render(<ProposalForm/>);
 fireEvent.change(screen.getByLabelText('Sua proposta'),{target:{value:'Ideia'}});const form=screen.getByRole('button',{name:'Interpretar proposta'}).closest('form')!;fireEvent.submit(form);fireEvent.submit(form);expect(f).toHaveBeenCalledOnce();finish({ok:true,json:async()=>({interpretacao:preview})});await screen.findByRole('heading',{name:'Prévia para revisão humana'});
});
it.each([401,429,503])('falha HTTP %s nunca mostra detalhes internos',async status=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:false,status,json:async()=>({message:'SECRET_MARKER'})}));render(<ProposalForm/>);fireEvent.change(screen.getByLabelText('Sua proposta'),{target:{value:'Ideia'}});fireEvent.submit(screen.getByRole('button',{name:'Interpretar proposta'}).closest('form')!);await screen.findByRole('alert');expect(screen.queryByText(/SECRET_MARKER/)).toBeNull();
});
it('apresenta saída como texto, nunca como HTML executável',async()=>{
 const malicious={...preview,dados:{...preview.dados,atividades:[{descricao:'<img src=x onerror=alert(1)>',trecho:'trecho declarado'}]}};
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({interpretacao:malicious})}));render(<ProposalForm/>);fireEvent.change(screen.getByLabelText('Sua proposta'),{target:{value:'Ideia'}});fireEvent.submit(screen.getByRole('button',{name:'Interpretar proposta'}).closest('form')!);await screen.findByRole('heading',{name:'Prévia para revisão humana'});expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeTruthy();expect(document.querySelector('img[src="x"]')).toBeNull();
});
it('editar a proposta descarta a prévia anterior',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({interpretacao:preview})}));render(<ProposalForm/>);fireEvent.change(screen.getByLabelText('Sua proposta'),{target:{value:'Ideia'}});fireEvent.submit(screen.getByRole('button',{name:'Interpretar proposta'}).closest('form')!);await screen.findByRole('heading',{name:'Prévia para revisão humana'});fireEvent.change(screen.getByLabelText('Sua proposta'),{target:{value:'Outra ideia'}});await waitFor(()=>expect(screen.queryByRole('heading',{name:'Prévia para revisão humana'})).toBeNull());
});
