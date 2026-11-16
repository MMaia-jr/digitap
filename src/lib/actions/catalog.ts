export type ActionCategory = 'comunidade' | 'cultura' | 'educacao' | 'tecnologia' | 'comunicacao' | 'sustentabilidade';
export interface ActionTemplate {
  id: string;
  title: string;
  objective: string;
  category: ActionCategory;
  experience: string;
  effort: string;
  effortBand: 'leve' | 'moderado' | 'amplo';
  modality: 'presencial' | 'remota' | 'hibrida' | 'a_definir';
  stages: string[];
  expectedOutcome: string;
  care: string[];
}
export const actionTemplateCatalogVersion = 1;
export const actionTemplates: ActionTemplate[] = [
  {
    id: 'acao-v1-mapa-recursos-comunitarios', title: 'Mapear recursos comunitários disponíveis',
    objective: 'Reunir referências públicas de serviços e recursos escolhidos pelas pessoas participantes.',
    category: 'comunidade', experience: 'Iniciante, com divisão simples de tarefas.', effort: '2 a 4 horas, estimativa indicativa', effortBand: 'leve', modality: 'hibrida',
    stages: ['Definir em conjunto o recorte e as fontes públicas.', 'Conferir cada referência com sua fonte.', 'Organizar uma lista acessível e revisar com participantes.'],
    expectedOutcome: 'Uma lista de referências para revisão e atualização posterior.', care: ['Não registrar contatos pessoais sem necessidade e autorização.', 'Não apresentar a lista como endosso ou parceria institucional.'],
  },
  {
    id: 'acao-v1-roda-escuta', title: 'Organizar uma roda de escuta sobre tema local',
    objective: 'Criar um espaço voluntário para ouvir diferentes perspectivas sobre um tema escolhido.',
    category: 'comunidade', experience: 'Iniciante, com facilitação compartilhada.', effort: '3 a 5 horas, estimativa indicativa', effortBand: 'moderado', modality: 'presencial',
    stages: ['Combinar objetivo e regras de participação.', 'Preparar perguntas abertas e acessibilidade.', 'Realizar a conversa e validar qualquer síntese com participantes.'],
    expectedOutcome: 'Uma síntese consentida e revisável, sem atribuir falas sem permissão.', care: ['Participação voluntária; não gravar por padrão.', 'Evitar coletar dados pessoais ou sensíveis.'],
  },
  {
    id: 'acao-v1-inventario-acervo-cultural', title: 'Fazer inventário colaborativo de acervo cultural',
    objective: 'Descrever materiais e referências culturais cuja inclusão tenha sido autorizada.',
    category: 'cultura', experience: 'Com orientação de quem conhece o acervo.', effort: '4 a 8 horas, estimativa indicativa', effortBand: 'amplo', modality: 'hibrida',
    stages: ['Definir o que pode ser descrito e por quem.', 'Registrar metadados mínimos e proveniência.', 'Revisar descrições e permissões antes de compartilhar.'],
    expectedOutcome: 'Um inventário descritivo, com lacunas e permissões identificadas.', care: ['Respeitar direitos autorais, conhecimentos restritos e contextos comunitários.', 'Inventário não transfere titularidade.'],
  },
  {
    id: 'acao-v1-oficina-memoria-oral', title: 'Planejar oficina de memória oral',
    objective: 'Preparar uma atividade de aprendizagem sobre métodos de relato e preservação de memória.',
    category: 'cultura', experience: 'Iniciante, com apoio de facilitação experiente.', effort: '3 a 6 horas, estimativa indicativa', effortBand: 'moderado', modality: 'presencial',
    stages: ['Definir tema e público com participantes.', 'Preparar roteiro opcional e materiais.', 'Combinar como relatos poderão ser usados e revisados.'],
    expectedOutcome: 'Um plano adaptável de oficina, sem pressupor relatos ou resultados.', care: ['Não gravar ou publicar relatos sem autorização específica.', 'Permitir participação sem exposição pessoal.'],
  },
  {
    id: 'acao-v1-ciclo-estudo-aberto', title: 'Preparar um ciclo de estudo aberto',
    objective: 'Organizar encontros de estudo em torno de materiais acessíveis e escolhidos pelo grupo.',
    category: 'educacao', experience: 'Iniciante, com preparação compartilhada.', effort: '2 a 4 horas por encontro, estimativa indicativa', effortBand: 'moderado', modality: 'hibrida',
    stages: ['Escolher tema e materiais com o grupo.', 'Preparar perguntas e formatos acessíveis.', 'Recolher avaliação voluntária e ajustar o próximo encontro.'],
    expectedOutcome: 'Um roteiro revisável de estudo, não uma certificação de aprendizagem.', care: ['Verificar licenças dos materiais.', 'Não coletar avaliações nominais sem necessidade.'],
  },
  {
    id: 'acao-v1-material-aprendizagem', title: 'Criar material de aprendizagem reutilizável',
    objective: 'Transformar um conhecimento compartilhado em material curto que possa ser revisado por outras pessoas.',
    category: 'educacao', experience: 'Com revisão de alguém familiarizado com o assunto.', effort: '4 a 8 horas, estimativa indicativa', effortBand: 'amplo', modality: 'remota',
    stages: ['Definir público e objetivo de aprendizagem.', 'Escrever uma primeira versão com fontes.', 'Revisar clareza, acessibilidade e licença de uso.'],
    expectedOutcome: 'Um material em versão de revisão, sujeito a atualização.', care: ['Identificar incertezas e fontes.', 'Não apresentar orientação especializada sem revisão competente.'],
  },
  {
    id: 'acao-v1-seguranca-digital', title: 'Realizar oficina de segurança digital cotidiana',
    objective: 'Compartilhar práticas básicas de proteção de contas e dados em atividades cotidianas.',
    category: 'tecnologia', experience: 'Facilitação com conhecimento básico de segurança.', effort: '2 a 4 horas, estimativa indicativa', effortBand: 'leve', modality: 'remota',
    stages: ['Definir tópicos e limites da oficina.', 'Preparar demonstrações com contas e dados fictícios.', 'Compartilhar materiais oficiais e recolher dúvidas sem dados privados.'],
    expectedOutcome: 'Participantes recebem referências e passos para avaliar por conta própria.', care: ['Nunca solicitar senhas, códigos de autenticação ou acesso a dispositivos.', 'Não fazer varredura ou teste em sistemas de terceiros.'],
  },
  {
    id: 'acao-v1-prototipo-baixo-risco', title: 'Prototipar uma solução digital de baixo risco',
    objective: 'Explorar um fluxo ou interface com dados sintéticos antes de considerar qualquer implantação.',
    category: 'tecnologia', experience: 'Com alguém que possa revisar riscos técnicos.', effort: '4 a 10 horas, estimativa indicativa', effortBand: 'amplo', modality: 'remota',
    stages: ['Delimitar a necessidade e o que fica fora do protótipo.', 'Construir uma simulação com dados fictícios.', 'Testar acessibilidade, segurança e entendimento com participantes voluntários.'],
    expectedOutcome: 'Um protótipo descartável e uma lista de perguntas, sem serviço em produção.', care: ['Não inserir dados reais ou credenciais.', 'Protótipo não significa validação, integração ou autorização de lançamento.'],
  },
  {
    id: 'acao-v1-boletim-comunitario', title: 'Produzir boletim de informação comunitária',
    objective: 'Reunir informações úteis escolhidas pela comunidade com fontes e contexto claros.',
    category: 'comunicacao', experience: 'Iniciante, com revisão editorial.', effort: '2 a 4 horas, estimativa indicativa', effortBand: 'leve', modality: 'remota',
    stages: ['Definir tema, público e periodicidade apenas se decididos pelo grupo.', 'Checar fontes e preparar uma versão curta.', 'Revisar linguagem, acessibilidade e permissões antes de compartilhar.'],
    expectedOutcome: 'Uma versão de boletim para revisão, sem distribuição automática.', care: ['Distinguir informação confirmada de hipótese.', 'Obter autorização para imagens e falas identificáveis.'],
  },
  {
    id: 'acao-v1-guia-comunicacao-acessivel', title: 'Criar um guia de comunicação acessível',
    objective: 'Reunir recomendações práticas para tornar materiais mais claros e acessíveis.',
    category: 'comunicacao', experience: 'Com revisão de pessoas com diferentes necessidades de acesso.', effort: '3 a 6 horas, estimativa indicativa', effortBand: 'moderado', modality: 'remota',
    stages: ['Escolher um tipo de material e contexto.', 'Redigir recomendações simples.', 'Revisar com participantes e registrar limites do guia.'],
    expectedOutcome: 'Um guia em versão de revisão, não uma certificação de acessibilidade.', care: ['Não falar em nome de grupos sem participação autorizada.', 'Oferecer formatos alternativos.'],
  },
  {
    id: 'acao-v1-diagnostico-residuos', title: 'Fazer diagnóstico participativo de resíduos',
    objective: 'Observar processos de descarte em um contexto escolhido sem identificar pessoas.',
    category: 'sustentabilidade', experience: 'Iniciante, com orientação de segurança adequada.', effort: '3 a 6 horas, estimativa indicativa', effortBand: 'moderado', modality: 'presencial',
    stages: ['Definir escopo e cuidados com o local.', 'Registrar observações agregadas, sem nomes ou imagens identificáveis.', 'Revisar achados e opções com participantes.'],
    expectedOutcome: 'Um conjunto de observações para discussão, sem alegar auditoria formal.', care: ['Não manusear materiais perigosos.', 'Não divulgar localização precisa que exponha pessoas.'],
  },
  {
    id: 'acao-v1-mutirao-area-comum', title: 'Planejar mutirão de cuidado de área comum',
    objective: 'Preparar uma atividade voluntária de cuidado, respeitando regras e autorizações aplicáveis.',
    category: 'sustentabilidade', experience: 'Com coordenação e orientação de segurança adequadas.', effort: '3 a 6 horas, estimativa indicativa', effortBand: 'moderado', modality: 'presencial',
    stages: ['Definir escopo com pessoas responsáveis pelo espaço.', 'Verificar permissões, riscos e materiais antes de confirmar a atividade.', 'Planejar participação voluntária e descarte adequado.'],
    expectedOutcome: 'Um plano sujeito às confirmações necessárias; não relata ação realizada.', care: ['Não presumir autorização de uso do espaço.', 'Não prometer resultados nem registrar participantes sem necessidade.'],
  },
];
