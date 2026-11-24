// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement, type ReactNode } from 'react';
import type { ExecutionPlan } from '../../src/components/ExecutionPlanWorkspace';

const mocks = vi.hoisted(() => ({ get: vi.fn(), getRecord: vi.fn(), getPlan: vi.fn(), managedProfile: vi.fn() }));
vi.mock('next/link', () => ({ default: ({ href, children, ...props }: { href: string; children: ReactNode }) => createElement('a', { href, ...props }, children) }));
vi.mock('next/navigation', () => ({ notFound: vi.fn(), redirect: vi.fn() }));
vi.mock('../../src/lib/activities/service.server', () => ({ activities: { get: mocks.get, getRecord: mocks.getRecord, getExecutionPlan: mocks.getPlan } }));
vi.mock('../../src/lib/queries/projects.server', () => ({ managedProfile: mocks.managedProfile }));
// Keep the existing activity editor independent: ECO-01 may be a distinct
// private interface or route linked from activity management.
vi.mock('../../src/components/ActivityForm', () => ({ ActivityForm: () => createElement('form', { 'aria-label': 'Edição da atividade existente' }) }));
vi.mock('../../src/components/SubmitActivityForm', () => ({ SubmitActivityForm: () => null }));
vi.mock('../../src/components/ReviewForm', () => ({ ReviewForm: () => null }));
vi.mock('../../src/components/EvidenceForm', () => ({ EvidenceForm: () => null }));
vi.mock('../../src/components/ContestRecordForm', () => ({ ContestRecordForm: () => null }));
vi.mock('../../src/components/RevokeAuthorizationForm', () => ({ RevokeAuthorizationForm: () => null }));
vi.mock('../../src/components/RecordWorkflowForm', () => ({ RecordWorkflowForm: () => null }));
vi.mock('../../src/components/RecordForm', () => ({ RecordForm: () => null }));
vi.mock('../../src/components/ScheduleForm', () => ({ ScheduleForm: () => null }));
vi.mock('../../src/components/WithdrawForm', () => ({ WithdrawForm: () => null }));
vi.mock('../../src/components/PublishForm', () => ({ PublishForm: () => null }));

import ActivityDetail from '../../src/app/dashboard/atividade/[id]/page';

const activity = {
  id: '30000000-0000-4000-8000-000000000071',
  criado_por_sujeito_id: '50000000-0000-4000-8000-000000000071',
  titulo: 'Oficina sintética de planejamento',
  descricao: 'Atividade fictícia para testar o plano privado.',
  inicio_previsto: '2035-04-12T18:30:00Z',
  orientacao_acesso: 'Acesso sujeito a confirmação.',
  referencia_oficial: null,
  estado_editorial: 'rascunho',
  versao_submetida: 1,
  pode_editar: true,
  acesso_editorial: false,
  tem_publicacao: false,
  projeto_aprovacao: null,
  projeto_parecer: null,
  motivo_editorial: null,
  motivo_retirada: null,
  numero_versao_publicada: null,
  pode_alterar_programacao: false,
  pode_retirar: false,
  pode_revisar: false,
  pode_publicar: false,
};

async function renderActivityManagement(plan: ExecutionPlan | null = null) {
  mocks.get.mockResolvedValue(activity);
  mocks.getRecord.mockResolvedValue(undefined);
  mocks.getPlan.mockResolvedValue(plan);
  mocks.managedProfile.mockResolvedValue({ subject: { tipo: 'pessoa_fisica' }, availableProjects: [] });
  render(await ActivityDetail({ params: Promise.resolve({ id: activity.id }) }));
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it('apresenta o planejamento como área privada acessível pela gestão da atividade', async () => {
  await renderActivityManagement();
  expect(screen.getByRole('form', { name: 'Edição da atividade existente' })).toBeTruthy();
  const plan = screen.queryByRole('region', { name: 'Planejamento privado de recursos e custos previstos' });
  const entry = screen.queryByRole('link', { name: /planejamento privado de recursos e custos previstos/i });
  expect(plan || entry).toBeTruthy();
  if (plan) {
    expect(plan.textContent).toMatch(/previstos/i);
    expect(plan.textContent).toMatch(/não são despesas nem pagamentos/i);
  }
});

it('só persiste depois da ação explícita de salvar', async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
  vi.stubGlobal('fetch', fetcher);
  await renderActivityManagement();
  const description = screen.queryByLabelText('Descrição do recurso');
  expect(description).toBeTruthy();
  if (!description) return;
  fireEvent.change(description, { target: { value: 'Materiais sintéticos' } });
  expect(fetcher).not.toHaveBeenCalled();
  const save = screen.queryByRole('button', { name: 'Salvar planejamento' });
  expect(save).toBeTruthy();
  if (!save) return;
  fireEvent.click(save);
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
});

it('identifica quantidades opcionais e o custo como valor previsto', async () => {
  await renderActivityManagement();
  expect(screen.queryByLabelText('Quantidade (opcional)')).toBeTruthy();
  expect(screen.queryByLabelText('Unidade (opcional)')).toBeTruthy();
  expect(screen.queryByLabelText('Valor previsto (R$)')).toBeTruthy();
});

it('mantém o planejamento privado e não oferece publicação automática', async () => {
  await renderActivityManagement();
  const plan = screen.queryByRole('region', { name: 'Planejamento privado de recursos e custos previstos' });
  expect(plan).toBeTruthy();
  expect(plan?.textContent).toMatch(/privado/i);
  expect(plan?.querySelector('button')?.textContent ?? '').not.toMatch(/publicar/i);
});

