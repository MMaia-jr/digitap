// @vitest-environment jsdom
import { afterEach,it,expect,vi } from 'vitest';
import { render,screen,fireEvent,cleanup } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { ActivityForm } from '../../src/components/ActivityForm';
const activity={id:'30000000-0000-4000-8000-000000000001',titulo:'Atividade fictícia',descricao:'Descrição inteiramente fictícia.',inicio_previsto:'2030-04-12T18:30:00Z',orientacao_acesso:'Entrada fictícia gratuita.',referencia_oficial:null,estado_editorial:'rascunho' as const,versao_submetida:1};
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it('B02/B04: mudança não salva impede envio acidental da versão anterior',()=>{
 render(<ActivityForm activity={activity}/>);
 expect(screen.getByRole('button',{name:'Enviar atividade'}).hasAttribute('disabled')).toBe(false);
 fireEvent.change(screen.getByLabelText('Título'),{target:{value:''}});
 expect(screen.getByRole('button',{name:'Enviar atividade'}).hasAttribute('disabled')).toBe(true);
});
it('B01: HTML de rascunho bloqueia submit antes da hidratação',()=>{
 const html=renderToString(<ActivityForm/>);const document=new DOMParser().parseFromString(html,'text/html');expect(document.querySelector('button')?.disabled).toBe(true);
});
it('B03: data local inválida recebe erro acessível e não faz requisição',async()=>{
 const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);render(<ActivityForm/>);
 fireEvent.submit(screen.getByRole('form',{name:'Nova atividade'}));
 const alert=await screen.findByRole('alert');expect(document.activeElement).toBe(alert);expect(fetcher).not.toHaveBeenCalled();
 expect(screen.getByLabelText('Data e horário (America/Sao_Paulo)').getAttribute('aria-invalid')).toBe('true');
});
