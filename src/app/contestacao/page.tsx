import Link from 'next/link';
export const metadata = { title: 'Contestação e correções' };
export default function Contestation() {
  return <article className="card">
    <h1>Contestar publicação ou solicitar correção</h1>
    <p>Qualquer pessoa pode contestar publicação ou decisão de curadoria, mesmo sem conta. O responsável operacional provisório é Marcos Antonio Maia Júnior.</p>
    <h2>Como enviar</h2>
    <p>Escreva para <a href="mailto:muralitaperuna@gmail.com">muralitaperuna@gmail.com</a> com o assunto “Contestação DigItap”. Inclua o link da página ou descreva a decisão, explique o problema e a correção desejada. Acrescente referências que ajudem a análise e um endereço para resposta.</p>
    <p>Não envie senha, documentos de identidade nem dados sensíveis sem que sejam necessários e solicitados. Se houver exposição de dados pessoais ou risco imediato, destaque isso no assunto para priorização.</p>
    <h2>Prazo e próximos passos</h2>
    <p>O compromisso é responder em até 30 dias a partir do recebimento, respeitando prazos legais menores. O responsável analisa o pedido, pode solicitar esclarecimentos e ouvir o publicador quando isso não ampliar o risco de exposição.</p>
    <p>A análise pode resultar em correção, retirada, nova revisão ou manutenção da publicação, com explicação. Conteúdos com risco de dano podem ter sua retirada priorizada. Você receberá a decisão por e-mail e poderá pedir reavaliação, apontando o que considera incorreto ou trazendo novas informações.</p>
    <p>Quando houver divulgação de decisão de interesse público, ela deve omitir dados pessoais e informações que identifiquem o solicitante sem necessidade. O atendimento não depende de concordar com a plataforma.</p>
    <p>Veja a <Link href="/privacidade">política de privacidade</Link> e os <Link href="/termos">termos de uso</Link>.</p>
    <p>Última atualização: <time dateTime="2026-11-11">11/11/2026</time>.</p>
  </article>;
}
