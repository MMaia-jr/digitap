import { expect, it } from 'vitest';
import * as publication from '../../src/lib/activities/publication';

// Contract pending, GREEN in CUTOVER. Outside mandatory EXPAND RED/GREEN.
// Deliberately RED while the I4 server authorization contract is absent.
// This is not evidence that the existing I3 publication path permits bypass.
it.each([
  { I4_AUTOPUBLICACAO: true },
  { user_metadata: { autopublicacao: true } },
  { sujeito_id: '00000000-0000-4000-8000-000000000001' },
])('I4-P44 U: autorização I4 no servidor nega payload forjado/desconhecido %j', async payload => {
  const authorizeAutopublication = Reflect.get(publication, 'authorizeAutopublication');
  expect(authorizeAutopublication, 'Contrato de autorização I4 ainda não implementado; não confundir ausência com prova de negação.').toBeTypeOf('function');
  await expect(authorizeAutopublication(payload)).rejects.toMatchObject({ status: 403 });
});
