import Link from 'next/link';
import { DigItapWorkspaceIcon, type WorkspaceIconName } from './DigItapWorkspaceIcon';
import styles from './ParticipationTaps.module.css';

type Variant = 'unlinked' | 'person' | 'organization' | 'collective';

const destinations = {
  unlinked: {
    profile: { label: 'Completar meu perfil', href: '/cadastro/pessoa-fisica/completar', detail: 'Apresente quem você é.' },
    activity: '#preparar-atividade',
    organization: { label: 'Cadastrar uma organização', href: '/dashboard/organizacao', detail: 'Inicie o cadastro institucional.' },
  },
  person: {
    profile: { label: 'Revisar meu perfil', href: '#profile-pessoa-fisica', detail: 'Confira sua apresentação.' },
    activity: '/dashboard/pessoa-fisica/nova',
    organization: { label: 'Cadastrar uma organização', href: '/cadastro/organizacao', detail: 'Inicie um cadastro institucional separado.' },
  },
  organization: {
    profile: { label: 'Revisar perfil da organização', href: '#profile-organizacao', detail: 'Confira a apresentação institucional.' },
    activity: '/dashboard/nova-atividade',
    organization: { label: 'Acessar minha organização', href: '/dashboard/organizacao', detail: 'Consulte o cadastro institucional.' },
  },
  collective: {
    profile: { label: 'Revisar perfil do coletivo', href: '#profile-organizacao', detail: 'Confira a apresentação do coletivo.' },
    activity: '/dashboard/nova-atividade',
    organization: { label: 'Consultar meu coletivo', href: '#vinculo-coletivo', detail: 'Confira o tipo de participação do coletivo.' },
  },
} satisfies Record<Variant, { profile: Tap; activity: string; organization: Tap }>;

type Tap = { label: string; href: string; detail: string };
type Tile = Tap & { icon: WorkspaceIconName };

export function ParticipationTaps({ variant, canInterpret = false, hasActivities = false }: {
  variant: Variant;
  canInterpret?: boolean;
  hasActivities?: boolean;
}) {
  const { profile, activity, organization } = destinations[variant];
  const tiles: Tile[] = [
    { ...profile, icon: 'profile' },
    { label: 'Apresentar minhas capacidades', href: '/meu-espaco/capacidades', detail: 'Registre em privado como pode contribuir.', icon: 'capacity' },
    { label: 'Organizar uma ideia', href: '/meu-espaco/ideia', detail: canInterpret ? 'Transforme uma intenção em possibilidades.' : 'Retome suas ideias privadas.', icon: 'idea' },
    { label: 'Preparar uma atividade', href: activity, detail: variant === 'unlinked' ? 'Conclua o cadastro para começar.' : 'Organize o que deseja realizar.', icon: 'calendar' },
    { ...organization, icon: 'organization' },
    { label: 'Explorar a Biblioteca de Ações', href: '/biblioteca-acoes', detail: 'Descubra caminhos para começar.', icon: 'library' },
  ];

  return (
    <section className={styles.screen} aria-labelledby="participation-taps-title">
      <div className={styles.top}>
        <DigItapWorkspaceIcon name="brand" /><strong>DigItap</strong>
        <Link className={styles.profile} href={profile.href} aria-label={`Perfil: ${profile.label.toLowerCase()}`}>
          <DigItapWorkspaceIcon name="profile" />
        </Link>
      </div>
      <p className={styles.eyebrow}>{canInterpret ? 'DigItap IA' : 'Meu espaço'}</p>
      <h1 id="participation-taps-title">Por onde começamos?</h1>
      <p className={styles.description}>O que você gostaria de realizar? {canInterpret ? 'Escolha um caminho ou descreva sua ideia com suas próprias palavras.' : 'Escolha um caminho para começar ou retomar seu trabalho.'}</p>

      <nav className={styles.navigation} aria-label="Taps para participar">
        <ul className={styles.tiles}>
          {tiles.map(({ icon, label, href, detail }) => (
            <li key={icon} data-tone={icon}>
              <Link className={styles.tile} href={href} aria-labelledby={`tap-${icon}-label`} aria-describedby={`tap-${icon}-detail`}>
                <span className={styles.iconbox}><DigItapWorkspaceIcon name={icon} /></span>
                <strong id={`tap-${icon}-label`}>{label}</strong>
                <small id={`tap-${icon}-detail`}>{detail}</small>
                <DigItapWorkspaceIcon className={styles.tileArrow} name="open" />
              </Link>
            </li>
          ))}
        </ul>
        <Link className={styles.wide} href="#descobrir-publicamente" data-tone="discovery" aria-labelledby="tap-discovery-label" aria-describedby="tap-discovery-detail">
          <span className={styles.iconbox}><DigItapWorkspaceIcon name="discovery" /></span>
          <span>
            <strong id="tap-discovery-label">Descobrir atividades e encontros</strong>
            <small id="tap-discovery-detail">Encontre possibilidades ao seu redor.</small>
          </span>
          <DigItapWorkspaceIcon className={styles.chevron} name="next" />
        </Link>
        {variant !== 'unlinked' && hasActivities && (
          <Link className={`${styles.wide} ${styles.resume}`} href="#minhas-atividades" aria-labelledby="tap-tracking-label" aria-describedby="tap-tracking-detail">
            <span className={styles.iconbox}><DigItapWorkspaceIcon name="tracking" /></span>
            <span>
              <strong id="tap-tracking-label">Acompanhar compromissos e evidências</strong>
              <small id="tap-tracking-detail">Continue de onde parou nas suas atividades.</small>
            </span>
            <DigItapWorkspaceIcon className={styles.chevron} name="next" />
          </Link>
        )}
      </nav>

      {canInterpret && (
        <section className={styles.intelligence} aria-labelledby="one-tap-idea-title">
          <h2 id="one-tap-idea-title"><DigItapWorkspaceIcon name="spark" /> Ou conte sua ideia</h2>
          <p className={styles.example}>Exemplo: Quero oferecer aulas de informática no meu bairro, mas preciso de um espaço.</p>
          <Link className={styles.cta} href="/meu-espaco/ideia#editor-ideia">
            Começar <DigItapWorkspaceIcon name="forward" />
          </Link>
        </section>
      )}

      {variant === 'unlinked' && (
        <section className={styles.destination} id="preparar-atividade" aria-labelledby="preparar-atividade-titulo">
          <h2 id="preparar-atividade-titulo">Preparar uma atividade</h2>
          <p>Conclua o cadastro correspondente à sua participação. O cadastro não concede representação, publicação ou autorização institucional.</p>
          <div className={styles.destinationLinks}>
            <Link href="/cadastro/pessoa-fisica/completar">Começar como pessoa física</Link>
            <Link href="/dashboard/organizacao">Começar como organização</Link>
          </div>
          <p>O cadastro autônomo de coletivos ainda não está disponível neste percurso.</p>
        </section>
      )}

      <section className={styles.destination} id="descobrir-publicamente" aria-labelledby="descobrir-publicamente-title">
        <h2 id="descobrir-publicamente-title">Descobrir atividades e encontros</h2>
        <div className={styles.destinationLinks}>
          <Link href="/atividades">Ver atividades publicadas</Link>
          <Link href="/encontros">Explorar encontros e necessidades</Link>
        </div>
      </section>

      {variant !== 'unlinked' && <p className={styles.note}>A navegação não concede escopos, representação ou autorização de publicação.</p>}
    </section>
  );
}
