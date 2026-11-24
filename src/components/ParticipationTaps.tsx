import Link from 'next/link';

type Variant = 'unlinked' | 'person' | 'organization';

const tapLabels = {
  unlinked: { profile: 'Completar meu perfil', organization: 'Cadastrar uma organização' },
  person: { profile: 'Completar meu perfil', organization: 'Cadastrar uma organização' },
  organization: { profile: 'Completar meu perfil', organization: 'Acessar minha organização' },
} satisfies Record<Variant, { profile: string; organization: string }>;

const activityHref: Record<Variant, string> = {
  unlinked: '#preparar-atividade',
  person: '/dashboard/pessoa-fisica/nova',
  organization: '/dashboard/nova-atividade',
};

const organizationHref: Record<Variant, string> = {
  unlinked: '/dashboard/organizacao',
  person: '/cadastro/organizacao',
  organization: '/dashboard/organizacao',
};

export function ParticipationTaps({ variant }: { variant: Variant }) {
  const profileHref = variant === 'person' ? '#profile-pessoa-fisica' : variant === 'organization' ? '#profile-organizacao' : '/cadastro/pessoa-fisica/completar';
  const discoveryHref = '#descobrir-publicamente';

  return (
    <section className={variant === 'unlinked' ? 'card' : 'workspace-panel'} aria-labelledby="participation-taps-title">
      {variant === 'unlinked' ? <p className="eyebrow">Meu espaço</p> : <p className="eyebrow">Próximos passos</p>}
      {variant === 'unlinked' ? <h1 id="participation-taps-title">Qual é seu próximo passo?</h1> : <h2 id="participation-taps-title">Taps para continuar</h2>}
      <p>
        Você pode participar como pessoa física ou por uma organização. Estudantes, profissionais,
        autônomos, ONGs, associações e movimentos encontram os mesmos percursos; a autorização
        depende dos vínculos e das permissões verificados pelo sistema.
      </p>
      <nav className="actions" aria-label="Taps para participar">
        <Link className="button" href={profileHref}>{tapLabels[variant].profile}</Link>
        <Link className="button-outline" href="/meu-espaco/capacidades">Apresentar minhas capacidades</Link>
        <Link className="button-outline" href="/meu-espaco/ideia">Organizar uma ideia</Link>
        <Link className="button-outline" href={activityHref[variant]}>Preparar uma atividade</Link>
        <Link className="button-outline" href={organizationHref[variant]}>{tapLabels[variant].organization}</Link>
        <Link className="button-outline" href="/biblioteca-acoes">Explorar a Biblioteca de Ações</Link>
        <Link className="button-outline" href={discoveryHref}>Descobrir atividades e encontros</Link>
      </nav>

      {variant === 'unlinked' && (
        <section className="workspace-panel" aria-labelledby="preparar-atividade">
          <h3 id="preparar-atividade">Preparar uma atividade</h3>
          <p>Conclua o cadastro correspondente à sua participação. O cadastro não concede representação, publicação ou autorização institucional.</p>
          <div className="actions">
            <Link className="button-outline" href="/cadastro/pessoa-fisica/completar">Começar como pessoa física</Link>
            <Link className="button-outline" href="/dashboard/organizacao">Começar como organização</Link>
          </div>
        </section>
      )}

      {variant !== 'unlinked' && (
        <p>
          Estes atalhos apenas abrem percursos existentes. A navegação não concede escopos,
          representação ou autorização de publicação.
          {variant === 'person' && ' O cadastro organizacional tem fluxo próprio e não transfere seu perfil ou permissões.'}
        </p>
      )}

      <section className="workspace-panel" id="descobrir-publicamente" aria-labelledby="descobrir-publicamente-title">
        <h3 id="descobrir-publicamente-title">Descobrir atividades e encontros</h3>
        <div className="actions">
          <Link className="button-outline" href="/atividades">Ver atividades publicadas</Link>
          <Link className="button-outline" href="/encontros">Explorar encontros e necessidades</Link>
        </div>
      </section>

      <p>
        Coletivos informais podem participar quando houver vínculo e representação verificados.
        O cadastro autônomo de coletivos ainda não está disponível neste percurso.
      </p>
    </section>
  );
}
