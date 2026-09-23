import { Board, Team } from '../models/index.js';
import { exampleTeamNames } from './boardTeams.js';

const stepColors = ['#64748b', '#2563eb', '#7c3aed', '#d97706', '#0891b2', '#16a34a', '#dc2626'];
const field = (name, type = 'text', options = [], required = false) => ({ name, type, options, required });
const steps = (...items) => items.map(([name, fields = []], order) => ({ name, order, color: stepColors[order % stepColors.length], customFields: fields }));

const examples = [
  {
    exampleKey: 'recruitment', name: 'Recrutamento e Seleção', color: '#7c3aed',
    description: 'Exemplo para acompanhar candidatos desde a inscrição até a contratação.',
    steps: steps(
      ['Novos candidatos', [field('Nome do candidato'), field('E-mail'), field('Vaga'), field('Currículo')]],
      ['Triagem', [field('Aderência ao perfil', 'select', ['Baixa', 'Média', 'Alta']), field('Pretensão salarial', 'number')]],
      ['Entrevista com RH', [field('Data da entrevista', 'date'), field('Parecer do RH')]],
      ['Entrevista com gestor', [field('Parecer do gestor'), field('Aprovado', 'checkbox')]],
      ['Proposta', [field('Salário proposto', 'number'), field('Data prevista de início', 'date')]],
      ['Contratado'], ['Reprovado']
    )
  },
  {
    exampleKey: 'employee-onboarding', name: 'Onboarding de Colaboradores', color: '#0f766e',
    description: 'Exemplo para padronizar documentos, acessos, equipamentos e integração de novos colaboradores.',
    steps: steps(
      ['Aguardando documentos', [field('Nome do colaborador'), field('Cargo'), field('Data de admissão', 'date'), field('Documentos completos', 'checkbox')]],
      ['Validação do RH', [field('Cadastro validado', 'checkbox'), field('Pendências')]],
      ['Preparação para admissão', [field('Equipamento necessário'), field('Acessos solicitados', 'checkbox')]],
      ['Primeiro dia', [field('Integração realizada', 'checkbox'), field('Responsável pela recepção')]],
      ['Treinamento', [field('Trilha de treinamento'), field('Conclusão prevista', 'date')]],
      ['Onboarding concluído', [field('Data de conclusão', 'date'), field('Feedback')]]
    )
  },
  {
    exampleKey: 'purchase-process', name: 'Processo de Compras', color: '#2563eb',
    description: 'Exemplo para centralizar solicitações, cotações, aprovações e pedidos de compra.',
    steps: steps(
      ['Novas solicitações', [field('Item ou serviço'), field('Justificativa'), field('Valor estimado', 'number'), field('Centro de custo')]],
      ['Triagem de compras', [field('Categoria'), field('Urgência', 'select', ['Baixa', 'Média', 'Alta'])]],
      ['Cotação', [field('Fornecedor selecionado'), field('Valor cotado', 'number'), field('Prazo de entrega', 'date')]],
      ['Aprovação', [field('Aprovado', 'checkbox'), field('Observação do aprovador')]],
      ['Pedido de compra', [field('Número do pedido'), field('Pedido enviado', 'checkbox')]],
      ['Recebimento', [field('Data de recebimento', 'date'), field('Conferido', 'checkbox')]],
      ['Concluído']
    )
  },
  {
    exampleKey: 'sales-pipeline', name: 'Funil de Vendas', color: '#db2777',
    description: 'Exemplo para organizar oportunidades comerciais do primeiro contato ao fechamento.',
    steps: steps(
      ['Novos leads', [field('Empresa'), field('Contato'), field('E-mail'), field('Origem do lead')]],
      ['Qualificação', [field('Potencial', 'select', ['Baixo', 'Médio', 'Alto']), field('Valor da oportunidade', 'number')]],
      ['Diagnóstico', [field('Necessidade do cliente'), field('Prazo esperado', 'date')]],
      ['Proposta enviada', [field('Valor da proposta', 'number'), field('Data de envio', 'date')]],
      ['Negociação', [field('Probabilidade', 'number'), field('Próximo passo')]],
      ['Ganho', [field('Data de fechamento', 'date')]], ['Perdido', [field('Motivo da perda')]]
    )
  },
  {
    exampleKey: 'customer-onboarding', name: 'Onboarding de Clientes', color: '#0891b2',
    description: 'Exemplo para conduzir novos clientes do handoff comercial ao go-live.',
    steps: steps(
      ['Novos clientes', [field('Empresa'), field('Contato principal'), field('E-mail'), field('Valor do contrato', 'number')]],
      ['Planejamento', [field('Responsável pelo onboarding'), field('Data de kickoff', 'date')]],
      ['Kickoff', [field('Reunião realizada', 'checkbox'), field('Objetivos definidos')]],
      ['Implementação', [field('Progresso', 'number'), field('Pendências')]],
      ['Validação do cliente', [field('Aprovado pelo cliente', 'checkbox'), field('Feedback')]],
      ['Go-live', [field('Data do go-live', 'date')]],
      ['Concluído']
    )
  },
  {
    exampleKey: 'it-service-desk', name: 'Service Desk de TI', color: '#d97706',
    description: 'Exemplo para receber, priorizar e resolver solicitações e incidentes de TI.',
    steps: steps(
      ['Novos chamados', [field('Solicitante'), field('Categoria'), field('Descrição'), field('Impacto', 'select', ['Baixo', 'Médio', 'Alto', 'Crítico'])]],
      ['Triagem', [field('Prioridade', 'select', ['Baixa', 'Média', 'Alta', 'Urgente']), field('Responsável técnico')]],
      ['Em atendimento', [field('Diagnóstico'), field('Prazo estimado', 'date')]],
      ['Aguardando solicitante', [field('Informação solicitada')]],
      ['Validação', [field('Solução aplicada'), field('Resolvido', 'checkbox')]],
      ['Concluído', [field('Data de conclusão', 'date'), field('Satisfação', 'number')]]
    )
  }
];