it('expõe validação por mensagem acessível associada ao custo previsto', async () => {
  await renderActivityManagement();
  const amount = screen.queryByLabelText('Valor previsto (R$)');
  expect(amount).toBeTruthy();
  if (!amount) return;
  fireEvent.change(amount, { target: { value: '-1' } });
  const save = screen.queryByRole('button', { name: 'Salvar planejamento' });
  expect(save).toBeTruthy();
  if (!save) return;
  fireEvent.click(save);
  expect(screen.queryByRole('alert')?.textContent).toMatch(/valor previsto/i);
  expect(amount.getAttribute('aria-describedby')).toBeTruthy();
});

it('informa conflito de versão quando a gravação retorna HTTP 409', async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'version_conflict' }), {
    status: 409, headers: { 'Content-Type': 'application/json' },
  }));
  vi.stubGlobal('fetch', fetcher);
  await renderActivityManagement();
  const save = screen.queryByRole('button', { name: 'Salvar planejamento' });
  expect(save).toBeTruthy();
  if (!save) return;
  fireEvent.click(save);
  await waitFor(() => expect(screen.queryByRole('alert')?.textContent).toMatch(/alterado|conflito/i));
});

it('permite navegar por teclado do campo de descrição até salvar', async () => {
  await renderActivityManagement();
  const description = screen.queryByLabelText('Descrição do recurso');
  const save = screen.queryByRole('button', { name: 'Salvar planejamento' });
  expect(description).toBeTruthy();
  expect(save).toBeTruthy();
  if (!description || !save) return;
  const user = userEvent.setup();
  description.focus();
  expect(document.activeElement).toBe(description);
  for (let step = 0; step < 12 && document.activeElement !== save; step += 1) await user.tab();
  expect(document.activeElement).toBe(save);
});

it('abre o planejamento persistido sem preencher dados por suposição', async () => {
  await renderActivityManagement({
    version: 3,
    total_previsto_centavos: 1250,
    recursos: [{ categoria: 'material', descricao: 'Papel reciclado', quantidade: 2, unidade: 'pacotes', valor_previsto_centavos: 1250 }],
  });
  expect(screen.getByLabelText('Descrição do recurso')).toHaveProperty('value', 'Papel reciclado');
  expect(screen.getByLabelText('Valor previsto (R$)')).toHaveProperty('value', '12,50');
  expect(screen.getByText(/total previsto: R\$ 12,50/i)).toBeTruthy();
});

it('permite adicionar e remover linhas de planejamento sem persistência implícita', async () => {
  const fetcher = vi.fn();
  vi.stubGlobal('fetch', fetcher);
  await renderActivityManagement();
  const add = screen.getByRole('button', { name: 'Adicionar recurso' });
  fireEvent.click(add);
  expect(screen.getAllByLabelText(/^Descrição do recurso/)).toHaveLength(2);
  expect(fetcher).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Remover recurso 2' }));
  expect(screen.getAllByLabelText(/^Descrição do recurso/)).toHaveLength(1);
  expect(fetcher).not.toHaveBeenCalled();
});

it('informa falha de rede sem perder os campos editados', async () => {
  const fetcher = vi.fn().mockRejectedValue(new Error('offline'));
  vi.stubGlobal('fetch', fetcher);
  await renderActivityManagement();
  const description = screen.getByLabelText('Descrição do recurso');
  fireEvent.change(description, { target: { value: 'Cadeiras emprestadas' } });
  fireEvent.click(screen.getByRole('button', { name: 'Salvar planejamento' }));
  await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/conexão|rede/i));
  expect(description).toHaveProperty('value', 'Cadeiras emprestadas');
});

it('TAP 08 reúne o plano e o relato existentes na área de acompanhamento', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('[]', { status: 200 })));
  mocks.get.mockResolvedValue(activity);
  mocks.getPlan.mockResolvedValue(null);
  mocks.getRecord.mockResolvedValue({
    id: 'record-id',
    descricao_factual: 'Oficina declarada pelo responsável.',
    evidencias: [],
    contestacoes: [],
  });
  mocks.managedProfile.mockResolvedValue({ subject: { tipo: 'pessoa_fisica' }, availableProjects: [] });
  render(await ActivityDetail({ params: Promise.resolve({ id: activity.id }) }));
  const followUp = screen.getByRole('region', { name: 'Acompanhamento da atividade' });
  expect(followUp.id).toBe('acompanhamento');
  expect(followUp.contains(screen.getByRole('region', { name: 'Planejamento privado de recursos e custos previstos' }))).toBe(true);
  expect(followUp.contains(screen.getByRole('region', { name: 'Registro privado' }))).toBe(true);
  expect(followUp.contains(screen.getByRole('region', { name: 'Anexos privados' }))).toBe(true);
  expect(followUp.textContent).toMatch(/prestação de contas.*Aldir Blanc/i);
});

it('TAP 08 não concede acompanhamento nem consulta registros a um representante com acesso restrito ao envio', async () => {
  mocks.get.mockResolvedValue({ ...activity, autorizacao_organizacional: 'representante' });
  render(await ActivityDetail({ params: Promise.resolve({ id: activity.id }) }));
  expect(screen.queryByRole('region', { name: 'Acompanhamento da atividade' })).toBeNull();
  expect(screen.getByText('Seu acesso a esta atividade é restrito ao envio.').id).toBe('acompanhamento');
  expect(mocks.getPlan).not.toHaveBeenCalled();
  expect(mocks.getRecord).not.toHaveBeenCalled();
});
