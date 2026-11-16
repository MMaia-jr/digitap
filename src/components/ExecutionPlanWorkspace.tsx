'use client';

import { useState } from 'react';

type Resource = {
  categoria?: string;
  descricao?: string;
  quantidade?: number;
  unidade?: string;
  valor_previsto_centavos?: number | null;
};
export type ExecutionPlan = {
  version: number;
  total_previsto_centavos: number;
  recursos: Resource[];
};
type DraftResource = {
  categoria: string;
  descricao: string;
  quantidade: string;
  unidade: string;
  valor: string;
};

const blankResource = (): DraftResource => ({ categoria: '', descricao: '', quantidade: '', unidade: '', valor: '' });
function resourceDraft(resource: Resource): DraftResource {
  const cents = resource.valor_previsto_centavos;
  return {
    categoria: resource.categoria ?? '',
    descricao: resource.descricao ?? '',
    quantidade: resource.quantidade === undefined ? '' : String(resource.quantidade),
    unidade: resource.unidade ?? '',
    valor: cents === undefined || cents === null ? '' : `${Math.floor(cents / 100)},${String(cents % 100).padStart(2, '0')}`,
  };
}

function parseBrlCents(raw: string): number | null {
  const value = raw.trim();
  if (!value) return null;
  const match = /^(\d{1,14})(?:[,.](\d{1,2}))?$/.exec(value);
  if (!match) throw new Error('Informe um valor previsto em reais, com até duas casas decimais.');
  const whole = Number(match[1]);
  if (!Number.isSafeInteger(whole) || whole > Math.floor(Number.MAX_SAFE_INTEGER / 100)) {
    throw new Error('O valor previsto excede o limite seguro.');
  }
  const fraction = Number((match[2] ?? '').padEnd(2, '0'));
  const cents = whole * 100 + fraction;
  if (!Number.isSafeInteger(cents)) throw new Error('O valor previsto excede o limite seguro.');
  return cents;
}

function parseQuantity(raw: string): number | undefined {
  const value = raw.trim();
  if (!value) return undefined;
  if (!/^\d{1,15}(?:[,.]\d{1,6})?$/.test(value)) throw new Error('Informe uma quantidade positiva, usando até seis casas decimais.');
  const amount = Number(value.replace(',', '.'));
  if (!Number.isFinite(amount) || amount <= 0 || amount > Number.MAX_SAFE_INTEGER) throw new Error('Informe uma quantidade positiva e segura.');
  return amount;
}

function formatBrl(cents: number) {
  const whole = Math.floor(cents / 100).toLocaleString('pt-BR');
  return `R$ ${whole},${String(cents % 100).padStart(2, '0')}`;
}

