# Pesquisa: Lucidchart, Smartsheet e o fluxo LSS da OpEx

## 1. Como o time usa as ferramentas hoje (documentos reais, só leitura)

**Lucidchart: "[WI] GB Air Fryer Pro Attachment"**
- Um documento por projeto, com várias páginas: *Screw TMAP, Screw PMAP, DOE1, DOE2, GB Training, Minitab, I-MR, Xbar-R, MSE, COV, DOE*. O Lucid funciona como o **caderno do projeto**.
- **TMAP (Thought Process Map)** é a espinha do projeto. É uma cadeia de caixas verdes (pergunta/ação), notas amarelas (decisão/achado, com ✓ ou ✗), grandes quadros cinza de **evidência**, letras de fase (P/D/C/A, D/M/A) e uma caixa preta de *Key learnings*. Os quadros de evidência são, quase todos, **prints do Minitab colados como imagem**.
- **Product Map:** foto do conjunto no centro e cartões de componente em volta, com as características listadas em caixas tracejadas vermelhas.
- **Páginas de estudo** (I-MR, MSE, COV, DOE): fluxograma do método + imagens dos gráficos + texto de conclusão.

**Lucidspark: "Business Development"**
- Kanban com **swimlanes** (MVP, Críticos, …) × colunas (To do, Doing…), post-its e fluxos dentro das células.

**Smartsheet: "IDP – Subsystem rev C"**
- Plano hierárquico por gates (M0/G1/PDR → Project Charter/POS/QFD → DVP&R → Knowledge & FMEA → CPM → Costed BOM…).
- Colunas: Task Name, Duration, Start, Finish, Predecessors, Assigned To, % Complete, Status e **Comments**. A coluna Comments é usada como **guia de como fazer cada tarefa**.
- Usuários com assento "comment only" não editam. Licença por assento é um atrito real.

## 2. O que as ferramentas oferecem (2026)

| | Lucidchart | Smartsheet |
|---|---|---|
| Núcleo | Diagramas inteligentes, containers/swimlanes, assisted layout | Grade tipo planilha + Gantt, cards, calendário |
| Dados | Ligação com Sheets/Excel/Salesforce, formatação condicional, smart containers | Fórmulas, relatórios, dashboards |
| IA | Gera e edita diagramas, cria regras com lógica em várias etapas | Smart Assist |
| Projeto | — | Dependências (4 tipos), lag, caminho crítico, baselines, automações (limitadas por plano) |

Fontes:
- [Lucid – intelligent diagramming](https://lucid.co/platform/intelligent-diagramming)
- [Lucid release notes](https://community.lucid.co/product-updates/101)
- [Lucid – process maps](https://lucid.co/lucidchart/use-cases/process-maps)
- [Smartsheet – Gantt com dependências](https://help.smartsheet.com/learning-track/smartsheet-advanced/gantt-chart-dependencies)
- [Comparativo ClickUp](https://clickup.com/learn/topic/project-management/tools/smartsheet/)
- [Crítica da ProjectManager](https://www.projectmanager.com/blog/smartsheet-gantt-chart)

## 3. O que falta para LSS (as dores que o Flowline ataca)

1. **O mapa e o plano não se conversam.** A ação decidida no TMAP vira tarefa digitada à mão no Smartsheet, e o status nunca volta para o mapa.
   → No Flowline, forma ↔ tarefa: o selo de status aparece no mapa e o link aparece no plano.
2. **A evidência é imagem estática.** Um print do Minitab não recalcula e não é pesquisável.
   → Gráficos vivos (I-MR, Pareto, Cpk, run chart) a partir de dados colados. Prints continuam suportados.
3. **DMAIC e tollgate ficam fora das ferramentas.** O checklist da revisão vive em PowerPoint.
   → Jornada DMAIC com entregáveis que se marcam pela evidência existente e aprovação que avança a fase.
4. **Ferramentas LSS feitas "na mão" com formas genéricas** (SIPOC, fishbone, FMEA, PMAP com C/N/SOP, VSM).
   → Ferramentas estruturadas: o diagrama se desenha a partir dos dados, e o VSM calcula lead time e PCE.
5. **Visão de portfólio.** Hoje não existe uma visão de savings, fases e riscos de todos os belts.
   → Portfolio com KPIs e uma visão de Minhas tarefas.
6. **Custo e assentos de duas licenças**, com "comment only" travando quem precisa editar.
   → Uma ferramenta interna, sem custo por assento.

Fontes sobre DMAIC, tollgates e Whirlpool:
- [iSixSigma – DMAIC](https://www.isixsigma.com/methodology/six-sigma-dmaic/)
- [GoLeanSixSigma – DMAIC Field Guide](https://goleansixsigma.com/wp-content/uploads/2015/03/DMAIC-Field-Guide-P200-1-GoLeanSixSigma.com_.pdf)
- [iSixSigma – Whirlpool Operational Excellence](https://www.isixsigma.com/computers-electronics/whirlpool-operational-excellence/)
- [IndustryWeek – Whirlpool WCM](https://www.industryweek.com/leadership/article/22024389/whirlpools-green-takes-aim-at-world-class-manufacturing)

## 4. Roadmap sugerido para virar ferramenta interna

**Fase 1: piloto com 3 a 5 belts**
- Hospedagem interna: Apps Script/HtmlService, como o Teardown, ou um app estático com backend leve.
- Login corporativo (Google Workspace ou Entra ID SSO); persistência em servidor no lugar do IndexedDB.
- Importar `.csv` do Smartsheet para o plano e `.vsdx`/CSV do Lucid como imagem de fundo.
- Templates de tollgate de acordo com o padrão OpEx/WCM atual. Validar com o MBB.

**Fase 2: colaboração**
- Edição simultânea (CRDT, como Yjs), comentários por forma e por tarefa, @menções e notificações por e-mail ou Teams.
- Permissões por projeto (líder, time, sponsor, leitor) e trilha de auditoria das aprovações de tollgate.

**Fase 3: análise**
- Mais estatística: Xbar-R, Gage R&R, testes de hipótese, DOE fatorial com gráfico de efeitos principais. Também importação direta de planilhas do Minitab.
- Dashboard de portfólio por site/categoria, savings validados por Finance e exportação do "storyboard A3" do projeto em PDF.
- Assistente de IA: gerar o TMAP a partir do charter, sugerir causas no fishbone e redigir a revisão de tollgate.