export async function seedExamples() {
  const teamSeeds = [
    { name: 'Vendas', description: 'Gestão comercial e relacionamento com clientes.', color: '#0f766e', people: [] },
    { name: 'Financeiro', description: 'Crédito, cobrança e controles financeiros.', color: '#2563eb', people: [] },
    { name: 'Recursos Humanos', description: 'Gestão de pessoas e desenvolvimento.', color: '#7c3aed', people: [] },
    { name: 'Tecnologia', description: 'Sistemas, infraestrutura e suporte.', color: '#d97706', people: [] },
    { name: 'Jurídico', description: 'Análise jurídica, contratos e conformidade.', color: '#db2777', people: [] }
  ];
  for (const team of teamSeeds) {
    await Team.updateOne({ name: team.name }, { $setOnInsert: team }, { upsert: true });
  }

  const teams = await Team.find().lean();
  for (const example of examples) {
    const team = teams.find((item) => item.name === exampleTeamNames[example.exampleKey]);
    if (!team) continue;
    // Reuse older prefixed example keys without recreating boards or their cards.
    const current = await Board.findOne({ exampleKey: example.exampleKey }).select('_id');
    if (!current) {
      const legacy = await Board.findOne({ isExample: true, exampleKey: { $regex: `-${example.exampleKey}$` } }).select('_id');
      if (legacy) await Board.updateOne({ _id: legacy._id }, { $set: { exampleKey: example.exampleKey } });
    }
    await Board.updateOne(
      { exampleKey: example.exampleKey },
      { $setOnInsert: { ...example, teamId: team._id, color: team.color, isExample: true, visibility: 'public', ownerId: null, memberIds: [], cards: [] } },
      { upsert: true }
    );
    await Board.updateOne(
      { exampleKey: example.exampleKey, teamId: null },
      { $set: { teamId: team._id, color: team.color } },
    );
  }
}