export function ExecutionPlanWorkspace({ activityId, initialPlan }: { activityId: string; initialPlan: ExecutionPlan | null }) {
  const [plan, setPlan] = useState(initialPlan);
  const [resources, setResources] = useState<DraftResource[]>(() => initialPlan?.recursos.map(resourceDraft) ?? [blankResource()]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  let total: number | null = 0;
  try {
    for (const resource of resources) {
      const cents = parseBrlCents(resource.valor);
      total += cents ?? 0;
      if (!Number.isSafeInteger(total)) { total = null; break; }
    }
  } catch { total = null; }

  function change(index: number, key: keyof DraftResource, value: string) {
    setResources(current => current.map((resource, position) => position === index ? { ...resource, [key]: value } : resource));
    setDirty(true);
    setMessage('');
    setError('');
  }

  function addResource() {
    setResources(current => [...current, blankResource()]);
    setDirty(true);
    setError('');
  }

  function removeResource(index: number) {
    setResources(current => current.filter((_, position) => position !== index));
    setDirty(true);
    setError('');
  }

  async function save() {
    setError('');
    setMessage('');
    let payload: Resource[];
    try {
      if (resources.length < 1) throw new Error('Inclua ao menos um recurso previsto.');
      payload = resources.map((resource, index) => {
        const amount = parseBrlCents(resource.valor);
        let quantity: number | undefined;
        try { quantity = parseQuantity(resource.quantidade); }
        catch (cause) { throw new Error(`${cause instanceof Error ? cause.message : 'Quantidade inválida'} (linha ${index + 1}).`); }
        return {
          ...(resource.categoria.trim() ? { categoria: resource.categoria.trim() } : {}),
          ...(resource.descricao.trim() ? { descricao: resource.descricao.trim() } : {}),
          ...(quantity === undefined ? {} : { quantidade: quantity }),
          ...(resource.unidade.trim() ? { unidade: resource.unidade.trim() } : {}),
          ...(amount === null ? {} : { valor_previsto_centavos: amount }),
        };
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Confira os dados do planejamento.');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/atividades/${activityId}/planejamento`, {
        method: plan ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(plan ? { versao_esperada: plan.version, recursos: payload } : { recursos: payload }),
      });
      const body = await response.json() as { message?: string; plano?: ExecutionPlan };
      if (response.status === 409) {
        setError('Este planejamento foi alterado em outra sessão. Recarregue a página antes de salvar.');
        return;
      }
      if (!response.ok || !body.plano) {
        setError(body.message ?? 'Não foi possível salvar o planejamento. Confira sua sessão e tente novamente.');
        return;
      }
      setPlan(body.plano);
      setResources(body.plano.recursos.map(resourceDraft));
      setDirty(false);
      setMessage('Planejamento privado salvo.');
    } catch {
      setError('Falha de conexão. Suas alterações continuam nesta página; tente salvar novamente.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card" aria-label="Planejamento privado de recursos e custos previstos">
      <h2>Planejamento de recursos e custos previstos</h2>
      <p>Este planejamento é privado. Os valores são previstos e não são despesas nem pagamentos, compromissos ou prestação de contas certificada. Nada é publicado automaticamente.</p>
      {dirty && <p role="status">Alterações ainda não salvas.</p>}
      <div aria-live="polite" aria-atomic="true">{message && <p role="status">{message}</p>}{error && <p id="execution-plan-error" role="alert">{error}</p>}</div>
      <div>
        {resources.map((resource, index) => {
          const row = index + 1;
          return (
            <fieldset key={row}>
              <legend>Recurso previsto {row}</legend>
              <label htmlFor={`plan-category-${row}`}>Categoria (opcional)</label>
              <input id={`plan-category-${row}`} value={resource.categoria} onChange={event => change(index, 'categoria', event.target.value)} />
              <label htmlFor={`plan-description-${row}`}>{row === 1 ? 'Descrição do recurso' : `Descrição do recurso (linha ${row})`}</label>
              <input id={`plan-description-${row}`} value={resource.descricao} onChange={event => change(index, 'descricao', event.target.value)} aria-describedby={error ? 'execution-plan-error' : undefined} />
              <label htmlFor={`plan-quantity-${row}`}>Quantidade (opcional)</label>
              <input id={`plan-quantity-${row}`} inputMode="decimal" value={resource.quantidade} onChange={event => change(index, 'quantidade', event.target.value)} />
              <label htmlFor={`plan-unit-${row}`}>Unidade (opcional)</label>
              <input id={`plan-unit-${row}`} value={resource.unidade} onChange={event => change(index, 'unidade', event.target.value)} />
              <label htmlFor={`plan-value-${row}`}>{row === 1 ? 'Valor previsto (R$)' : `Valor previsto (R$), recurso ${row}`}</label>
              <input id={`plan-value-${row}`} inputMode="decimal" value={resource.valor} onChange={event => change(index, 'valor', event.target.value)} aria-describedby={error ? 'execution-plan-error' : undefined} />
              <button type="button" onClick={() => removeResource(index)} aria-label={`Remover recurso ${row}`}>Remover recurso</button>
            </fieldset>
          );
        })}
      </div>
      <button type="button" onClick={addResource} disabled={resources.length >= 100}>Adicionar recurso</button>
      <p aria-live="polite">{total === null ? 'Total previsto indisponível até corrigir os valores.' : `Total previsto: ${formatBrl(total)}`}</p>
      <button type="button" onClick={save} disabled={saving}>{saving ? 'Salvando planejamento…' : 'Salvar planejamento'}</button>
    </section>
  );
}
