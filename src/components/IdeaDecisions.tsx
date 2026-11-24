'use client';

import { useState, type FormEvent } from 'react';
import { decisionStates, decisionState, type DecisionHistory, type DecisionState } from '../lib/ideas/decisions';
import type { IdeaView } from '../lib/ideas/service.server';

export function IdeaDecisions({ idea, onConfirmed }: { idea: IdeaView; onConfirmed: (idea: IdeaView) => void }) {
  const [report, setReport] = useState<DecisionHistory | null>(null);
  const [key, setKey] = useState('');
  const [editing, setEditing] = useState(false);
  const [state, setState] = useState<DecisionState | ''>('');
  const [description, setDescription] = useState('');
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  async function load() {
    const response = await fetch('/api/ideias?decisions=1&id=' + encodeURIComponent(idea.id), { credentials: 'same-origin' });
    if (!response.ok) throw new Error('history');
    setReport(await response.json() as DecisionHistory);
  }

  async function open() {
    setWorking(true); setError('');
    try { await load(); }
    catch { setError('Não foi possível consultar as decisões. Tente novamente.'); }
    finally { setWorking(false); }
  }

  function clear() { setKey(''); setEditing(false); setState(''); setDescription(''); }

  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (working || !state || !description.trim()) return;
    setWorking(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/ideias', {
        method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'confirm-decisions', id: idea.id, expectedVersion: idea.version,
          decisions: [{ chave: key, estado: state, descricao: description }] }),
      });
      if (response.status === 409) {
        setError('A versão mudou em outra sessão. Recarregue a ideia antes de confirmar.');
        return;
      }
      if (!response.ok) throw new Error('confirm');
      const { ideia } = await response.json() as { ideia: IdeaView };
      onConfirmed(ideia);
      if (ideia.decisions) setReport(current => current && { ...current, decisions: ideia.decisions! });
      clear();
      setNotice('Decisão privada confirmada.');
      try { await load(); }
      catch { setError('A decisão foi salva. A consulta do histórico está indisponível.'); }
    } catch { setError('Não foi possível confirmar a decisão. Confira os campos e tente novamente.'); }
    finally { setWorking(false); }
  }

  return <section aria-labelledby="idea-decisions">
    <h3 id="idea-decisions">Decisões da ideia</h3>
    {!report && <button type="button" disabled={working} onClick={open}>Consultar decisões</button>}
    {notice && <p role="status">{notice}</p>}
    {error && <p role="alert">{error}</p>}
    {report && <>
      <p>Confirme somente decisões tomadas por você. A lista permanece privada e separada das sugestões e da realização.</p>
      {report.decisions.length === 0 ? <p>Nenhuma decisão confirmada.</p> : <ul>{report.decisions.map(decision => <li key={decision.chave}>
        <strong>{decision.estado}</strong> {decision.descricao}
        <button type="button" disabled={working} aria-label={`Alterar decisão ${decision.chave}`} onClick={() => {
          setKey(decision.chave); setEditing(true); setState(decision.estado); setDescription(decision.descricao); setNotice('');
        }}>Alterar</button>
      </li>)}</ul>}
      <form onSubmit={confirm}>
        <fieldset disabled={working}>
          <legend>{editing ? 'Alterar decisão' : 'Nova decisão'}</legend>
          <label htmlFor="decision-key">Chave da decisão</label>
          <input id="decision-key" required maxLength={40} pattern="[a-z0-9][a-z0-9\u002D]{0,39}" value={key}
            readOnly={editing} onChange={event => setKey(event.target.value)} />
          <label htmlFor="decision-state">Estado da decisão</label>
          <select id="decision-state" required value={state} onChange={event => {
            const value = event.target.value; setState(decisionState(value) ? value : '');
          }}>
            <option value="">Escolha o estado</option>
            {decisionStates.map(value => <option key={value}>{value}</option>)}
          </select>
          <label htmlFor="decision-description">Descrição da decisão</label>
          <textarea id="decision-description" required maxLength={500} value={description} onChange={event => setDescription(event.target.value)} />
          <button type="submit">Confirmar decisão</button>
          {editing && <button type="button" onClick={clear}>Cancelar alteração</button>}
        </fieldset>
      </form>
      <details><summary>Histórico de decisões</summary>
        {report.history.length === 0 ? <p>Nenhuma confirmação registrada.</p> : <ol>{report.history.map(decision =>
          <li key={`${decision.chave}:${decision.versao_ideia}`}>Versão {decision.versao_ideia} · {decision.estado} · {decision.descricao}</li>)}</ol>}
        {report.hasMore && <p>Exibindo as 50 confirmações mais recentes.</p>}
      </details>
    </>}
  </section>;
}
