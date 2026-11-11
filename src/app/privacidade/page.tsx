import Link from 'next/link';
export const metadata = { title: 'Política de privacidade' };
export default function Privacy() {
  return <article className="card">
    <h1>Política de privacidade</h1>
    <p>O DigItap, também apresentado como A Praça, está em beta. O responsável operacional provisório é Marcos Antonio Maia Júnior. Para falar sobre seus dados, escreva para <a href="mailto:muralitaperuna@gmail.com">muralitaperuna@gmail.com</a>.</p>
    <h2>Quais dados usamos</h2>
    <p>Usamos e-mail para acesso, confirmação de cadastro e recuperação de senha. O Supabase Auth cuida da senha; ela não é guardada nas tabelas de atividades da aplicação. Também tratamos nome público, vínculo com pessoa física ou organização, apresentação do perfil, atividades, projetos e evidências que você enviar, como relatos, referências e imagens.</p>
    <p>Cookies de sessão mantêm seu acesso. Os serviços de infraestrutura também podem registrar dados técnicos, como endereço IP e registros de erro, para operação e segurança.</p>
    <h2>Para que servem</h2>
    <p>Os dados permitem coordenar atividades comunitárias, revisar publicações, reunir evidências e apresentar um portfólio, inclusive em PDF. Esses registros ajudam a prestar contas sobre o que foi declarado e realizado; ainda não existe um módulo de prestação de contas financeira.</p>
    <h2>Publicação e bases legais</h2>
    <p>A publicação de dados pessoais em nomes, perfis e evidências deve ter o consentimento de quem aparece. Envie somente informações que pode divulgar e não inclua dados sensíveis ou de terceiros sem autorização. A aprovação editorial não comprova a realização de uma atividade.</p>
    <p>O acesso à conta usa os dados necessários para prestar o serviço solicitado. A agregação necessária de registros para entender o uso e melhorar a coordenação tem como base o legítimo interesse, respeitando seus direitos e usando o mínimo de dados. Isso não é autorização geral para expor pessoas. Dados realmente anônimos não devem permitir identificar participantes.</p>
    <p>O e-mail de acesso não integra o perfil público. Nomes públicos e conteúdos publicados podem ser vistos e copiados por visitantes. Um PDF baixado por outra pessoa não é atualizado automaticamente quando a página muda.</p>
    <h2>Fornecedores e transferência internacional</h2>
    <p>Usamos Supabase Cloud para banco, autenticação e arquivos; Vercel para hospedar a aplicação; e Resend para enviar e-mails de acesso. São fornecedores sediados nos Estados Unidos, e há tratamento de dados naquele país. Isso envolve transferência internacional de dados.</p>
    <p>A região efetiva de cada serviço, os prazos de seus registros e os instrumentos aplicáveis à transferência precisam ser documentados pelo responsável antes da ampliação do beta. Esta página não representa certificação de conformidade dos fornecedores.</p>
    <h2>Conservação dos dados</h2>
    <p>Mantemos os dados enquanto necessários à conta, às publicações e ao atendimento de solicitações. Pedidos de exclusão são analisados incluindo obrigações legais e registros mínimos necessários de segurança ou contestação. A tabela detalhada de retenção e os prazos de descarte de backups ainda estão em definição; não prometemos apagamento imediato das cópias de segurança.</p>
    <h2>Seus direitos e contato</h2>
    <p>Você pode pedir confirmação de tratamento, acesso, correção, exclusão, informação sobre compartilhamento ou retirada do consentimento. Também pode questionar o uso dos dados. Envie o pedido para <a href="mailto:muralitaperuna@gmail.com">muralitaperuna@gmail.com</a>; podemos pedir apenas o necessário para confirmar sua identidade. Não envie senha.</p>
    <p>O compromisso operacional é responder em até 30 dias, respeitando prazos legais menores. Se algum dado precisar ser mantido, explicaremos o motivo. Consulte o <Link href="/contestacao">procedimento de contestação</Link> e os <Link href="/termos">termos de uso</Link>.</p>
    <p>Referência: <a href="https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm">Lei Geral de Proteção de Dados</a>.</p>
    <p>Última atualização: <time dateTime="2026-11-11">11/11/2026</time>.</p>
  </article>;
}
