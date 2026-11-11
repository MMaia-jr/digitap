import Link from 'next/link';
export const metadata = { title: 'Termos de uso' };
export default function Terms() {
  return <article className="card">
    <h1>Termos de uso</h1>
    <h2>O que é o DigItap</h2>
    <p>O DigItap, também apresentado como A Praça, é uma infraestrutura cívica para organizar atividades, reunir evidências e apresentar trajetórias comunitárias. Não é uma rede social. Está em beta, sob responsabilidade operacional provisória de Marcos Antonio Maia Júnior; a governança institucional ainda está em construção.</p>
    <h2>Regras de publicação</h2>
    <p>Publique conteúdo lícito, respeitoso e verdadeiro. Informe o que é proposta, relato ou evidência. Não se passe por outra pessoa ou organização. Não publique ameaças, discriminação, dados privados nem imagens de terceiros sem a autorização necessária. Você é responsável pelo conteúdo enviado e deve ter direito de compartilhá-lo.</p>
    <p>Ter uma conta não garante publicação. A curadoria pode pedir correções, recusar ou retirar conteúdo conforme o risco e as regras da plataforma. A aprovação não certifica representação institucional, realização de atividade, número de participantes ou parceria.</p>
    <h2>Direitos autorais</h2>
    <p>O código do projeto é disponibilizado sob <a href="https://www.gnu.org/licenses/agpl-3.0.html">AGPLv3</a> e os documentos do projeto sob <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.pt-br">CC BY-SA 4.0</a>, conforme a orientação de licenciamento aberto. Preserve a autoria e respeite as condições de cada licença ao reutilizar esses materiais.</p>
    <p>Essas licenças não se aplicam automaticamente às fotos, relatos e obras de terceiros enviados por usuários. A autoria continua com seus titulares. Ao enviar material para publicação, você autoriza sua exibição e inclusão no portfólio na medida necessária a essa finalidade; isso não autoriza usos irrestritos por terceiros.</p>
    <h2>Limites do beta</h2>
    <p>Podem ocorrer falhas, interrupções e mudanças. Não há promessa de disponibilidade contínua, certificação das informações ou obtenção de recursos e oportunidades. Confira os dados com os responsáveis antes de tomar decisões. Esses limites não afastam direitos previstos em lei nem a responsabilidade legal de quem opera a plataforma.</p>
    <h2>Contestação e dados pessoais</h2>
    <p>Para contestar publicação, decisão de curadoria ou pedir correção, escreva para <a href="mailto:muralitaperuna@gmail.com">muralitaperuna@gmail.com</a>. Consulte o <Link href="/contestacao">procedimento e prazo de resposta</Link>, a <Link href="/privacidade">política de privacidade</Link> e a <Link href="/governanca">governança provisória</Link>.</p>
    <p>Última atualização: <time dateTime="2026-11-11">11/11/2026</time>.</p>
  </article>;
}
