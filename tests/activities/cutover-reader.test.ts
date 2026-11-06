import { expect, it, vi } from 'vitest';
import * as publication from '../../src/lib/activities/publication';
import { snapshotHash } from '../../src/lib/activities/publication.server';
vi.mock('server-only',()=>({}));

const id='10000000-0000-4000-8000-000000000001';
const owner='20000000-0000-4000-8000-000000000001';
const v1={tipo:'atividade-publica.v1',id,versao:1,titulo:'Atividade fictícia',descricao:'Descrição aprovada fictícia.',inicio_previsto:'2030-04-12T18:30:00.000Z',orientacao_acesso:'Entrada fictícia.',referencia_oficial:null,organizacao:{id:owner,nome_publico:'Organização fictícia'},estado_programacao:'programada',publicada_em:'2026-11-06T03:00:00.000Z'};
const {organizacao:ignored,...content}=v1;void ignored;
const v2={...content,tipo:'atividade-publica.v2',sujeito:{id:owner,tipo:'pessoa_fisica',nome_publico:'Pessoa fictícia'}};

it('CUT-U01: dual-reader aceita PF v2 e remove dados privados',()=>{
  const parsed=publication.parseSnapshot({...v2,conta_id:'PRIVADO',sujeito:{...v2.sujeito,email:'PRIVADO'}});
  expect(parsed).toEqual(v2);expect(JSON.stringify(parsed)).not.toContain('PRIVADO');
});
it('CUT-U02: v1 preserva conteúdo, serialização e hash',()=>{
  const before=JSON.stringify(v1),hash=snapshotHash(v1 as publication.PublicActivity);
  expect(publication.parseSnapshot(v1)).toEqual(v1);
  expect(JSON.stringify(publication.parseSnapshot(v1))).toBe(before);
  expect(snapshotHash(publication.parseSnapshot(v1))).toBe(hash);
});
it.each(['coletivo_informal','pessoa_fisica'])('CUT-U03: aceita tipo inclusivo %s',tipo=>{
  expect(publication.parseSnapshot({...v2,sujeito:{...v2.sujeito,tipo}})).toMatchObject({tipo:'atividade-publica.v2',sujeito:{tipo}});
});
it.each([
  {...v2,sujeito:null},
  {...v2,sujeito:{...v2.sujeito,tipo:'administrador'}},
  {...v2,sujeito:{...v2.sujeito,id:'inválido'}},
  {...v2,organizacao:v1.organizacao},
  {...v1,sujeito:v2.sujeito},
  {...v2,tipo:'atividade-publica.v3'},
])('CUT-U04: snapshot ambíguo/inválido é recusado',value=>{
  expect(()=>publication.parseSnapshot(value)).toThrow(expect.objectContaining({status:409}));
});
it('CUT-U05: v1 e v2 têm projeção pública com nome, tipo, data, hash e evidências',()=>{
  const present=Reflect.get(publication,'publicActivityPresentation');
  expect(present).toBeTypeOf('function');
  const evidence=[{id,tipo_fonte:'Referência fictícia',url_publica:'https://example.invalid/referencia',afirmacao_sustentada:'Afirmação fictícia delimitada',consultada_em:'2026-11-06T03:00:00.000Z'}];
  const first=present(publication.parseSnapshot(v1),snapshotHash(v1 as publication.PublicActivity),evidence);
  const second=present(publication.parseSnapshot(v2),snapshotHash(v2 as unknown as publication.PublicActivity),evidence);
  expect(Object.keys(first)).toEqual(['nome','tipo','data','hash','evidencias']);
  expect(Object.keys(second)).toEqual(Object.keys(first));
  expect(first).toEqual({nome:'Organização fictícia',tipo:'organizacao',data:v1.inicio_previsto,hash:snapshotHash(v1 as publication.PublicActivity),evidencias:evidence});
  expect(second).toEqual({nome:'Pessoa fictícia',tipo:'pessoa_fisica',data:v2.inicio_previsto,hash:snapshotHash(v2 as unknown as publication.PublicActivity),evidencias:evidence});
});
