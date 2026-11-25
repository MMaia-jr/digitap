import type { DecisionSnapshot, DecisionState } from '../lib/ideas/decisions';
import { DigItapWorkspaceIcon, type WorkspaceIconName } from './DigItapWorkspaceIcon';
import styles from './ActivityContinuity.module.css';

const status = {
  DEFINIDO: { label: 'Definido', icon: 'defined' },
  PROVISÓRIO: { label: 'Provisório', icon: 'tentative' },
  PENDENTE: { label: 'Pendente', icon: 'pending' },
  EXCLUÍDO: { label: 'Excluído', icon: 'excluded' },
} satisfies Record<DecisionState, { label: string; icon: WorkspaceIconName }>;

function DecisionList({ decisions, label }: { decisions: DecisionSnapshot['decisoes']; label: string }) {
  return <ul className={styles.decisions} aria-label={label}>{decisions.map(decision => {
    const { label, icon } = status[decision.estado];
    return <li className={styles.decision} key={decision.chave} data-status={icon}>
      <div className={styles.decisionTitle}><DigItapWorkspaceIcon name={icon} /><strong>{decision.descricao}</strong></div>
      <span className={styles.status}>{label}</span>
    </li>;
  })}</ul>;
}

export function ActivityDecisions({ snapshot, canPlan }: { snapshot: DecisionSnapshot; canPlan: boolean }) {
  const current = snapshot.decisoes.filter(decision => decision.estado !== 'EXCLUÍDO');
  const excluded = snapshot.decisoes.filter(decision => decision.estado === 'EXCLUÍDO');

  return <section className={styles.decisionPanel} id="decisoes-atividade" aria-labelledby="decisoes-atividade-titulo">
    <div className={styles.panelHeading}>
      <h3 id="decisoes-atividade-titulo">Decisões na origem da atividade</h3>
      <p>Registro privado da versão {snapshot.versao_ideia} da ideia.</p>
    </div>
    {current.length > 0 ? <DecisionList decisions={current} label="Decisões e pendências de origem" /> : <p>Nenhuma decisão vigente na versão de origem.</p>}
    {excluded.length > 0 && <details className={styles.exclusions}>
      <summary>Alternativas excluídas</summary>
      <DecisionList decisions={excluded} label="Registros excluídos da versão de origem" />
    </details>}
    {canPlan && <div className={styles.resume}>
      <strong><DigItapWorkspaceIcon name="spark" /> Continue de onde parou</strong>
      <a href="#planejamento-atividade">Abrir o planejamento</a>
    </div>}
  </section>;
}

export function ActivityTrackingHeading({ canPlan, hasDecisions, canRecord, hasEvidence }: {
  canPlan: boolean;
  hasDecisions: boolean;
  canRecord: boolean;
  hasEvidence: boolean;
}) {
  const sections: { label: string; id: string; icon: WorkspaceIconName; available: boolean }[] = [
    { label: 'Decisões da atividade', id: 'decisoes-atividade', icon: 'defined', available: hasDecisions },
    { label: 'Planejamento e recursos', id: 'planejamento-atividade', icon: 'resources', available: canPlan },
    { label: 'Realização', id: 'realizacao-atividade', icon: 'calendar', available: canRecord },
    { label: 'Evidências privadas', id: 'evidencias-atividade', icon: 'evidence', available: hasEvidence },
  ];
  const available = sections.filter(section => section.available);

  return <>
    <div className={styles.hero}>
      <DigItapWorkspaceIcon name="tracking" />
      <h2 id="titulo-acompanhamento">Acompanhamento da atividade</h2>
      <p>Reúna planejamento, realização declarada e evidências. Use esses registros para preparar uma prestação de contas, inclusive em projetos da Política Nacional Aldir Blanc.</p>
    </div>
    {available.length > 0 && <nav className={styles.sections} aria-label="Seções do acompanhamento">
      <ul>{available.map(section => <li key={section.id}>
        <a href={`#${section.id}`}>
          <DigItapWorkspaceIcon name={section.icon} />
          <strong>{section.label}</strong>
          <DigItapWorkspaceIcon className={styles.next} name="next" />
        </a>
      </li>)}</ul>
    </nav>}
  </>;
}
