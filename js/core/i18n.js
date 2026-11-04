/* Flowline · idiomas (EN padrão, PT-BR opcional).
   O código continua escrito em inglês; um tradutor de DOM troca os textos da interface na hora,
   inclusive menus, modais e toasts. Conteúdo do usuário (mapas, campos editáveis) não é tocado:
   o canvas, inputs e áreas editáveis ficam fora da tradução. */
(function (FL) {
  const PT = {
    // shell / navegação
    'Workspace': 'Área de trabalho', 'Portfolio': 'Portfólio', 'My work': 'Meu trabalho', 'LSS toolkit': 'Kit LSS', 'Projects': 'Projetos', 'My projects': 'Meus projetos', 'Shared with me': 'Compartilhados comigo',
    'New project': 'Novo projeto', 'OpEx workspace': 'Espaço OpEx', 'Search projects, maps, tasks…': 'Buscar projetos, mapas, tarefas…', 'Backup': 'Backup', 'Saved': 'Salvo', 'Saving…': 'Salvando…',
    'Prototype · local data': 'Protótipo · dados locais', 'Signed in with Google': 'Conectado com Google', 'You only see projects shared with you.': 'Você só vê projetos compartilhados com você.',
    'Access rules are simulated in this browser. Use the user menu to test another person.': 'As regras de acesso são simuladas neste navegador. Use o menu do usuário para testar outra pessoa.',
    'Export backup (.json)': 'Exportar backup (.json)', 'Import backup…': 'Importar backup…', 'Reset demo data': 'Restaurar dados de demonstração', 'Reset demo data?': 'Restaurar dados de demonstração?',
    'This replaces everything stored in this browser with the original sample projects.': 'Isso substitui tudo o que está salvo neste navegador pelos projetos de exemplo originais.',
    'Demo data restored': 'Dados de demonstração restaurados', 'Reset': 'Restaurar', 'Demo · view as another user': 'Demo · ver como outro usuário', 'Now viewing as': 'Vendo agora como',
    'Toggle sidebar': 'Recolher menu', 'Switch to dark mode': 'Modo escuro', 'Switch to light mode': 'Modo claro', 'Main navigation': 'Navegação principal', 'Breadcrumb': 'Caminho',
    'Search or run a command…': 'Buscar ou executar um comando…', 'navigate': 'navegar', 'open': 'abrir', 'close': 'fechar', 'No results': 'Nenhum resultado', 'Actions': 'Ações', 'Tasks': 'Tarefas', 'Maps & analysis': 'Mapas e análises',
    'Go to Portfolio': 'Ir para o portfólio', 'Go to My work': 'Ir para Meu trabalho', 'Open LSS toolkit': 'Abrir kit LSS', 'Toggle dark mode': 'Alternar modo escuro', 'Export backup': 'Exportar backup',
    'No access': 'Sem acesso', 'Could not save': 'Não foi possível salvar', 'Could not load Flowline': 'Não foi possível carregar o Flowline',
    // portfólio
    'Active projects': 'Projetos ativos', 'Savings · realized / target': 'Savings · realizado / meta', 'Tasks needing attention': 'Tarefas que pedem atenção', 'At risk, blocked or overdue': 'Em risco, bloqueadas ou atrasadas',
    'Tollgates next 3 weeks': 'Tollgates nas próximas 3 semanas', 'None scheduled': 'Nenhum agendado', 'All': 'Todos', 'Owned by me': 'Meus', 'Project': 'Projeto', 'Type': 'Tipo', 'Health': 'Saúde', 'Progress': 'Progresso',
    'Phase ends': 'Fim da fase', 'Savings target': 'Meta de savings', 'Access': 'Acesso', 'Shared': 'Compartilhado', 'View only': 'Somente leitura', 'Needs attention': 'Pede atenção', 'Recent activity': 'Atividade recente',
    'Overdue': 'Atrasada', 'This week': 'Esta semana', 'Next 3 weeks': 'Próximas 3 semanas', 'Later': 'Depois', 'Done': 'Concluída', 'No tasks assigned to you': 'Nenhuma tarefa atribuída a você',
    'Tasks you own in any project plan show up here.': 'As tarefas em seu nome em qualquer plano aparecem aqui.', 'Mark as done': 'Marcar como concluída', 'Task completed': 'Tarefa concluída', 'Undo': 'Desfazer',
    'Linked to a map': 'Ligada a um mapa', 'Yellow Belt': 'Yellow Belt', 'Green Belt': 'Green Belt', 'Black Belt': 'Black Belt', 'Kaizen': 'Kaizen',
    // status / saúde / fases
    'Not started': 'Não iniciada', 'In progress': 'Em andamento', 'At risk': 'Em risco', 'Blocked': 'Bloqueada', 'On track': 'No prazo', 'Off track': 'Fora do prazo', 'Closed': 'Encerrado',
    'Define': 'Definir', 'Measure': 'Medir', 'Analyze': 'Analisar', 'Improve': 'Melhorar', 'Control': 'Controlar',
    'What is the problem and why does it matter?': 'Qual é o problema e por que ele importa?', 'How big is it, and can we trust the data?': 'Qual o tamanho dele e podemos confiar nos dados?',
    'What are the validated root causes?': 'Quais são as causas raiz validadas?', 'Which solutions remove the root causes?': 'Quais soluções eliminam as causas raiz?', 'How do we sustain the gains?': 'Como sustentar os ganhos?',
    // projeto
    'Overview': 'Visão geral', 'Charter': 'Charter', 'Plan': 'Plano', 'Board': 'Quadro', 'Share': 'Compartilhar', 'People with access': 'Pessoas com acesso', 'More': 'Mais',
    'Copy project ID': 'Copiar ID do projeto', 'Copy link': 'Copiar link', 'Project ID copied': 'ID do projeto copiado', 'Link copied — only people with access can open it': 'Link copiado — só quem tem acesso consegue abrir',
    'Delete project': 'Excluir projeto', 'Delete project?': 'Excluir projeto?', 'This permanently removes the project for everyone it is shared with.': 'Isso remove o projeto definitivamente para todos com quem ele está compartilhado.',
    'Project deleted': 'Projeto excluído', 'Delete': 'Excluir', 'Leave project': 'Sair do projeto', 'Leave project?': 'Sair do projeto?', 'Leave': 'Sair', 'You will lose access until someone shares it with you again.': 'Você perde o acesso até alguém compartilhar de novo.',
    'DMAIC journey': 'Jornada DMAIC', 'Deliverables tick themselves when the evidence exists in Maps & analysis or the Plan.': 'Os entregáveis se marcam sozinhos quando a evidência existe em Mapas e análises ou no Plano.',
    'not planned': 'não planejada', 'auto': 'auto', 'Tollgate pending': 'Tollgate pendente', 'Project Y metrics': 'Métricas Y do projeto', 'Baseline → target · current': 'Baseline → meta · atual',
    'Metric': 'Métrica', 'Baseline': 'Baseline', 'Target': 'Meta', 'Current': 'Atual', 'Δ vs baseline': 'Δ vs baseline', 'Open plan': 'Abrir plano', 'All tasks on schedule.': 'Todas as tarefas em dia.',
    'Realized vs. annualized target': 'Realizado vs. meta anualizada', 'Team': 'Time', 'Activity': 'Atividade', 'No activity yet.': 'Nenhuma atividade ainda.', 'Ticked automatically from the project evidence': 'Marcado automaticamente pela evidência do projeto',
    'evidence found': 'evidência encontrada', 'Approved by': 'Aprovado por', 'Date': 'Data', 'All deliverables complete': 'Todos os entregáveis completos', 'Approve & close project': 'Aprovar e encerrar projeto',
    'Moved to': 'Movido para', 'Project closed — congratulations!': 'Projeto encerrado — parabéns!',
    'Project charter complete (problem, goal, scope)': 'Charter completo (problema, meta, escopo)', 'SIPOC — high-level process': 'SIPOC — processo macro', 'VOC translated into CTQs': 'VOC traduzida em CTQs', 'Team, sponsor and plan agreed': 'Time, sponsor e plano acordados',
    'Detailed process map (PMAP) with Xs and Ys': 'Mapa de processo detalhado (PMAP) com Xs e Ys', 'Thought process map (TMAP) started': 'Mapa de raciocínio (TMAP) iniciado', 'Measurement system (MSE / Gage R&R) accepted': 'Sistema de medição (MSE / Gage R&R) aprovado', 'Baseline capability (Cp/Cpk)': 'Capabilidade de baseline (Cp/Cpk)',
    'Cause & effect — fishbone': 'Causa e efeito — fishbone', 'Pareto of defect modes': 'Pareto dos modos de defeito', 'FMEA with RPN ranking': 'FMEA com ranking de RPN', 'Root causes validated with data': 'Causas raiz validadas com dados',
    'Solutions selected (impact × effort)': 'Soluções selecionadas (impacto × esforço)', 'Pilot run with confirmed results': 'Piloto com resultados confirmados', 'Future-state process map': 'Mapa do processo futuro', 'All improvement actions closed': 'Todas as ações de melhoria concluídas',
    'Control plan approved': 'Plano de controle aprovado', 'Control chart (I-MR) in place': 'Carta de controle (I-MR) implantada', 'SOP / one-point lesson updated': 'SOP / lição de um ponto atualizada', 'Financial benefit validated by Finance': 'Benefício financeiro validado por Finanças', 'Handoff to process owner': 'Passagem para o dono do processo',
    // charter
    'Problem statement': 'Declaração do problema', 'Goal statement': 'Declaração da meta', 'Business case': 'Business case', 'In scope': 'Dentro do escopo', 'Out of scope': 'Fora do escopo', 'Constraints & assumptions': 'Restrições e premissas',
    'Metrics': 'Métricas', 'Add metric': 'Adicionar métrica', 'Metric (Y)': 'Métrica (Y)', 'Unit': 'Unidade', 'Better': 'Melhor', 'Lower': 'Menor', 'Higher': 'Maior', 'Remove metric': 'Remover métrica', 'New metric': 'Nova métrica',
    'Project information': 'Informações do projeto', 'Name': 'Nome', 'Code': 'Código', 'Lead': 'Líder', 'Sponsor': 'Sponsor', 'Master Black Belt': 'Master Black Belt', 'Site': 'Planta', 'Area / line': 'Área / linha',
    'Savings target (USD/yr)': 'Meta de savings (USD/ano)', 'Realized': 'Realizado', 'Savings type': 'Tipo de savings', 'Hard': 'Hard', 'Soft': 'Soft', 'Cost avoidance': 'Custo evitado', 'Add': 'Adicionar',
    'Key milestones (from the plan)': 'Marcos (do plano)', 'Someone else…': 'Outra pessoa…', 'Add team member': 'Adicionar membro do time', 'Full name': 'Nome completo', 'Team member': 'Membro do time',
    'States the problem without jumping to causes': 'Descreve o problema sem pular para causas', 'Specific': 'Específica', 'Measurable': 'Mensurável', 'Achievable': 'Atingível', 'Relevant': 'Relevante', 'Time-bound': 'Com prazo',
    'What is wrong, where, since when, how big, and the impact — no causes or solutions.': 'O que está errado, onde, desde quando, qual o tamanho e o impacto — sem causas nem soluções.',
    'Reduce [Y] from [baseline] to [target] by [date].': 'Reduzir [Y] de [baseline] para [meta] até [data].', 'Why this matters now, link to site / category priorities.': 'Por que isso importa agora, ligação com as prioridades da planta / categoria.',
    'Processes, products, lines included': 'Processos, produtos e linhas incluídos', 'What the team will not touch': 'O que o time não vai mexer', 'Budget, freeze dates, resources…': 'Orçamento, datas de congelamento, recursos…',
    // novo projeto
    'New improvement project': 'Novo projeto de melhoria', 'Project name': 'Nome do projeto', 'Leader': 'Líder', 'Start date': 'Data de início', 'Target savings (USD / year)': 'Meta de savings (USD / ano)', 'Primary metric (Y)': 'Métrica principal (Y)',
    'Create the DMAIC plan with tollgates (editable)': 'Criar o plano DMAIC com tollgates (editável)', 'Add starter pages: SIPOC and Thought process map': 'Adicionar páginas iniciais: SIPOC e Mapa de raciocínio', 'Create project': 'Criar projeto', 'Cancel': 'Cancelar',
    'Quick win, 4–6 weeks': 'Ganho rápido, 4–6 semanas', 'DMAIC, 3–5 months': 'DMAIC, 3–5 meses', 'Cross-functional, 6+ months': 'Multifuncional, 6+ meses', '1-week event': 'Evento de 1 semana',
    'Project created': 'Projeto criado', 'Give the project a name': 'Dê um nome ao projeto', 'Save': 'Salvar', 'Close': 'Fechar', 'Confirm': 'Confirmar',
    // compartilhamento
    'Add people from': 'Adicionar pessoas de', 'Can edit': 'Pode editar', 'Can view': 'Pode ver', 'Owner': 'Dono', 'Make owner': 'Tornar dono', 'you': 'você', 'Access requests': 'Pedidos de acesso', 'Approve': 'Aprovar', 'Deny': 'Recusar',
    'Only owners and editors can share this project': 'Só donos e editores podem compartilhar este projeto', 'Type an email': 'Digite um e-mail', 'Only company accounts can be added': 'Só contas da empresa podem ser adicionadas',
    'Only the people listed here can open this project. A copied link does not grant access — others will be asked to request it.': 'Só as pessoas listadas aqui abrem este projeto. Um link copiado não dá acesso — os demais precisam pedir.',
    'Shared with': 'Compartilhado com', 'is now the owner': 'agora é o dono', 'Access granted': 'Acesso liberado', 
    'You don’t have access to this project': 'Você não tem acesso a este projeto', 'Projects are private to the people they are shared with. Ask the owner to share it with you, or send a request.': 'Os projetos são privados para as pessoas com quem foram compartilhados. Peça ao dono para compartilhar com você ou envie um pedido.',
    'Optional message to the owner': 'Mensagem opcional para o dono', 'Request access': 'Pedir acesso', 'Back to portfolio': 'Voltar ao portfólio', 'Request sent — you will get access when the owner approves': 'Pedido enviado — você recebe acesso quando o dono aprovar',
    'You have view-only access to this project': 'Você tem acesso somente leitura a este projeto', 'You have view-only access — changes were not saved': 'Seu acesso é somente leitura — as alterações não foram salvas',
    // plano
    'Add task': 'Adicionar tarefa', 'Critical path': 'Caminho crítico', 'Set baseline': 'Definir baseline', 'Today': 'Hoje', 'Days': 'Dias', 'Weeks': 'Semanas', 'Months': 'Meses', 'Assigned to me': 'Atribuídas a mim', 'Open': 'Abertas', 'Late & at risk': 'Atrasadas e em risco',
    'Grid & Gantt': 'Grade e Gantt', 'Task name': 'Tarefa', 'Phase': 'Fase', 'Assigned to': 'Responsável', 'Status': 'Status', 'Tags': 'Tags', 'Start': 'Início', 'Finish': 'Fim', 'Duration': 'Duração', '% Complete': '% Concluído', 'Predecessors': 'Predecessoras', 'Comments': 'Comentários',
    'Add a task': 'Adicionar uma tarefa', 'No tasks match this filter': 'Nenhuma tarefa neste filtro', 'TODAY': 'HOJE', 'Undo (Ctrl+Z)': 'Desfazer (Ctrl+Z)', 'Redo (Ctrl+Y)': 'Refazer (Ctrl+Y)', 'Indent (Ctrl+])': 'Recuar (Ctrl+])', 'Outdent (Ctrl+[)': 'Avançar (Ctrl+[)', 'Delete row': 'Excluir linha', 'Export CSV': 'Exportar CSV',
    'Open details': 'Abrir detalhes', 'Go to linked map shape': 'Ir para a forma ligada no mapa', 'Insert row above': 'Inserir linha acima', 'Insert row below': 'Inserir linha abaixo', 'Indent': 'Recuar', 'Outdent': 'Avançar', 'Move up': 'Mover para cima', 'Move down': 'Mover para baixo',
    'Show baseline': 'Mostrar baseline', 'Reset baseline to current plan': 'Redefinir baseline para o plano atual', 'Clear baseline': 'Limpar baseline', 'Baseline saved — grey bars show the original dates': 'Baseline salva — as barras cinza mostram as datas originais',
    'Nothing to undo': 'Nada para desfazer', 'Nothing to redo': 'Nada para refazer', 'Nothing above to nest under': 'Não há tarefa acima para aninhar', 'Summary rows roll up from their sub-tasks': 'Linhas de resumo são calculadas pelas subtarefas', 'Start is driven by predecessors': 'O início é definido pelas predecessoras',
    'That would create a circular dependency': 'Isso criaria uma dependência circular', 'Link to a task, not a summary row': 'Ligue a uma tarefa, não a uma linha de resumo', 'Drag to resize': 'Arraste para redimensionar',
    'Task details': 'Detalhes da tarefa', 'Task': 'Tarefa', 'Duration (working days)': 'Duração (dias úteis)', '% complete': '% concluído', 'Comments / guidance': 'Comentários / orientação', 'Linked map': 'Mapa ligado', 'Open shape': 'Abrir forma', 'Edit tags': 'Editar tags',
    // board
    'Columns': 'Colunas', 'Swimlanes': 'Raias', 'Sort': 'Ordenar', 'Due': 'Prazo', 'Critical only': 'Só caminho crítico', 'Hide done': 'Ocultar concluídas', 'Search cards': 'Buscar cartões', 'Manage tags': 'Gerenciar tags', 'Clear filters': 'Limpar filtros',
    'DMAIC phase': 'Fase DMAIC', 'Tag': 'Tag', 'Due date': 'Prazo', 'None': 'Nenhuma', 'Due date · soonest first': 'Prazo · mais próximo primeiro', 'Due date · latest first': 'Prazo · mais distante primeiro', 'Name (A–Z)': 'Nome (A–Z)', 'Plan order': 'Ordem do plano',
    'Any due date': 'Qualquer prazo', 'Due this week': 'Vence esta semana', 'Due in 2 weeks': 'Vence em 2 semanas', 'Due later': 'Vence depois', 'Completed': 'Concluídas', 'Any tag': 'Qualquer tag', 'Anyone': 'Qualquer pessoa', 'Me': 'Eu', 'Clear': 'Limpar',
    'Cards with all selected tags': 'Cartões com todas as tags marcadas', 'cards': 'cartões', 'view only': 'somente leitura', 'drag cards between cells · right-click to tag · double-click to edit': 'arraste cartões entre células · botão direito para tags · duplo clique para editar',
    'No cards match these filters': 'Nenhum cartão com esses filtros', 'Unassigned': 'Sem responsável', 'No tag': 'Sem tag', 'Has slack': 'Com folga', 'Next week': 'Próxima semana', 'Milestone': 'Marco', 'Linked to map': 'Ligada ao mapa',
    'New tag': 'Nova tag', 'New tag…': 'Nova tag…', 'Manage tags…': 'Gerenciar tags…', 'Tag name': 'Nome da tag', 'That tag already exists': 'Essa tag já existe', 'e.g. Supplier, Quick win, Lab': 'ex.: Fornecedor, Ganho rápido, Laboratório', 'tasks': 'tarefas', 'No custom tags yet.': 'Nenhuma tag personalizada ainda.',
    'Tags group tasks into clusters on the board. Automatic tags (critical path, overdue, milestone, linked to map) are calculated for you.': 'As tags agrupam as tarefas em clusters no quadro. As tags automáticas (caminho crítico, atrasada, marco, ligada ao mapa) são calculadas para você.',
    'Automatic tags are calculated from the plan': 'Tags automáticas são calculadas a partir do plano', 'Open linked map shape': 'Abrir forma ligada no mapa',
    // mapas
    'Search shapes': 'Buscar formas', 'Add page': 'Adicionar página', 'Canvas templates': 'Modelos de canvas', 'Structured tools': 'Ferramentas estruturadas', 'Rename': 'Renomear', 'Duplicate': 'Duplicar', 'Move left': 'Mover para a esquerda', 'Move right': 'Mover para a direita', 'Delete page': 'Excluir página', 'Delete page?': 'Excluir página?',
    'Rename page': 'Renomear página', 'Page name': 'Nome da página', 'No maps yet': 'Nenhum mapa ainda', 'Start with a thought process map, a SIPOC or any template.': 'Comece com um mapa de raciocínio, um SIPOC ou qualquer modelo.', 'Add a page': 'Adicionar página',
    'Page': 'Página', 'Data rules': 'Regras de dados', 'conditional formatting': 'formatação condicional', 'Color shapes by their data — e.g. VSM steps with C/T above takt.': 'Pinte formas pelos dados — ex.: etapas do VSM com C/T acima do takt.', 'Add rule': 'Adicionar regra', 'Remove rule': 'Remover regra',
    'Shortcuts': 'Atalhos', 'connect / create next shape': 'conectar / criar a próxima forma', 'add next connected shape': 'adicionar forma conectada', 'paste image or data → chart': 'colar imagem ou dados → gráfico', 'pan': 'mover a tela', 'zoom': 'zoom', 'fit to screen': 'ajustar à tela',
    'text · sticky · frame · question': 'texto · post-it · frame · pergunta', 'duplicate': 'duplicar', 'create action item': 'criar ação', 'Text': 'Texto', 'Fill': 'Preenchimento', 'Border': 'Borda', 'Solid': 'Contínua', 'Dashed': 'Tracejada', 'Shape data': 'Dados da forma', 'used by data rules': 'usados nas regras de dados',
    'Add field': 'Adicionar campo', 'Remove field': 'Remover campo', 'Plan link': 'Vínculo com o plano', 'Turn this shape into a tracked action. Its status shows on the map and in the plan.': 'Transforme esta forma em uma ação acompanhada. O status aparece no mapa e no plano.',
    'Create action item': 'Criar ação', 'Link…': 'Vincular…', 'Open task': 'Abrir tarefa', 'Show in plan': 'Ver no plano', 'Unlink': 'Desvincular', 'Arrange': 'Organizar', 'Bring to front': 'Trazer para frente', 'Send to back': 'Enviar para trás', 'Lock': 'Travar', 'Lock position': 'Travar posição', 'Unlock': 'Destravar',
    'Edit text': 'Editar texto', 'Open linked task': 'Abrir tarefa ligada', 'Create action item in plan': 'Criar ação no plano', 'Link to existing task…': 'Vincular a tarefa existente…', 'Link to task': 'Vincular à tarefa', 'Connector': 'Conector', 'Label': 'Rótulo', 'Routing': 'Traçado', 'Elbow': 'Cotovelo', 'Straight': 'Reto', 'Curved': 'Curvo',
    'Arrows': 'Setas', 'End': 'Fim', 'Both': 'Ambas', 'Line': 'Linha', 'Color': 'Cor', 'Sides': 'Lados', 'Reverse direction': 'Inverter sentido', 'Auto sides': 'Lados automáticos', 'Delete connector': 'Excluir conector', 'Edit label': 'Editar rótulo', 'Connector label': 'Rótulo do conector',
    'Align': 'Alinhar', 'Add sticky note here': 'Adicionar post-it aqui', 'Add TMAP question here': 'Adicionar pergunta TMAP aqui', 'Add text here': 'Adicionar texto aqui', 'Paste': 'Colar', 'Select all': 'Selecionar tudo', 'Zoom to fit': 'Ajustar à tela', 'Zoom in': 'Aumentar zoom', 'Zoom out': 'Diminuir zoom', 'Fit to content': 'Ajustar ao conteúdo',
    'Select (V)': 'Selecionar (V)', 'Pan (H or hold Space)': 'Mover (H ou segure Espaço)', 'Text (T)': 'Texto (T)', 'Sticky note (N)': 'Post-it (N)', 'Frame (F)': 'Frame (F)', 'TMAP question (Q)': 'Pergunta TMAP (Q)', 'Insert image': 'Inserir imagem', 'Live chart': 'Gráfico vivo', 'Shape library': 'Biblioteca de formas', 'Properties panel': 'Painel de propriedades', 'Export': 'Exportar',
    'Export PNG': 'Exportar PNG', 'Export SVG': 'Exportar SVG', 'Hide minimap': 'Ocultar minimapa', 'Show minimap': 'Mostrar minimapa', 'Hide dot grid': 'Ocultar grade', 'Show dot grid': 'Mostrar grade', 'Turn snapping off': 'Desligar encaixe', 'Turn snapping on': 'Ligar encaixe',
    'Drop image to add it to the map': 'Solte a imagem para adicioná-la ao mapa', 'Click to navigate': 'Clique para navegar', 'Nothing to export': 'Nada para exportar', 'PNG export failed — try SVG': 'Falha ao exportar PNG — tente SVG', 'Could not read that image': 'Não foi possível ler a imagem',
    'Action item added to the plan': 'Ação adicionada ao plano', 'Chart': 'Gráfico', 'Title': 'Título', 'Data': 'Dados', 'Image': 'Imagem', 'Replace': 'Substituir', 'Reset ratio': 'Restaurar proporção', 'Characteristics': 'Características', 'Add photo': 'Adicionar foto', 'Replace photo': 'Trocar foto', 'Remove': 'Remover',
    'Outputs (Y)': 'Saídas (Y)', 'Inputs (X)': 'Entradas (X)', 'One per line': 'Uma por linha', 'One per line — end with (C), (N) or (S)': 'Uma por linha — termine com (C), (N) ou (S)', 'One per line — add [CTQ] or [X]': 'Uma por linha — adicione [CTQ] ou [X]', 'C = controllable · N = noise · S = SOP': 'C = controlável · N = ruído · S = SOP',
    'Letter': 'Letra', 'Type': 'Tipo', 'Signals': 'Sinais', 'Mean': 'Média', 'Total': 'Total', 'Vital few': 'Poucos vitais', 'PPM out': 'PPM fora',
    'Thought process map': 'Mapa de raciocínio', 'Process map': 'Mapa de processo', 'Product map': 'Mapa de produto', 'Value stream': 'Fluxo de valor', 'Flowchart': 'Fluxograma', 'Basic': 'Básico', 'Live analysis': 'Análise ao vivo',
    'Pasted as a Pareto chart': 'Colado como gráfico de Pareto', 'Deleted': 'Excluído',
    // ferramentas
    'Generate process map': 'Gerar mapa de processo', 'How to read it': 'Como ler', 'Suppliers': 'Fornecedores', 'Inputs': 'Entradas', 'Process': 'Processo', 'Outputs': 'Saídas', 'Customers': 'Clientes',
    'Who provides the inputs': 'Quem fornece as entradas', 'Materials, information, resources': 'Materiais, informações, recursos', '4–7 high-level steps': '4–7 etapas macro', 'What the process produces': 'O que o processo produz', 'Who receives the outputs': 'Quem recebe as saídas',
    'High-level view of the process in scope — agree on boundaries before mapping in detail.': 'Visão macro do processo no escopo — alinhe as fronteiras antes de mapear em detalhe.',
    'Start in the middle (P): name the first and last step to set the scope. Then list the outputs and who receives them, and finally the inputs and who supplies them. Keep each item short — details belong in the PMAP.': 'Comece pelo meio (P): nomeie a primeira e a última etapa para definir o escopo. Depois liste as saídas e quem as recebe e, por fim, as entradas e quem as fornece. Itens curtos — os detalhes vão para o PMAP.',
    'Process map created from the P column': 'Mapa de processo criado a partir da coluna P',
    'Brainstorm with the team using 6M, then flag suspects and confirm root causes with data.': 'Faça o brainstorm com o time usando 6M, marque os suspeitos e confirme as causas raiz com dados.',
    'Effect (problem / Y)': 'Efeito (problema / Y)', 'Suspect': 'Suspeita', 'Root': 'Raiz', 'Add cause': 'Adicionar causa', 'Add category': 'Adicionar categoria', 'Remove category?': 'Remover categoria?', 'Cause': 'Causa', 'Mark as suspect': 'Marcar como suspeita', 'Validated root cause': 'Causa raiz validada',
    'Validation task added to the plan': 'Tarefa de validação adicionada ao plano', 'Man': 'Mão de obra', 'Machine': 'Máquina', 'Method': 'Método', 'Material': 'Material', 'Measurement': 'Medição', 'Mother nature': 'Meio ambiente', 'New category': 'Nova categoria',
    'Rank failure modes by risk. Severity, occurrence and detection on a 1–10 scale.': 'Priorize os modos de falha pelo risco. Severidade, ocorrência e detecção numa escala de 1 a 10.', 'Sort by RPN': 'Ordenar por RPN', 'Add row': 'Adicionar linha',
    'Process step': 'Etapa do processo', 'Potential failure mode': 'Modo de falha potencial', 'Effect of failure': 'Efeito da falha', 'Potential cause': 'Causa potencial', 'Current controls': 'Controles atuais', 'Recommended action': 'Ação recomendada', 'Action status': 'Status da ação', 'To plan': 'Para o plano',
    'No failure modes yet': 'Nenhum modo de falha ainda', 'Start from the PMAP steps — one row per way each step can fail.': 'Parta das etapas do PMAP — uma linha para cada forma de cada etapa falhar.', 'Write a recommended action first': 'Escreva uma ação recomendada primeiro',
    'RPN ≥ 200 high · 100–199 medium · below 100 low. Always act on severity 9–10 regardless of RPN.': 'RPN ≥ 200 alto · 100–199 médio · abaixo de 100 baixo. Sempre aja em severidade 9–10, independente do RPN.', 'Row deleted': 'Linha excluída', 'Action added to the Improve phase': 'Ação adicionada à fase Melhorar',
    // toolkit
    'Templates for every DMAIC phase. Each one opens inside a project, linked to the plan and the tollgates.': 'Modelos para cada fase do DMAIC. Cada um abre dentro de um projeto, ligado ao plano e aos tollgates.', 'DMAIC roadmap': 'Roteiro DMAIC', 'What a Green Belt shows at each tollgate': 'O que um Green Belt apresenta em cada tollgate',
    'When:': 'Quando:', 'Add to project': 'Adicionar ao projeto', 'Blank canvas': 'Canvas em branco', 'Thought process map (TMAP)': 'Mapa de raciocínio (TMAP)', 'Process map (PMAP)': 'Mapa de processo (PMAP)',
    'Process Map Maker (GB standard)': 'Gerador de Process Map (padrão GB)', 'Product Map Maker (GB standard)': 'Gerador de Product Map (padrão GB)', 'Process Map Maker': 'Gerador de Process Map', 'Product Map Maker': 'Gerador de Product Map',
    'Fill in the steps, y’s and x’s — the map is drawn in the Whirlpool GB layout, critical x’s included.': 'Preencha os passos, y’s e x’s — o mapa sai desenhado no layout GB da Whirlpool, com os x’s críticos.',
    'List components, functions and characteristics — numbered y/x cards around the assembly, with V2 and critical x’s.': 'Liste componentes, funções e características — cartões y/x numerados em volta da montagem, com V2 e x’s críticos.',
    'Y measured by this process': 'Y medido por este processo', 'Y of the product (map title)': 'Y do produto (título do mapa)', 'Load example': 'Carregar exemplo', 'Add step': 'Adicionar passo', 'Add component': 'Adicionar componente', 'Create map': 'Criar mapa',
    'Step': 'Passo', 'Component': 'Componente', "y's (outputs)": "y's (saídas)", "x's (C / N / SO, * critical)": "x's (C / N / SO, * crítico)", 'Functions (y)': 'Funções (y)', "Characteristics (x, * critical, + new, ~ removed)": "Características (x, * crítica, + nova, ~ removida)",
    'End with a decision loop': 'Terminar com laço de decisão', 'Also draw V2 (after changes) below, with the changed components in orange': 'Desenhar também a V2 (após mudanças) abaixo, com os componentes alterados em laranja',
    'Map the process steps': 'Mapear os passos do processo', 'List the outputs of each step (y)': 'Listar as saídas de cada passo (y)', 'List the independent variables of each step (x)': 'Listar as variáveis independentes de cada passo (x)',
    "Classify the x's: C controllable · N noise · SO standard operation": "Classificar os x's: C controlável · N ruído · SO operação padrão", "Mark the critical x's of each y with *": "Marcar com * os x's críticos de cada y",
    'Define the measurable Y': 'Definir o Y mensurável', 'List the functions of each part (what is it for? why is it here?)': 'Listar as funções de cada peça (pra que serve? por que está aqui?)', "List the x's that affect each y, with spec (nominal and tolerance)": "Listar os x's que afetam cada y, com spec (nominal e tolerância)",
    "Mark the critical x's with * — they go to COV and DOE": "Marcar com * os x's críticos — eles vão para COV e DOE", 'Tick V2 for the components you changed': 'Marque V2 nos componentes que você alterou',
    'Add at least one step': 'Adicione pelo menos um passo', 'Add at least one component': 'Adicione pelo menos um componente', 'Changed component (orange)': 'Componente alterado (laranja)', 'Component number': 'Número do componente',
    'Process step (GB)': 'Passo de processo (GB)', 'Component (GB)': 'Componente (GB)', "Critical X's (auto)": "X's críticos (auto)", 'Changed components legend': 'Legenda de componentes alterados', 'Process map panel (GB)': 'Painel do process map (GB)', 'Decision (GB)': 'Decisão (GB)', 'Loop back (GB)': 'Retorno (GB)', 'Section header': 'Cabeçalho de seção', 'Map title': 'Título do mapa', 'Value stream map': 'Mapa de fluxo de valor', 'Swimlane flowchart': 'Fluxograma com raias', 'SPC study (I-MR + capability)': 'Estudo de CEP (I-MR + capabilidade)', 'Fishbone (Ishikawa)': 'Fishbone (Ishikawa)',
    'Free-form diagram with the full shape library.': 'Diagrama livre com a biblioteca completa de formas.', 'Questions → tools → findings → decisions. The project storyline.': 'Perguntas → ferramentas → achados → decisões. O fio condutor do projeto.', 'Steps with outputs (Y) and inputs (X) classified C / N / SOP.': 'Etapas com saídas (Y) e entradas (X) classificadas C / N / SOP.',
    'Assembly + components with characteristics (CTQ / X).': 'Conjunto + componentes com características (CTQ / X).', 'Process + inventory boxes with automatic lead-time ladder and PCE.': 'Processos + estoques com escada de lead time e PCE automáticos.', 'Cross-functional flow by role.': 'Fluxo multifuncional por papel.',
    'Paste a data column and get I-MR, Cp/Cpk instantly.': 'Cole uma coluna de dados e obtenha I-MR e Cp/Cpk na hora.', 'Suppliers, inputs, process, outputs, customers.': 'Fornecedores, entradas, processo, saídas, clientes.', '6M cause & effect, flag suspects and validated root causes.': 'Causa e efeito 6M, com suspeitas e causas raiz validadas.', 'Failure modes ranked by RPN, actions become plan tasks.': 'Modos de falha por RPN, ações viram tarefas do plano.',
    'Anything that does not fit a template.': 'Qualquer coisa que não caiba em um modelo.', 'From day one. Every question, the tool used to answer it and what you learned — the storyline for tollgates.': 'Desde o primeiro dia. Cada pergunta, a ferramenta usada para responder e o que você aprendeu — o roteiro para os tollgates.',
    'Measure: list every X per step and classify it before collecting data.': 'Medir: liste cada X por etapa e classifique antes de coletar dados.', 'Measure/Analyze on product problems: which component characteristics can drive the Y.': 'Medir/Analisar em problemas de produto: quais características dos componentes podem afetar o Y.',
    'Lead-time, inventory or flow problems. The ladder and PCE update as you type the data boxes.': 'Problemas de lead time, estoque ou fluxo. A escada e o PCE se atualizam conforme você preenche as caixas de dados.', 'Hand-offs between roles or departments (changeover, approvals, logistics).': 'Passagens entre papéis ou áreas (setup, aprovações, logística).',
    'Baseline stability and capability, and later the control chart in Control.': 'Estabilidade e capabilidade do baseline e, depois, a carta de controle no Controlar.', 'Define: agree on scope and boundaries with the sponsor.': 'Definir: alinhe escopo e fronteiras com o sponsor.', 'Analyze: brainstorm causes with the team, then validate the suspects.': 'Analisar: levante causas com o time e valide as suspeitas.', 'Analyze/Improve: prioritize risks and turn actions into tasks.': 'Analisar/Melhorar: priorize riscos e transforme ações em tarefas.',
    'Charter (problem, goal, scope)': 'Charter (problema, meta, escopo)', 'VOC → CTQ': 'VOC → CTQ', 'Stakeholders & plan': 'Stakeholders e plano', 'PMAP with Xs and Ys': 'PMAP com Xs e Ys', 'MSE / Gage R&R': 'MSE / Gage R&R', 'Baseline & capability': 'Baseline e capabilidade', 'Hypothesis tests / DOE': 'Testes de hipótese / DOE',
    'Solution selection': 'Seleção de soluções', 'Pilot': 'Piloto', 'Future-state map': 'Mapa do estado futuro', 'Confirm vs. baseline': 'Confirmar vs. baseline', 'Control plan': 'Plano de controle', 'I-MR control chart': 'Carta de controle I-MR', 'SOP / OPL': 'SOP / LUP', 'Financial validation & handoff': 'Validação financeira e passagem',
    'Language / Idioma': 'Idioma / Language', 'due': 'prazo', 'No projects yet': 'Nenhum projeto ainda', 'Create your first improvement project, or load a sample to explore the tool.': 'Crie seu primeiro projeto de melhoria ou carregue um exemplo para explorar a ferramenta.', 'Load sample project': 'Carregar projeto de exemplo', 'Nothing at risk.': 'Nada em risco.', 'Add supplier': '+ Fornecedor', 'Add input': '+ Entrada', 'Add step': '+ Etapa', 'Add output': '+ Saída', 'Add customer': '+ Cliente', 'project(s) imported': 'projeto(s) importado(s)', 'name_surname': 'nome_sobrenome',
  };
  const MON_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const PH = { Define: 'Definir', Measure: 'Medir', Analyze: 'Analisar', Improve: 'Melhorar', Control: 'Controlar' };
  const tr = (x) => PT[x] || x;
  const PATTERNS = [
    [/^(\d+) active improvement projects · FY(\d+)$/, '$1 projetos de melhoria ativos · FY$2'],
    [/^(\d+) shown$/, '$1 exibidos'],
    [/^(\d+) open tasks across (\d+) projects?$/, '$1 tarefas abertas em $2 projetos'],
    [/^Saved (.+)$/, (m, a) => 'Salvo ' + a],
    [/^Lead (.+)$/, 'Líder $1'],
    [/^(\d+) (?:cards|cartões)$/, '$1 cartões'],
    [/^(Define|Measure|Analyze|Improve|Control) tollgate · (\d+\/\d+)$/, (m, a, b) => `Tollgate ${PH[a]} · ${b}`],
    [/^(Define|Measure|Analyze|Improve|Control) tollgate review$/, (m, a) => `Revisão do tollgate ${PH[a]}`],
    [/^(Define|Measure|Analyze|Improve|Control) phase$/, (m, a) => `Fase ${PH[a]}`],
    [/^Approve & move to (\w+)$/, (m, a) => `Aprovar e ir para ${PH[a] || a}`],
    [/^Moved to (\w+)$/, (m, a) => `Movido para ${PH[a] || a}`],
    [/^Review tollgate · (\d+\/\d+)$/, 'Revisar tollgate · $1'],
    [/^Approved (.+) · (.+)$/, 'Aprovado $1 · $2'],
    [/^(\d+) deliverable\(s\) still open — the approver can accept with exceptions\.$/, '$1 entregável(is) em aberto — o aprovador pode aceitar com exceções.'],
    [/^(\d+) shapes · (\d+) connectors$/, '$1 formas · $2 conectores'],
    [/^(\d+) causes$/, '$1 causas'], [/^(\d+) suspect$/, '$1 suspeitas'], [/^(\d+) root cause$/, '$1 causa raiz'],
    [/^(\d+) high \(≥200\)$/, '$1 altos (≥200)'], [/^(\d+) medium$/, '$1 médios'], [/^#(\d) risk$/, '#$1 risco'],
    [/^(\d+) process steps$/, '$1 etapas'], [/^(\d+) tasks on the critical path$/, '$1 tarefas no caminho crítico'],
    [/^Deleted (\d+) rows?$/, '$1 linha(s) excluída(s)'], [/^Deleted (\d+) shapes?$/, '$1 forma(s) excluída(s)'],
    [/^People with access · (\d+)$/, 'Pessoas com acesso · $1'],
    [/^Row (\d+) now starts after row (\d+)$/, 'A linha $1 agora começa depois da linha $2'],
    [/^• (.+)$/, (m, a) => '• ' + tr(a)],
    [/^(\d+) tasks$/, '$1 tarefas'], [/^(\d+) selected$/, '$1 selecionados'], [/^(\d+) shapes selected$/, '$1 formas selecionadas'],
    [/^Target$/, 'Meta'], [/^Share “(.+)”$/, 'Compartilhar “$1”'], [/^Shared with (.+)$/, 'Compartilhado com $1'],
    [/^Pasted (\d+) values as an I-MR chart — change the type in the panel$/, '$1 valores colados como gráfico I-MR — troque o tipo no painel'],
    [/^(\d+) values loaded into the chart$/, '$1 valores carregados no gráfico'],
  ];

  let lang = 'en';
  try { lang = (JSON.parse(localStorage.getItem('fl-prefs') || '{}').lang) || 'en'; } catch (_) { }
  FL.lang = () => lang;
  FL.setLang = (l) => {
    lang = l === 'pt' ? 'pt' : 'en'; document.documentElement.lang = lang === 'pt' ? 'pt-BR' : 'en';
    if (FL.store && FL.store.state) { FL.store.state.prefs.lang = lang; FL.store.save(); }
    else { try { const p = JSON.parse(localStorage.getItem('fl-prefs') || '{}'); p.lang = lang; localStorage.setItem('fl-prefs', JSON.stringify(p)); } catch (_) { } }
  };
  /** Tradução de string exata (ou padrão). Sem dicionário para EN. */
  FL.t = (s, vars) => {
    let out = s;
    if (lang === 'pt' && s) { out = PT[s] || s; if (out === s) for (const [re, rp] of PATTERNS) if (re.test(s)) { out = s.replace(re, rp); break; } }
    if (vars) out = out.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
    return out;
  };
  FL.months = () => (lang === 'pt' ? MON_PT : FL.util.date.MON);

  /* ---------- Tradutor de DOM ---------- */
  const SKIP = 'svg.world, .minimap, .ed, [contenteditable="true"], textarea, script, style, .no-i18n, .kbd, .mono';
  const ATTRS = ['placeholder', 'title', 'aria-label'];
  const translateText = (node) => {
    const raw = node.nodeValue; const t = raw.trim(); if (!t || t.length > 400) return;
    const o = FL.t(t); if (o !== t) node.nodeValue = raw.replace(t, o);
  };
  const walk = (root) => {
    if (lang !== 'pt' || !root) return;
    if (root.nodeType === 3) { if (!(root.parentElement && root.parentElement.closest(SKIP))) translateText(root); return; }
    if (root.nodeType !== 1 || root.closest(SKIP)) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.nodeType === 1 && n.matches(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
    let n = root;
    do {
      if (n.nodeType === 3) translateText(n);
      else ATTRS.forEach((a) => { const v = n.getAttribute(a); if (v) { const o = FL.t(v); if (o !== v) n.setAttribute(a, o); } });
    } while ((n = w.nextNode()));
  };
  FL.i18nWalk = walk;
  const mo = new MutationObserver((list) => {
    if (lang !== 'pt') return;
    for (const m of list) {
      if (m.type === 'characterData') { if (!(m.target.parentElement && m.target.parentElement.closest(SKIP))) translateText(m.target); }
      else m.addedNodes.forEach(walk);
    }
  });
  const start = () => { document.documentElement.lang = lang === 'pt' ? 'pt-BR' : 'en'; mo.observe(document.body, { childList: true, subtree: true, characterData: true }); walk(document.body); };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', start) : start();
})(window.FL);
