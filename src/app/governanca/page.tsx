import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Governança provisória' };

export default function Governance() {
  return (
    <article className="card">
      <h1>Governança provisória</h1>
      <p>A Praça é operada hoje por Marcos Antonio Maia Júnior, editor provisório.</p>

      <h2>O que é provisório</h2>
      <p>A Praça ainda não tem CNPJ, estatuto aprovado nem assembleia constituída. A proposta de associação ainda não foi formalizada.</p>

      <h2>O que está decidido</h2>
      <p>Pessoas físicas novas passam por revisão antes da primeira publicação; depois de um histórico aprovado, podem publicar com revisão posterior. Coletivos informais precisam da confirmação de dois membros de contas distintas, revisão do nome e da primeira atividade. Pessoas físicas, coletivos informais e organizações são reconhecidos como formas diferentes de participação, sem exigir que uma pessoa se apresente como organização. A revisão acompanha o risco: novos participantes passam por análise inicial, organizações com histórico podem publicar com revisão posterior e denúncias reabrem a análise.</p>

      <h2>Como contestar</h2>
      <p>Envie um e-mail para <a href="mailto:muralitaperuna@gmail.com">muralitaperuna@gmail.com</a> com a descrição da decisão ou situação que deseja contestar e as evidências disponíveis.</p>
      <p>A contestação será respondida em até 30 dias. A resposta será pública, sem expor dados pessoais.</p>

      <h2>Compromisso de atualização</h2>
      <p>Quando a associação for formalizada, esta página será atualizada para identificar quem assume a governança e quais regras passam a valer.</p>
      <p>Última atualização: <time dateTime="2026-11-06">06/11/2026</time>.</p>
    </article>
  );
}
