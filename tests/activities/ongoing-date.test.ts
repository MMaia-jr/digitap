import {expect,it} from 'vitest';
import {validateDraft} from '../../src/lib/activities/domain';
const now=new Date('2026-11-07T12:00:00Z');
const draft={titulo:'Encontro fictício',descricao:'Uma descrição fictícia completa.',orientacao_acesso:'Acesso gratuito.',inicio_previsto:now.toISOString()};
it('agora explícito aceita latência curta sem mudar o formato persistido',()=>{
 expect(validateDraft({...draft,acontecendo_agora:true},new Date(now.getTime()+3000))).toMatchObject({inicio_previsto:now.toISOString()});
 expect(validateDraft({...draft,acontecendo_agora:true},now)).not.toHaveProperty('acontecendo_agora');
});
it('sem agora explícito continua exigindo futuro',()=>{expect(()=>validateDraft(draft,now)).toThrow();});
it('agora não aceita data antiga nem previsão distante',()=>{
 for(const inicio_previsto of ['2020-01-01T12:00:00Z','2030-01-01T12:00:00Z'])expect(()=>validateDraft({...draft,inicio_previsto,acontecendo_agora:true},now)).toThrow();
});
