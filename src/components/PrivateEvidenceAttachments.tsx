'use client';
import {useEffect, useRef, useState, useSyncExternalStore, type FormEvent} from 'react';
import {browserClient} from '../lib/supabase/browser';

type PrivateAttachment = {id: string; contentType: string; sizeBytes: number; estado: 'confirmado'};
type UploadAttempt = {file: File; id: string; objectKey: string; token: string; bucket: string; uploaded: boolean};
const subscribe = () => () => {};
const maxBytes = 25 * 1024 * 1024;
const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

export function PrivateEvidenceAttachments({registroId, canUpload}: {registroId: string; canUpload: boolean}) {
  const ready = useSyncExternalStore(subscribe, () => true, () => false);
  const [files, setFiles] = useState<PrivateAttachment[]>([]);
  const [selected, setSelected] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{kind: 'status' | 'error'; message: string} | null>(null);
  const [revision, setRevision] = useState(0);
  const attempt = useRef<UploadAttempt | null>(null);
  const lock = useRef(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    void fetch(`/api/registros/${registroId}/arquivos`, {credentials: 'same-origin', cache: 'no-store'})
      .then(async response => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.message ?? 'Não foi possível carregar anexos privados.');
        if (active) setFiles(Array.isArray(body.arquivos) ? body.arquivos : []);
      })
      .catch(() => { if (active) setFeedback({kind: 'error', message: 'Não foi possível carregar anexos privados.'}); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [registroId, revision]);

  async function refresh() {
    setRevision(value => value + 1);
  }

  async function complete(attemptValue: UploadAttempt) {
    const response = await fetch(`/api/registros/${registroId}/arquivos/${attemptValue.id}/confirmar`, {
      method: 'POST', credentials: 'same-origin', headers: {'Content-Type': 'application/json'}, body: '{}',
    });
    if (response.ok) return;
    const body = await response.json().catch(() => ({}));
    if (response.status === 409) {
      const listed = await fetch(`/api/registros/${registroId}/arquivos`, {credentials: 'same-origin', cache: 'no-store'});
      const result = await listed.json().catch(() => ({}));
      if (listed.ok && result.arquivos?.some((file: PrivateAttachment) => file.id === attemptValue.id)) return;
    }
    throw new Error(body.message ?? 'Não foi possível confirmar o arquivo. Você pode tentar novamente.');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = selected;
    if (!file || lock.current) return;
    if (!allowedTypes.has(file.type) || file.size <= 0 || file.size > maxBytes) {
      setFeedback({kind: 'error', message: 'Selecione um arquivo permitido de até 25 MB.'});
      return;
    }
    lock.current = true;
    setPending(true);
    setFeedback(null);
    try {
      let current = attempt.current;
      if (!current || current.file !== file) {
        const initialized = await fetch(`/api/registros/${registroId}/arquivos`, {
          method: 'POST', credentials: 'same-origin', headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({contentType: file.type, sizeBytes: file.size}),
        });
        const body = await initialized.json();
        if (!initialized.ok) throw new Error(body.message ?? 'Não foi possível iniciar o upload. Você pode tentar novamente.');
        current = {file, id: body.arquivo.id, objectKey: body.arquivo.objectKey,
          token: body.arquivo.uploadToken, bucket: body.arquivo.bucket, uploaded: false};
        attempt.current = current;
      }
      if (!current.uploaded) {
        const {error} = await browserClient().storage.from(current.bucket).uploadToSignedUrl(
          current.objectKey, current.token, file, {contentType: file.type, upsert: false},
        );
        const status = Number(error?.statusCode ?? error?.status);
        if (error && status !== 409) throw new Error('Não foi possível enviar o arquivo. Você pode tentar novamente.');
        current.uploaded = true;
      }
      await complete(current);
      attempt.current = null;
      setSelected(null);
      if (input.current) input.current.value = '';
      setFeedback({kind: 'status', message: 'Anexo privado confirmado.'});
      await refresh();
    } catch (error) {
      setFeedback({kind: 'error', message: error instanceof Error
        ? error.message : 'Não foi possível enviar o arquivo. Você pode tentar novamente.'});
    } finally {
      lock.current = false;
      setPending(false);
    }
  }

  return <section aria-label="Anexos privados">
    <h3>Anexos privados</h3>
    <p>Arquivos ficam restritos a pessoas com vínculo e permissão vigentes; não são publicados automaticamente.</p>
    {feedback && <p role={feedback.kind === 'error' ? 'alert' : 'status'}>{feedback.message}</p>}
    {loading ? <p role="status">Carregando anexos privados…</p> : files.length
      ? <ul>{files.map(file => <li key={file.id}>
        <span>Anexo privado — {file.contentType}, {file.sizeBytes} bytes</span>{' '}
        <a href={`/api/registros/${registroId}/arquivos/${file.id}`} rel="noreferrer">Abrir anexo privado</a>
      </li>)}</ul>
      : <p>Nenhum anexo confirmado.</p>}
    {canUpload && <form onSubmit={submit} aria-busy={pending}>
      <label htmlFor={`arquivo-privado-${registroId}`}>Arquivo de evidência privada</label>
      <input ref={input} id={`arquivo-privado-${registroId}`} type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf" disabled={!ready || pending}
        onChange={event => { attempt.current = null; setSelected(event.currentTarget.files?.[0] ?? null); setFeedback(null); }}/>
      <button type="submit" disabled={!ready || pending || !selected}>
        {pending ? 'Enviando…' : 'Enviar evidência privada'}
      </button>
    </form>}
  </section>;
}
