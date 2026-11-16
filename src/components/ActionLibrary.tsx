'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { ActionCategory, ActionTemplate } from '../lib/actions/catalog';

const categories: Array<[ActionCategory, string]> = [
  ['comunidade', 'Comunidade'], ['cultura', 'Cultura'], ['educacao', 'Educação'],
  ['tecnologia', 'Tecnologia'], ['comunicacao', 'Comunicação'], ['sustentabilidade', 'Sustentabilidade'],
];
const modalityLabels = { presencial: 'Presencial', remota: 'Remota', hibrida: 'Híbrida', a_definir: 'A definir' };
const effortLabels = { leve: 'Leve', moderado: 'Moderado', amplo: 'Amplo' };

export function ActionLibrary({ templates }: { templates: ActionTemplate[] }) {
  const [category, setCategory] = useState('todas');
  const [modality, setModality] = useState('todas');
  const [effort, setEffort] = useState('todos');
  const visible = useMemo(() => templates.filter(template =>
    (category === 'todas' || template.category === category)
    && (modality === 'todas' || template.modality === modality)
    && (effort === 'todos' || template.effortBand === effort),
  ), [templates, category, modality, effort]);

  return (
    <section className="workspace-page" aria-labelledby="action-library-title">
      <p className="eyebrow">Modelos para adaptar</p>
      <h1 id="action-library-title">Biblioteca de Ações</h1>
      <p>Estes são modelos sugeridos; não são atividades reais, eventos anunciados nem resultados realizados. Consulte sem entrar; para criar uma atividade, entre e adapte o modelo.</p>
      <div className="workspace-panel" aria-label="Filtros da Biblioteca de Ações">
        <div className="field">
          <label htmlFor="action-category">Interesse</label>
          <select id="action-category" value={category} onChange={event => setCategory(event.target.value)}>
            <option value="todas">Todos os temas</option>
            {categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="action-modality">Modalidade</label>
          <select id="action-modality" value={modality} onChange={event => setModality(event.target.value)}>
            <option value="todas">Todas</option>
            {Object.entries(modalityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="action-effort">Esforço indicativo</label>
          <select id="action-effort" value={effort} onChange={event => setEffort(event.target.value)}>
            <option value="todos">Qualquer esforço</option>
            {Object.entries(effortLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
      </div>
      {visible.length === 0 ? <p role="status">Nenhum modelo corresponde aos filtros.</p> : (
        <ul className="activity-list">
          {visible.map(template => (
            <li key={template.id}>
              <article aria-label={template.title}>
                <p className="eyebrow">{categories.find(([value]) => value === template.category)?.[1]} · modelo v1</p>
                <h2>{template.title}</h2>
                <p><strong>Objetivo sugerido:</strong> {template.objective}</p>
                <p><strong>Experiência:</strong> {template.experience}</p>
                <p><strong>Esforço indicativo:</strong> {template.effort} · <strong>Modalidade sugerida:</strong> {modalityLabels[template.modality]}</p>
                <h3>Etapas sugeridas</h3>
                <ol>{template.stages.map((step, index) => <li key={index}>{step}</li>)}</ol>
                <p><strong>Resultado esperado, ainda não realizado:</strong> {template.expectedOutcome}</p>
                <h3>Cuidados</h3>
                <ul>{template.care.map((care, index) => <li key={index}>{care}</li>)}</ul>
                <Link className="button" href={`/dashboard/pessoa-fisica/nova?modelo=${encodeURIComponent(template.id)}`}>Adaptar {template.title}</Link>
              </article>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
