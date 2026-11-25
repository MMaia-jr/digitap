'use client';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import type { IdeaView } from '../lib/ideas/service.server';
import { IdeaDecisions } from './IdeaDecisions';
import { ProposalForm, type ProposalDraft } from './ProposalForm';

const subscribe = () => () => {};
const savedNotice = 'Rascunho privado salvo. Ele não foi verificado nem publicado.';

export function IdeasWorkspace({ initialIdeas, canInterpret = true, manualActivityHref }: {
  initialIdeas: IdeaView[];
  canInterpret?: boolean;
  manualActivityHref?: string;
}) {
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const [ideas, setIdeas] = useState<IdeaView[]>(initialIdeas);
  const [selected, setSelected] = useState<IdeaView | undefined>();
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);
  const saveStatus = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (notice === savedNotice) saveStatus.current?.focus();
  }, [notice, selected?.version]);

  async function save(draft: ProposalDraft) {
    if (working) return;
    setWorking(true); setNotice(''); setError('');
    try {
      const response = await fetch('/api/ideias', {
        method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' },
        body: JSON.stringify(draft.id ? {
          action: 'update', id: draft.id, expectedVersion: draft.expectedVersion, title: draft.title,
          revisedText: draft.originalText, revisedInterpretation: draft.revisedInterpretation,
        } : {
          action: 'create', title: draft.title, originalText: draft.originalText,
          originalInterpretation: draft.originalInterpretation, revisedInterpretation: draft.revisedInterpretation,
        }),
      });
      if (response.status === 409) throw new Error('conflict');
      if (!response.ok) throw new Error('save');
      const body = await response.json() as { ideia?: IdeaView };
      if (!body.ideia?.id) throw new Error('save');
      setIdeas(current => [body.ideia!, ...current.filter(item => item.id !== body.ideia!.id)]);
      setSelected(body.ideia);
      setNotice(savedNotice);
    } catch (cause) {
      if (cause instanceof Error && cause.message === 'conflict') throw cause;
      setError('Não foi possível salvar o rascunho. Tente novamente.');
      throw cause;
    } finally { setWorking(false); }
  }

  async function remove(idea: IdeaView) {
    const warning = `Excluir definitivamente “${idea.title}”? Isso também apaga o histórico de decisões e a fotografia decisória de origem de cada atividade associada, se existirem. Cada atividade permanecerá salva.`;
    if (!window.confirm(warning)) return;
    setWorking(true); setNotice(''); setError('');
    try {
      const response = await fetch('/api/ideias', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'delete', id: idea.id, confirmDelete: true }) });
      if (!response.ok) throw new Error('delete');
      setIdeas(current => current.filter(item => item.id !== idea.id));
      if (selected?.id === idea.id) setSelected(undefined);
      setNotice('Rascunho excluído.');
    } catch { setError('Não foi possível excluir o rascunho. Tente novamente.'); }
    finally { setWorking(false); }
  }

  return <>
    <p>As ideias salvas são privadas da sua conta, não verificadas e não publicadas. Você pode retomar uma ideia salva sem usar IA.</p>
    {!canInterpret && <>
      <p>A interpretação com IA é reservada às contas autorizadas no beta. Você pode revisar suas ideias salvas e continuar suas atividades.</p>
      {manualActivityHref && <p><Link href={manualActivityHref}>Preparar uma atividade manualmente</Link></p>}
    </>}
    {notice && <p ref={saveStatus} role="status" tabIndex={notice === savedNotice ? -1 : undefined}>{notice}</p>}{error && <p role="alert">{error}</p>}
    <section aria-labelledby="minhas-ideias">
      <h2 id="minhas-ideias">Minhas ideias</h2>
      {ideas.length === 0 ? <p>Nenhum rascunho salvo.</p> : <ul>{ideas.map(idea => <li key={idea.id}>
        <h3>{idea.title}</h3><p>Privada · não verificada · não publicada</p>
        <details><summary>Ver conteúdo da ideia</summary><h4>Texto original</h4><blockquote>{idea.original_text}</blockquote>{idea.revised_text&&<><h4>Texto revisado</h4><blockquote>{idea.revised_text}</blockquote></>}<h4>Possíveis atividades</h4>{idea.revised_text !== null && idea.revised_interpretation === null
          ? <p>O texto revisado ainda não tem interpretação atualizada. Prepare a atividade com suas próprias informações.</p>
          : <ul>{(idea.revised_interpretation??idea.original_interpretation).dados.atividades.map((item,index)=><li key={index}>{item.descricao}<blockquote>Trecho de origem: {item.trecho}</blockquote></li>)}</ul>}<p>As sugestões não são verificadas nem publicadas.</p></details>
        <Link href={`/dashboard/pessoa-fisica/nova?ideia=${encodeURIComponent(idea.id)}`}>Usar esta ideia para criar uma atividade</Link>
        <button type="button" disabled={!hydrated || working} onClick={() => { setSelected(idea); setNotice(''); setError(''); }}>Retomar</button>
        <button type="button" disabled={!hydrated || working} onClick={() => remove(idea)}>Excluir</button>
      </li>)}</ul>}
    </section>
    {(selected || canInterpret) && <section aria-labelledby="editor-ideia"><h2 id="editor-ideia">{selected ? `Retomar: ${selected.title}` : 'Nova ideia'}</h2>
      {selected && <IdeaDecisions key={`decisions:${selected.id}`} idea={selected} onConfirmed={confirmed => {
        setIdeas(current => current.map(idea => idea.id === confirmed.id && idea.version < confirmed.version ? confirmed : idea));
        setSelected(current => current?.id === confirmed.id && current.version < confirmed.version ? confirmed : current);
      }} />}
      <ProposalForm key={`proposal:${selected?.id ?? 'new'}`} initialIdea={selected} onSave={save} canInterpret={canInterpret} />
    </section>}
  </>;
}
