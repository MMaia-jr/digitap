'use client';
import { useRef, useState, useSyncExternalStore, type FormEvent } from 'react';
import type { ProposalInterpretation } from '../lib/proposals/interpret.server';
const subscribe = () => () => {};
const labels = {
  sujeitos: 'Possíveis sujeitos', projetos: 'Possíveis projetos', atividades: 'Atividades propostas',
  capacidades: 'Capacidades declaradas', fontes: 'Fontes citadas', informacoes_nao_verificadas: 'Informações não verificadas',
};
type DescriptionCategory = keyof typeof labels;
type Category = keyof ProposalInterpretation['dados'];
type SubjectType = ProposalInterpretation['dados']['sujeitos'][number]['tipo'];
const subjectLabels: Record<SubjectType, string> = {
  pessoa_fisica: 'Pessoa física', coletivo_informal: 'Coletivo informal',
  organizacao: 'Organização', nao_informado: 'Não informado',
};
export function ProposalForm() {
  const ready = useSyncExternalStore(subscribe, () => true, () => false);
  const [text, setText] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<ProposalInterpretation | null>(null);
  const [original, setOriginal] = useState<ProposalInterpretation | null>(null);
  const restoreButton = useRef<HTMLButtonElement>(null);
  const inFlight = useRef(false);
  function editDescription(category: DescriptionCategory, index: number, value: string) {
    setPreview(current => current && ({ ...current, dados: { ...current.dados,
      [category]: current.dados[category].map((item, i) => i === index ? { ...item, descricao: value.slice(0, 1000) } : item),
    } }));
  }
  function editSubject(index: number, value: string) {
    if (!Object.hasOwn(subjectLabels, value)) return;
    setPreview(current => current && ({ ...current, dados: { ...current.dados,
      sujeitos: current.dados.sujeitos.map((item, i) => i === index ? { ...item, tipo: value as SubjectType } : item),
    } }));
  }
  function editRelation(index: number, field: 'origem' | 'destino' | 'tipo', value: string) {
    setPreview(current => current && ({ ...current, dados: { ...current.dados,
      relacoes: current.dados.relacoes.map((item, i) => i === index ? { ...item, [field]: value.slice(0, 1000) } : item),
    } }));
  }
  function discard(category: Category, index: number) {
    setPreview(current => current && ({ ...current, dados: { ...current.dados,
      [category]: current.dados[category].filter((_, i) => i !== index),
    } }));
    restoreButton.current?.focus();
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready || inFlight.current) return;
    setPreview(null); setOriginal(null); setError('');
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
      setOriginal(value); setPreview(value);
    } catch { setError('Não foi possível interpretar agora. Tente novamente mais tarde.'); }
    finally { inFlight.current = false; setPending(false); }
  }
  return <>
    <p>Descreva a proposta sem senhas, documentos ou dados pessoais desnecessários. Ao interpretar, o texto será enviado a um serviço de IA para gerar sugestões. Nada será salvo ou publicado por este formulário.</p>
    <form action="/api/propostas/interpretar" method="post" onSubmit={submit} aria-busy={pending}>
      <label htmlFor="proposal-text">Sua proposta</label>
      <textarea id="proposal-text" name="texto" rows={8} required maxLength={2000} disabled={pending} value={text} aria-describedby="proposal-limit" onChange={event => { setText(event.target.value); setPreview(null); setOriginal(null); setError(''); }} />
      <p id="proposal-limit">Até 2.000 caracteres. Reveja as sugestões: fontes e trechos não comprovam os fatos.</p>
      <button type="submit" disabled={pending || !ready}>{pending ? 'Interpretando…' : 'Interpretar proposta'}</button>
    </form>
    {pending && <p role="status">Aguarde a interpretação.</p>}
    {error && <p role="alert">{error}</p>}
    {preview && <section aria-label="Prévia da proposta" aria-live="polite">
      <h2>Prévia para revisão humana</h2>
      <p>Interpretação não verificada. Revise cada sugestão e seu trecho de origem. Ela não cria titularidade, representação institucional, vínculo de confiança ou publicação.</p>
      <p>As correções são temporárias e desaparecerão ao sair da página. Nada será salvo. Restaurar recupera somente a resposta original desta interpretação.</p>
      <p id="review-limit">Até 1.000 caracteres por campo. Campos vazios precisam de revisão. Os trechos de origem não podem ser editados e não comprovam os fatos.</p>
      <button ref={restoreButton} type="button" onClick={() => setPreview(original)}>Restaurar prévia original</button>
      {(Object.keys(labels) as DescriptionCategory[]).map(category => <section key={category}>
        <h3>{labels[category]}</h3>
        {preview.dados[category].length ? <ul>{preview.dados[category].map((item, index) => <li key={index}>
          <p>{item.descricao}</p><p>Trecho de origem:</p><blockquote>{item.trecho}</blockquote>
          <label>Descrição — {labels[category]} {index + 1}
            <input type="text" maxLength={1000} value={item.descricao} aria-invalid={!item.descricao.trim()} aria-describedby="review-limit" onChange={event => editDescription(category, index, event.target.value)} />
          </label>
          {category === 'sujeitos' && <label>Tipo de sujeito — {labels[category]} {index + 1}
            <select value={preview.dados.sujeitos[index].tipo} onChange={event => editSubject(index, event.target.value)}>
              {(Object.keys(subjectLabels) as SubjectType[]).map(type => <option key={type} value={type}>{subjectLabels[type]}</option>)}
            </select>
          </label>}
          <button type="button" onClick={() => discard(category, index)}>Descartar {labels[category]} {index + 1}</button>
        </li>)}</ul> : <p>Nenhuma menção identificada.</p>}
      </section>)}
      <section><h3>Relações alegadas</h3>
        {preview.dados.relacoes.length ? <ul>{preview.dados.relacoes.map((item, index) => <li key={index}>
          <p>{item.origem} → {item.destino}: {item.tipo}</p><p>Trecho de origem:</p><blockquote>{item.trecho}</blockquote>
          {(['origem', 'destino', 'tipo'] as const).map(field => <label key={field}>
            {{ origem: 'Origem', destino: 'Destino', tipo: 'Tipo' }[field]} — Relações alegadas {index + 1}
            <input type="text" maxLength={1000} value={item[field]} aria-invalid={!item[field].trim()} aria-describedby="review-limit" onChange={event => editRelation(index, field, event.target.value)} />
          </label>)}
          <button type="button" onClick={() => discard('relacoes', index)}>Descartar Relações alegadas {index + 1}</button>
        </li>)}</ul> : <p>Nenhuma relação identificada.</p>}
      </section>
    </section>}
  </>;
}
