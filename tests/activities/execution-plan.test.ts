import { expect, it } from 'vitest';
import * as activityDomain from '../../src/lib/activities/domain';

type Resource = {
  categoria?: string;
  descricao?: string;
  quantidade?: number;
  unidade?: string;
  valor_previsto_centavos?: number | null;
};

type PlanInput = { versao_esperada: number; recursos: Resource[] };
type ValidatedPlan = PlanInput & { total_previsto_centavos: number };
type PlanValidator = (input: unknown) => ValidatedPlan;
type VersionGuard = (expectedVersion: number, currentVersion: number) => void;

// Reflect keeps RED behavioral: the existing module loads successfully, then
// the expectation reports the missing domain behavior instead of an import error.
const validatePlan = Reflect.get(activityDomain, 'validateExecutionPlan') as PlanValidator | undefined;
const assertPlanVersion = Reflect.get(activityDomain, 'assertExecutionPlanVersion') as VersionGuard | undefined;
const resource = (overrides: Partial<Resource> = {}): Resource => ({
  categoria: 'material',
  descricao: 'Papel para oficina sintética',
  ...overrides,
});
const plan = (recursos: Resource[], versao_esperada = 1): PlanInput => ({ versao_esperada, recursos });

function requireValidator(): PlanValidator {
  expect(validatePlan, 'o domínio ainda não valida um plano de execução').toBeTypeOf('function');
  return validatePlan as PlanValidator;
}

it('aceita recurso com descrição e categoria, sem quantidade, unidade ou valor monetário', () => {
  const result = requireValidator()(plan([resource()]));
  expect(result.recursos[0]).toMatchObject({ categoria: 'material', descricao: 'Papel para oficina sintética' });
  expect(result.total_previsto_centavos).toBe(0);
});

it('rejeita um item inteiramente vazio mesmo com os demais campos opcionais', () => {
  const validate = requireValidator();
  expect(() => validate(plan([{}]))).toThrow();
});

it('aceita doação ou empréstimo sem converter recurso em dinheiro', () => {
  const result = requireValidator()(plan([resource({ categoria: 'emprestimo', descricao: 'Caixa de som cedida' })]));
  expect(result.recursos[0].valor_previsto_centavos ?? null).toBeNull();
  expect(result.total_previsto_centavos).toBe(0);
});

it('rejeita recurso sem descrição cuja única entrada é valor monetário nulo', () => {
  const validate = requireValidator();
  expect(() => validate(plan([{ valor_previsto_centavos: null }]))).toThrow();
});

it('soma somente valores previstos em centavos inteiros, sem ponto flutuante', () => {
  const result = requireValidator()(plan([
    resource({ valor_previsto_centavos: 1250 }),
    resource({ categoria: 'transporte', descricao: 'Transporte sintético', valor_previsto_centavos: 375 }),
  ]));
  expect(result.total_previsto_centavos).toBe(1625);
  expect(Number.isSafeInteger(result.total_previsto_centavos)).toBe(true);
});

it('rejeita total previsto que excede o inteiro seguro', () => {
  const validate = requireValidator();
  expect(() => validate(plan([
    resource({ valor_previsto_centavos: Number.MAX_SAFE_INTEGER }),
    resource({ valor_previsto_centavos: 1 }),
  ]))).toThrow();
});

it.each([-1, 1.5, Number.MAX_SAFE_INTEGER + 1, Number.NaN, '1250']) (
  'rejeita valor monetário previsto inválido: %s', value => {
    const validate = requireValidator();
    expect(() => validate(plan([resource({ valor_previsto_centavos: value as number })]))).toThrow();
  },
);

it('não aceita despesas ou pagamentos como se fossem custo previsto', () => {
  const validate = requireValidator();
  expect(() => validate(plan([resource({ despesa_centavos: 500 } as Partial<Resource>)]))).toThrow();
  expect(() => validate(plan([resource({ pagamento_centavos: 500 } as Partial<Resource>)]))).toThrow();
});

it('exige uma versão inteira positiva para a edição do plano', () => {
  const validate = requireValidator();
  for (const version of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    expect(() => validate(plan([resource()], version))).toThrow();
  }
});

it('rejeita uma alteração baseada em versão obsoleta', () => {
  expect(assertPlanVersion, 'o domínio ainda não protege a versão concorrente do plano').toBeTypeOf('function');
  expect(() => (assertPlanVersion as VersionGuard)(1, 2)).toThrow();
});
