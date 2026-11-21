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

it('modo retrospectivo aceita a data histórica sem incorporá-lo ao conteúdo canônico',()=>{
 const clock=new Date('2026-11-20T12:00:00Z');
 const inicio_previsto='2026-11-17T12:30:00.000Z';
 const content=validateDraft({...draft,inicio_previsto,retrospectiva:true},clock);
 expect(content.inicio_previsto).toBe(inicio_previsto);
 expect(content).not.toHaveProperty('retrospectiva');
 expect(()=>validateDraft({...draft,inicio_previsto},clock)).toThrow('Confira os campos indicados.');
});
it('modo retrospectivo recusa futuro e combinação com agora',()=>{
 const clock=new Date('2026-11-20T12:00:00Z');
 expect(()=>validateDraft({...draft,inicio_previsto:'2026-11-21T12:00:00Z',retrospectiva:true},clock))
  .toThrow(expect.objectContaining({fields:{inicio_previsto:'Informe o início da atividade já realizada.'}}));
 expect(()=>validateDraft({...draft,retrospectiva:true,acontecendo_agora:true},clock))
  .toThrow('Escolha apenas um modo para a atividade.');
});
