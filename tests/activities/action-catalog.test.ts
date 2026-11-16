import { describe, expect, it } from 'vitest';
import { actionTemplates, actionTemplateCatalogVersion } from '../../src/lib/actions/catalog';

describe('Biblioteca de Ações', () => {
  it('oferece ao menos doze modelos versionados com os campos necessários', () => {
    expect(actionTemplateCatalogVersion).toBeGreaterThan(0);
    expect(actionTemplates.length).toBeGreaterThanOrEqual(12);
    for (const template of actionTemplates) {
      expect(template).toEqual(expect.objectContaining({
        id: expect.any(String), title: expect.any(String), objective: expect.any(String),
        category: expect.any(String), experience: expect.any(String), effort: expect.any(String),
        modality: expect.any(String), stages: expect.arrayContaining([expect.any(String)]),
        expectedOutcome: expect.any(String), care: expect.arrayContaining([expect.any(String)]),
      }));
      expect(template.stages.length).toBeGreaterThanOrEqual(2);
      expect(template.care.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('cobre os seis campos de interesse sem apresentar modelos como atividades realizadas', () => {
    expect(new Set(actionTemplates.map(item => item.category))).toEqual(new Set([
      'comunidade', 'cultura', 'educacao', 'tecnologia', 'comunicacao', 'sustentabilidade',
    ]));
    for (const template of actionTemplates) {
      expect(template.id).toMatch(/^acao-v1-/);
      expect(template).not.toHaveProperty('inicio_previsto');
      expect(template).not.toHaveProperty('responsavel');
      expect(template).not.toHaveProperty('local');
      expect(template).not.toHaveProperty('resultado_realizado');
    }
  });
});
