import 'server-only';
import { withTransaction, type Sql, type Transaction } from '../database.server';
import { decisionState, type Decision, type DecisionHistory, type DecisionRevision } from './decisions';
import { currentDecisions } from './decisions.server';
import type { ProposalInterpretation } from '../proposals/interpret.server';

export class IdeasError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

export type Idea = {
  id: string;
  owner_id: string;
  title: string;
  original_text: string;
  revised_text: string | null;
  original_interpretation: ProposalInterpretation;
  revised_interpretation: ProposalInterpretation | null;
  version: number;
  created_at: string;
  updated_at: string;
  decisions?: DecisionRevision[];
};
export type IdeaView = Omit<Idea, 'owner_id'>;
export function ideaView(idea: Idea): IdeaView {
  const view = { ...idea } as Partial<Idea>;
  delete view.owner_id;
  return view as IdeaView;
}
export type CreateIdea = {
  title: string;
  originalText: string;
  originalInterpretation: ProposalInterpretation;
  revisedInterpretation: ProposalInterpretation;
};
export type UpdateIdea = {
  expectedVersion: number;
  title: string;
  revisedText: string;
  revisedInterpretation: ProposalInterpretation | null;
};

export type ConfirmDecisions = { expectedVersion: unknown; decisions: unknown };

function checkDecisions(input: ConfirmDecisions): Decision[] {
  const invalid = () => new IdeasError(422, 'Confira os estados e as descrições das decisões.');
  if (typeof input.expectedVersion !== 'number' || !Number.isSafeInteger(input.expectedVersion)
      || input.expectedVersion < 1 || input.expectedVersion >= 2147483647
      || !Array.isArray(input.decisions) || input.decisions.length < 1 || input.decisions.length > 20) throw invalid();
  const keys = new Set<string>();
  return input.decisions.map(item => {
    if (!isRecord(item) || !exact(item, ['chave', 'estado', 'descricao'])
      || typeof item.chave !== 'string' || !/^[a-z0-9][a-z0-9-]{0,39}$/.test(item.chave) || keys.has(item.chave)
      || !decisionState(item.estado) || !validText(item.descricao) || item.descricao.trim().length > 500) throw invalid();
    keys.add(item.chave);
    return { chave: item.chave, estado: item.estado, descricao: item.descricao.trim() };
  });
}

const select = 'id,owner_id,title,original_text,revised_text,original_interpretation,revised_interpretation,version,created_at,updated_at';
const categories = ['sujeitos', 'projetos', 'atividades', 'capacidades', 'relacoes', 'fontes', 'informacoes_nao_verificadas'] as const;
const subjectTypes = ['pessoa_fisica', 'coletivo_informal', 'organizacao', 'nao_informado'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function exact(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
}
function validText(value: unknown): value is string {
  return typeof value === 'string' && !!value.trim() && value.length <= 1000 && !/[<>\u0000-\u001f\u007f]/.test(value);
}
function validInterpretation(value: unknown, sourceText: string): value is ProposalInterpretation {
  if (!isRecord(value) || !exact(value, ['estado', 'verificacao', 'dados']) || value.estado !== 'revisao_humana_pendente' || value.verificacao !== 'nao_verificada' || !isRecord(value.dados) || !exact(value.dados, categories)) return false;
  for (const category of categories) {
    const entries = value.dados[category];
    if (!Array.isArray(entries) || entries.length > 20) return false;
    for (const item of entries) {
      if (!isRecord(item)) return false;
      const keys = category === 'relacoes' ? ['origem', 'destino', 'tipo', 'trecho'] : category === 'sujeitos' ? ['descricao', 'trecho', 'tipo'] : ['descricao', 'trecho'];
      if (!exact(item, keys) || !validText(item.trecho) || !sourceText.includes(item.trecho)) return false;
      if (category === 'relacoes') {
        if (!validText(item.origem) || !validText(item.destino) || !validText(item.tipo)) return false;
      } else {
        if (!validText(item.descricao)) return false;
        if (category === 'sujeitos' && (typeof item.tipo !== 'string' || !subjectTypes.includes(item.tipo as typeof subjectTypes[number]))) return false;
      }
    }
  }
  return true;
}
function checkOwner(id: string): void {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) throw new IdeasError(401, 'Sessão necessária.');
}
function checkIdeaId(id: string): void {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) throw new IdeasError(404, 'Rascunho não encontrado.');
}
function checkContent(title: string, originalText: string): void {
  if (typeof title !== 'string' || !title.trim() || title.length > 160 || typeof originalText !== 'string' || !originalText.trim() || originalText.length > 20000) throw new IdeasError(422, 'Dados da ideia inválidos.');
}
function checkCreate(input: CreateIdea): void {
  if (!input || typeof input !== 'object') throw new IdeasError(422, 'Dados da ideia inválidos.');
  checkContent(input.title, input.originalText);
  if (!validInterpretation(input.originalInterpretation, input.originalText) || !validInterpretation(input.revisedInterpretation, input.originalText)) throw new IdeasError(422, 'Dados da ideia inválidos.');
}
function checkUpdate(input: UpdateIdea): void {
  if (!input || typeof input !== 'object' || !Number.isSafeInteger(input.expectedVersion) || input.expectedVersion < 1) throw new IdeasError(422, 'Dados da ideia inválidos.');
  checkContent(input.title, input.revisedText);
  if (input.revisedInterpretation !== null && !validInterpretation(input.revisedInterpretation, input.revisedText)) throw new IdeasError(422, 'Dados da ideia inválidos.');
}
async function owned(db: Sql, owner: string, id: string): Promise<Idea> {
  const result = await db.query(`select ${select} from public.ideias_privadas where owner_id=$1 and id=$2`, [owner, id]);
  if (!result.rows[0]) throw new IdeasError(404, 'Rascunho não encontrado.');
  return result.rows[0] as Idea;
}

