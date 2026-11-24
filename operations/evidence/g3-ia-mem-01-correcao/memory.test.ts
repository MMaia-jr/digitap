import { describe, expect, it } from 'vitest';
import { validateMemory } from './memory';

const evidence = ['O registro foi publicado e está contestado, sem verificação.'];

describe('contrato experimental de recuperação', () => {
  it('aceita abstenção explícita sem evidência', () => {
    expect(validateMemory({ status: 'insufficient', evidence: [] }, [])).toEqual({ status: 'insufficient', evidence: [] });
  });
  it('aceita literalmente a evidência autorizada', () => {
    expect(validateMemory({ status: 'supported', evidence }, evidence)).toEqual({ status: 'supported', evidence });
  });
  it.each([
    { status: 'supported', evidence: [] },
    { status: 'supported', evidence: ['Realização verificada'] },
    { status: 'insufficient', evidence },
    { status: 'supported', evidence, publish: true },
  ])('rejeita resultado incoerente ou não autorizado', value => {
    expect(() => validateMemory(value, evidence)).toThrow();
  });
});
