// @vitest-environment jsdom
import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {EvidenceForm} from '../../src/components/EvidenceForm';
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it('C03/C04: referência delimita afirmação e erro é associado à URL',async()=>{
 const fetcher=vi.fn().mockResolvedValue({ok:false,json:async()=>({message:'Referência imprópria.',fields:{url_publica:'Use referência pública.'}})});vi.stubGlobal('fetch',fetcher);render(<EvidenceForm id="10000000-0000-4000-8000-000000000001"/>);
 fireEvent.change(screen.getByLabelText('Afirmação sustentada'),{target:{value:'A fonte só documenta a abertura.'}});fireEvent.submit(screen.getByRole('form',{name:'Referência de evidência'}));await screen.findByRole('alert');expect(JSON.parse(fetcher.mock.calls[0][1].body).afirmacao_sustentada).toBe('A fonte só documenta a abertura.');expect(screen.getByLabelText('Referência pública').getAttribute('aria-invalid')).toBe('true');
});
