'use client';
import { useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import type { IdeaView } from '../lib/ideas/service.server';
import { ProposalForm, type ProposalDraft } from './ProposalForm';

const subscribe = () => () => {};

export function IdeasWorkspace({ initialIdeas }: { initialIdeas: IdeaView[] }) {
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const [ideas, setIdeas] = useState<IdeaView[]>(initialIdeas);
  const [selected, setSelected] = useState<IdeaView | undefined>();
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);

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
      setNotice('Rascunho privado salvo. Ele não foi verificado nem publicado.');
    } catch (cause) {
      if (cause instanceof Error && cause.message === 'conflict') throw cause;
      setError('Não foi possível salvar o rascunho. Tente novamente.');
      throw cause;
    } finally { setWorking(false); }
  }

  async function remove(idea: IdeaView) {
    if (!window.confirm(`Excluir definitivamente “${idea.title}”?`)) return;
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
    <p>As ideias salvas são privadas da sua conta, não verificadas e não publicadas. Interpretar não salva; use o botão explícito abaixo. A interpretação revisada é reaberta sem uma nova chamada à IA.</p>
    {notice && <p role="status">{notice}</p>}{error && <p role="alert">{error}</p>}
    <section aria-labelledby="minhas-ideias">
      <h2 id="minhas-ideias">Minhas ideias</h2>
      {ideas.length === 0 ? <p>Nenhum rascunho salvo.</p> : <ul>{ideas.map(idea => <li key={idea.id}>
        <h3>{idea.title}</h3><p>Privada · não verificada · não publicada</p>
        <details><summary>Ver conteúdo da ideia</summary><h4>Texto original</h4><blockquote>{idea.original_text}</blockquote>{idea.revised_text&&<><h4>Texto revisado</h4><blockquote>{idea.revised_text}</blockquote></>}<h4>Possíveis atividades</h4><ul>{(idea.revised_interpretation??idea.original_interpretation).dados.atividades.map((item,index)=><li key={index}>{item.descricao}<blockquote>Trecho de origem: {item.trecho}</blockquote></li>)}</ul><p>As sugestões não são verificadas nem publicadas.</p></details>
        <Link href={`/dashboard/pessoa-fisica/nova?ideia=${encodeURIComponent(idea.id)}`}>Usar esta ideia para criar uma atividade</Link>
        <button type="button" disabled={!hydrated || working} onClick={() => { setSelected(idea); setNotice(''); setError(''); }}>Retomar</button>
        <button type="button" disabled={!hydrated || working} onClick={() => remove(idea)}>Excluir</button>
      </li>)}</ul>}
    </section>
    <section aria-labelledby="editor-ideia"><h2 id="editor-ideia">{selected ? `Retomar: ${selected.title}` : 'Nova ideia'}</h2>
      <ProposalForm key={selected?.id ?? 'new'} initialIdea={selected} onSave={save} />
    </section>
  </>;
}