export function createIdeasService(transaction: Transaction = withTransaction) {
  return {
    async create(owner: string, input: CreateIdea): Promise<Idea> {
      checkOwner(owner); checkCreate(input);
      return transaction(async db => {
        const result = await db.query(`insert into public.ideias_privadas(owner_id,title,original_text,original_interpretation,revised_interpretation) values($1,$2,$3,$4::jsonb,$5::jsonb) returning ${select}`,
          [owner, input.title.trim(), input.originalText, JSON.stringify(input.originalInterpretation), JSON.stringify(input.revisedInterpretation)]);
        return result.rows[0] as Idea;
      });
    },
    async list(owner: string): Promise<Idea[]> {
      checkOwner(owner);
      return transaction(async db => (await db.query(`select ${select} from public.ideias_privadas where owner_id=$1 order by updated_at desc,id`, [owner])).rows as Idea[]);
    },
    async get(owner: string, id: string): Promise<Idea> {
      checkOwner(owner); checkIdeaId(id);
      return transaction(db => owned(db, owner, id));
    },
    async update(owner: string, id: string, input: UpdateIdea): Promise<Idea> {
      checkOwner(owner); checkIdeaId(id); checkUpdate(input);
      return transaction(async db => {
        await owned(db, owner, id);
        const result = await db.query(`update public.ideias_privadas set title=$3,revised_text=$4,revised_interpretation=$5::jsonb,version=version+1,updated_at=now() where owner_id=$1 and id=$2 and version=$6 returning ${select}`,
          [owner, id, input.title.trim(), input.revisedText, input.revisedInterpretation === null ? null : JSON.stringify(input.revisedInterpretation), input.expectedVersion]);
        if (result.rows[0]) return result.rows[0] as Idea;
        // A stale version is 409 only while the record still belongs to this owner.
        await owned(db, owner, id);
        throw new IdeasError(409, 'Este rascunho mudou em outra sessão. Recarregue antes de salvar.');
      });
    },
    async confirmDecisions(owner: string, id: string, input: ConfirmDecisions): Promise<Idea> {
      checkOwner(owner); checkIdeaId(id);
      const decisions = checkDecisions(input);
      return transaction(async db => {
        const account = (await db.query<{ situacao: string }>(
          'select situacao from public.contas_acesso where auth_user_id=$1 for share', [owner])).rows[0];
        if (account && account.situacao !== 'ativa') throw new IdeasError(403, 'Acesso indisponível para esta conta.');
        await owned(db, owner, id);
        const updated = (await db.query<Idea>(`update public.ideias_privadas set version=version+1,updated_at=now()
          where owner_id=$1 and id=$2 and version=$3 returning ${select}`, [owner, id, input.expectedVersion])).rows[0];
        if (!updated) {
          await owned(db, owner, id);
          throw new IdeasError(409, 'Este rascunho mudou em outra sessão. Recarregue antes de confirmar.');
        }
        await db.query(`insert into public.ideia_decisoes_revisoes(ideia_id,versao_ideia,chave,estado,descricao,autor_id)
          select $1,$2,item.chave,item.estado,item.descricao,$3
          from jsonb_to_recordset($4::jsonb) as item(chave text,estado text,descricao text)`,
        [id, updated.version, owner, JSON.stringify(decisions)]);
        return { ...updated, decisions: await currentDecisions(db, id, updated.version) };
      });
    },
    async decisionHistory(owner: string, id: string): Promise<DecisionHistory> {
      checkOwner(owner); checkIdeaId(id);
      return transaction(async db => {
        const { version } = await owned(db, owner, id);
        const decisions = await currentDecisions(db, id, version);
        const { rows } = await db.query<DecisionRevision>(`select chave,estado,descricao,versao_ideia,confirmada_em
          from public.ideia_decisoes_revisoes where ideia_id=$1 and versao_ideia<=$2
          order by versao_ideia desc,chave limit 51`, [id, version]);
        return { decisions, history: rows.slice(0, 50), hasMore: rows.length > 50 };
      });
    },
    async delete(owner: string, id: string): Promise<true> {
      checkOwner(owner); checkIdeaId(id);
      return transaction(async db => {
        const result = await db.query('delete from public.ideias_privadas where owner_id=$1 and id=$2 returning id', [owner, id]);
        if (!result.rows[0]) throw new IdeasError(404, 'Rascunho não encontrado.');
        return true as const;
      });
    },
  };
}
