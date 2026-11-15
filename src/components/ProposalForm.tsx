'use client';
import { useRef, useState, useSyncExternalStore, type FormEvent } from 'react';
import type { ProposalInterpretation } from '../lib/proposals/interpret.server';
const subscribe = () => () => {};
const labels = {
  sujeitos: 'Possíveis sujeitos', projetos: 'Possíveis projetos', atividades: 'Atividades propostas',
  capacidades: 'Capacidades declaradas', fontes: 'Fontes citadas', informacoes_nao_verificadas: 'Informações não verificadas',
};
export function ProposalForm() {
  const ready = useSyncExternalStore(subscribe, () => true, () => false);
  const [text, setText] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<ProposalInterpretation | null>(null);
  const inFlight = useRef(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready || inFlight.current) return;
    setPreview(null); setError('');
    if (!text.trim() || text.length > 2000) { setError('Escreva uma proposta de até 2.000 caracteres.'); return; }
    inFlight.current = true; setPending(true);
    try {
      const response = await fetch('/api/propostas/interpretar', {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto: text }),
      });
      if (!response.ok) {
        setError(response.status === 401 ? 'Entre novamente com uma conta confirmada.' : response.status === 429 ? 'Limite temporário atingido. Tente novamente mais tarde.' : 'Não foi possível interpretar agora. Tente novamente mais tarde.');
        return;
      }
      // Server validates the full schema. Never render provider error messages.
      const body = await response.json();
      const value = body.interpretacao as ProposalInterpretation;
      if (value?.estado !== 'revisao_humana_pendente' || value.verificacao !== 'nao_verificada' || !value.dados || ![...Object.keys(labels), 'relacoes'].every(key => Array.isArray(value.dados[key as keyof typeof value.dados]))) throw new Error('invalid preview');
      setPreview(value);
    } catch { setError('Não foi possível interpretar agora. Tente novamente mais tarde.'); }
    finally { inFlight.current = false; setPending(false); }
  }
  return <>
    <p>Descreva a proposta sem senhas, documentos ou dados pessoais desnecessários. Ao interpretar, o texto será enviado a um serviço de IA para gerar sugestões. Nada será salvo ou publicado por este formulário.</p>
    <form action="/api/propostas/interpretar" method="post" onSubmit={submit} aria-busy={pending}>
      <label htmlFor="proposal-text">Sua proposta</label>
      <textarea id="proposal-text" name="texto" rows={8} required maxLength={2000} disabled={pending} value={text} aria-describedby="proposal-limit" onChange={event => { setText(event.target.value); setPreview(null); setError(''); }} />
      <p id="proposal-limit">Até 2.000 caracteres. Reveja as sugestões: fontes e trechos não comprovam os fatos.</p>
      <button type="submit" disabled={pending || !ready}>{pending ? 'Interpretando…' : 'Interpretar proposta'}</button>
    </form>
    {pending && <p role="status">Aguarde a interpretação.</p>}
    {error && <p role="alert">{error}</p>}
    {preview && <section aria-label="Prévia da proposta" aria-live="polite">
      <h2>Prévia para revisão humana</h2>
      <p>Interpretação não verificada. Revise cada sugestão e seu trecho de origem. Ela não cria titularidade, representação institucional, vínculo de confiança ou publicação.</p>
      {(Object.keys(labels) as (keyof typeof labels)[]).map(category => <section key={category}>
        <h3>{labels[category]}</h3>
        {preview.dados[category].length ? <ul>{preview.dados[category].map((item, index) => <li key={index}>
          <p>{item.descricao}</p><p>Trecho de origem:</p><blockquote>{item.trecho}</blockquote>
        </li>)}</ul> : <p>Nenhuma menção identificada.</p>}
      </section>)}
      <section><h3>Relações alegadas</h3>
        {preview.dados.relacoes.length ? <ul>{preview.dados.relacoes.map((item, index) => <li key={index}>
          <p>{item.origem} → {item.destino}: {item.tipo}</p><p>Trecho de origem:</p><blockquote>{item.trecho}</blockquote>
        </li>)}</ul> : <p>Nenhuma relação identificada.</p>}
      </section>
    </section>}
  </>;
}
