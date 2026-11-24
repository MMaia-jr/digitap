'use client';
import { useRef, useState, useSyncExternalStore, type FormEvent } from 'react';
import type { ProposalInterpretation } from '../lib/proposals/interpret.server';
import type { IdeaView } from '../lib/ideas/service.server';
const subscribe = () => () => {};
const labels = {
  sujeitos: 'Possíveis sujeitos', projetos: 'Possíveis projetos', atividades: 'Atividades propostas',
  capacidades: 'Capacidades declaradas', fontes: 'Fontes citadas', informacoes_nao_verificadas: 'Informações não verificadas',
};
type DescriptionCategory = keyof typeof labels;
type Category = keyof ProposalInterpretation['dados'];
type SubjectType = ProposalInterpretation['dados']['sujeitos'][number]['tipo'];
export type ProposalDraft = { title: string; originalText: string; originalInterpretation: ProposalInterpretation; revisedInterpretation: ProposalInterpretation | null; expectedVersion?: number; id?: string };
type ContextSubjectOption = { id: string; name: string; type: string };
const subjectLabels: Record<SubjectType, string> = {
  pessoa_fisica: 'Pessoa física', coletivo_informal: 'Coletivo informal',
  organizacao: 'Organização', nao_informado: 'Não informado',
};
export function ProposalForm({ initialIdea, onSave }: { initialIdea?: IdeaView; onSave?: (draft: ProposalDraft) => Promise<void> }) {
  const ready = useSyncExternalStore(subscribe, () => true, () => false);
  const [text, setText] = useState(initialIdea?.revised_text ?? initialIdea?.original_text ?? '');
  const [title, setTitle] = useState(initialIdea?.title ?? '');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<ProposalInterpretation | null>(
    initialIdea && initialIdea.revised_text !== null && initialIdea.revised_interpretation === null
      ? null : initialIdea?.revised_interpretation ?? initialIdea?.original_interpretation ?? null,
  );
  const [original, setOriginal] = useState<ProposalInterpretation | null>(
    initialIdea && initialIdea.revised_text !== null
      ? initialIdea.revised_interpretation : initialIdea?.original_interpretation ?? null,
  );
  const [saving, setSaving] = useState(false);
  const [contextEnabled, setContextEnabled] = useState(false);
  const [contextSubjects, setContextSubjects] = useState<ContextSubjectOption[] | null>(null);
  const [contextSubjectId, setContextSubjectId] = useState('');
  const [contextConsent, setContextConsent] = useState(false);
  const [contextLoading, setContextLoading] = useState(false);
  const [contextLoadError, setContextLoadError] = useState('');
  const restoreButton = useRef<HTMLButtonElement>(null);
  const inFlight = useRef(false);
  const textChanged = Boolean(initialIdea && text !== (initialIdea.revised_text ?? initialIdea.original_text));
  // A manually revised idea can be saved without another paid interpretation.
  // Null means there is no interpretation for this version, not that the old one is current.
  const manualRevision = Boolean(initialIdea && !preview && (textChanged || title !== initialIdea.title));
  async function toggleContext(enabled: boolean) {
    setContextEnabled(enabled); setContextConsent(false); setContextSubjectId(''); setContextLoadError('');
    // A preview belongs to the context used for its inference; never reuse it after a scope change.
    setPreview(null); setOriginal(null);
    if (!enabled || contextSubjects !== null) return;
    setContextLoading(true);
    try {
      const response = await fetch('/api/e4?action=subjects', { credentials: 'same-origin' });
      if (!response.ok) throw new Error('context unavailable');
      const body = await response.json() as { subjects?: unknown };
      const subjects = Array.isArray(body.subjects) ? body.subjects.filter((item): item is ContextSubjectOption =>
        item !== null && typeof item === 'object' && typeof item.id === 'string' && typeof item.name === 'string' && typeof item.type === 'string',
      ).map(({ id, name, type }) => ({ id, name, type })) : [];
      setContextSubjects(subjects);
    } catch {
      setContextSubjects([]); setContextLoadError('Não foi possível carregar os sujeitos autorizados. Você pode continuar sem contexto.');
    } finally { setContextLoading(false); }
  }
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
    if (contextEnabled && (!contextSubjectId || !contextConsent)) { setError('Escolha um sujeito e autorize explicitamente o envio do contexto, ou interprete sem contexto.'); return; }
    inFlight.current = true; setPending(true);
    try {
      const response = await fetch('/api/propostas/interpretar', {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contextEnabled ? { texto: text, contexto: { subjectId: contextSubjectId, consentimento: true } } : { texto: text }),
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
    finally { inFlight.current = false; setPending(false); if (contextEnabled) setContextConsent(false); }
  }
  async function saveDraft() {
    const originalInterpretation = initialIdea?.original_interpretation ?? original;
    if (!onSave || saving || !originalInterpretation || (!manualRevision && (!preview || !original))) return;
    if (!title.trim() || title.length > 160) { setError('Informe um título de até 160 caracteres.'); return; }
    if (!text.trim() || text.length > 20000) { setError('Informe um texto de até 20.000 caracteres.'); return; }
    setSaving(true); setError('');
    try {
      await onSave({ title, originalText: text, originalInterpretation, revisedInterpretation: preview, ...(initialIdea ? { id: initialIdea.id, expectedVersion: initialIdea.version } : {}) });
    } catch (cause) {
      setError(cause instanceof Error && cause.message === 'conflict' ? 'Este rascunho foi alterado em outra sessão. Reabra a versão atual antes de salvar.' : 'Não foi possível salvar o rascunho. Tente novamente.');
    } finally { setSaving(false); }
  }
  return <>
    <p>Descreva a proposta sem senhas, documentos ou dados pessoais desnecessários. Ao interpretar, o texto será enviado a um serviço de IA para gerar sugestões. Nada será salvo ou publicado por este formulário.</p>
    <form action="/api/propostas/interpretar" method="post" onSubmit={submit} aria-busy={pending}>
      <label htmlFor="idea-title">Título do rascunho</label>
      <input id="idea-title" name="titulo" maxLength={160} value={title} onChange={event => setTitle(event.target.value)} />
      <label htmlFor="proposal-text">Sua proposta</label>
      <textarea id="proposal-text" name="texto" rows={8} required maxLength={initialIdea ? 20000 : 2000} disabled={pending} value={text} aria-describedby="proposal-limit" onChange={event => { setText(event.target.value); setPreview(null); setOriginal(null); setError(''); }} />
      <p id="proposal-limit">Até {initialIdea ? '20.000' : '2.000'} caracteres. Reveja as sugestões: fontes e trechos não comprovam os fatos.</p>
      <fieldset>
        <legend>Contexto opcional</legend>
        <label htmlFor="use-authorized-context"><input id="use-authorized-context" type="checkbox" checked={contextEnabled} disabled={pending || contextLoading} onChange={event => void toggleContext(event.target.checked)} /> Usar contexto autorizado</label>
        {contextEnabled && <>
          <p id="context-disclosure">O contexto selecionado poderá conter dados privados do sujeito escolhido e será enviado a um provedor externo de IA para gerar sugestões. Ele não será publicado ou salvo por esta interpretação. Você também pode desmarcar a opção e interpretar sem contexto.</p>
          {contextLoading && <p role="status">Carregando sujeitos autorizados…</p>}
          {contextLoadError && <p role="alert">{contextLoadError}</p>}
          {contextSubjects && contextSubjects.length > 0 && <label htmlFor="context-subject">Sujeito do contexto
            <select id="context-subject" value={contextSubjectId} disabled={pending || contextLoading} aria-describedby="context-disclosure" onChange={event => { setContextSubjectId(event.target.value); setContextConsent(false); setPreview(null); setOriginal(null); }}>
              <option value="">Escolha explicitamente um sujeito</option>
              {contextSubjects.map(subject => <option key={subject.id} value={subject.id}>{subject.name} — {subject.type}</option>)}
            </select>
          </label>}
          {contextSubjects?.length === 0 && !contextLoading && <p>Nenhum sujeito autorizado disponível para contextualizar. Você pode continuar sem contexto.</p>}
          {contextSubjectId && <label htmlFor="context-consent"><input id="context-consent" type="checkbox" checked={contextConsent} disabled={pending} onChange={event => setContextConsent(event.target.checked)} /> Autorizo o envio do contexto selecionado ao provedor de IA</label>}
        </>}
      </fieldset>
      <button type="submit" disabled={pending || !ready}>{pending ? 'Interpretando…' : 'Interpretar proposta'}</button>
    </form>
    {pending && <p role="status">Aguarde a interpretação.</p>}
    {error && <p role="alert">{error}</p>}
    {manualRevision && onSave && <section aria-label="Revisão manual da ideia">
      <p>A interpretação anterior não vale para este texto revisado. Você pode salvar suas alterações sem novas sugestões de IA, ou interpretar novamente depois.</p>
      <button type="button" onClick={saveDraft} disabled={saving || pending || !title.trim() || !text.trim()}>{saving ? 'Salvando…' : 'Salvar alterações'}</button>
    </section>}
    {preview && <section aria-label="Prévia da proposta" aria-live="polite">
      <h2>Prévia para revisão humana</h2>
      <p>Interpretação não verificada. Revise cada sugestão e seu trecho de origem. Ela não cria titularidade, representação institucional, vínculo de confiança ou publicação.</p>
      <p>As correções são temporárias e desaparecerão ao sair da página. Restaurar recupera somente a resposta original desta interpretação.</p>
      {onSave ? <p>Esta prévia e quaisquer alterações ainda não estão salvas. Use “Salvar rascunho” para mantê-las privadamente.</p> : <p>Nada será salvo ou publicado por este formulário.</p>}
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
      {onSave && <button type="button" onClick={saveDraft} disabled={saving || pending || !title.trim() || !text.trim()}>{saving ? 'Salvando…' : initialIdea ? 'Salvar alterações' : 'Salvar rascunho'}</button>}
    </section>}
  </>;
}
