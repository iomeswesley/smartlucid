# Flowline · OpEx Workspace (protótipo)

Lucidchart + Smartsheet num só lugar, desenhado para projetos Lean Six Sigma (Yellow, Green e Black Belt e Kaizen) da OpEx.
Usa a mesma linguagem visual do **Teardown Platform** ("Precision Workspace"): tokens `css/tokens.css`, Geist/Geist Mono, um acento azul, borda no lugar de sombra e sidebar escura que recolhe dentro do registro.

## Como rodar

```bash
python serve.py
```

Abra http://127.0.0.1:8765. Os dados ficam no IndexedDB do navegador. Use **Backup → Export** para gerar um `.json` e **Backup → Reset demo data** para voltar aos projetos de exemplo.

## O que tem no protótipo

| Área | O que faz |
|---|---|
| **Portfolio** | KPIs (projetos ativos por belt, savings realizado/meta, tarefas em risco, tollgates das próximas 3 semanas), tabela com DMAIC, saúde, progresso, alertas e atividade |
| **My work** | Tarefas do usuário em todos os projetos, agrupadas por prazo, com check para concluir |
| **Overview do projeto** | Jornada DMAIC com checklist de tollgate. Os entregáveis **se marcam sozinhos** quando a evidência existe (SIPOC preenchido, PMAP com Xs, Pareto, FMEA, causa raiz validada, etc.). Também traz aprovação de tollgate (avança a fase), métricas Y (baseline → meta → atual), savings, time e atividade |
| **Charter** | Problema com alerta se citar causa ou solução, meta com checagem SMART automática, escopo, métricas e time |
| **Maps & analysis** (Lucid) | Canvas com páginas na barra inferior, como no Lucid. Ver detalhes abaixo |
| **Plan** (Smartsheet) | Grade hierárquica + Gantt sincronizado. Ver detalhes abaixo |
| **Plan → Board** (Kanban) | O mesmo plano visto como quadro. Colunas e raias configuráveis: status, fase, **tag**, responsável, prazo ou caminho crítico. **Tags personalizadas** criam clusters; as **tags automáticas** são *Caminho crítico*, *Atrasada*, *Marco* e *Ligada ao mapa*. Ordenação por prazo (mais próximo ou mais distante), início, % ou nome. Filtros por tag, responsável, prazo, só caminho crítico e busca. Arrastar o cartão muda o campo da coluna/raia |
| **Compartilhamento** | Cada projeto tem um ID próprio e uma lista de membros (dono / pode editar / pode ver), só do domínio @whirlpool.com. Inclui pedido de acesso e aprovação. Detalhes em `docs/ARQUITETURA-SHEETS.md` |
| **Idioma** | EN/PT no topo da tela |
| **LSS toolkit** | Roteiro DMAIC e galeria de templates, com botão para adicionar a qualquer projeto |
| **Ctrl K** | Busca global de projetos, páginas e tarefas, e comandos |

### Canvas (Maps & analysis)
- **Formas:** básicas, fluxograma, TMAP (pergunta, ação, decisão, key learning, marcador de fase), PMAP (passo com saídas Y e entradas X classificadas C/N/SOP), Product map (cartão de componente com características CTQ/X e foto), VSM (processo com data box, estoque, fornecedor/cliente, kaizen burst e **linha do tempo automática** com lead time, VA time e PCE), frames e swimlanes.
- **Gráficos vivos:** I-MR (regras de Western Electric), Pareto, capabilidade (Cp/Cpk/Pp/Ppk/PPM) e run chart. Colar uma coluna do Excel ou do Minitab (**Ctrl V**) cria o gráfico na hora; colar `categoria ⇥ valor` gera um Pareto.
- **Edição:**
  - Conectores ortogonais, retos ou curvos, com rótulo.
  - Arrastar a partir de uma porta ● em área vazia cria a próxima forma já conectada; **Tab** durante a edição de texto faz o mesmo.
  - Guias de alinhamento e snap, containers que levam o conteúdo junto, undo/redo, copiar/colar entre páginas, minimapa.
  - Exportação PNG/SVG.
- **Imagens:** colar print (Ctrl V) ou arrastar arquivo. As imagens são reduzidas automaticamente para o banco ficar leve.
- **Dados na forma + regras de formatação condicional:** por exemplo, pintar de vermelho o passo do VSM com C/T acima de 60 s.
- **Forma ↔ tarefa:** botão direito → *Create action item*. A forma ganha um selo com status e prazo, e a tarefa ganha o ícone de link de volta para o mapa.
- **Páginas estruturadas:** **SIPOC**, que gera o PMAP a partir da coluna P; **Fishbone**, desenhado automaticamente a partir da lista, com suspeita/causa raiz e ação; **FMEA**, com RPN, ranking e ação → tarefa na fase Improve.

### Plano (Smartsheet)
- Hierarquia por recuo (Ctrl ] / Ctrl [), dias úteis, predecessoras `4`, `6SS+2`, `7FF-1`, detecção de ciclo.
- Tarefas-resumo calculam início, fim, % e status a partir das filhas.
- Edição por teclado como em planilha: setas, Enter, Tab, digitar para editar, Ctrl Enter adiciona linha, Alt Shift ↑↓ move linha.
- Gantt com arrastar barra, redimensionar e arrastar o ● para criar dependência; caminho crítico; baseline com desvio; zoom dias/semanas/meses; linha de hoje.
- Filtros (minhas, abertas, atrasadas/em risco), colunas redimensionáveis, exportação CSV e coluna *Comments* como guia, igual ao IDP de vocês.

## Arquitetura

JavaScript puro em scripts clássicos sob o namespace `FL`, carregados em ordem em `index.html`, que é o mesmo padrão de `include()` do Teardown. Não há etapa de build, então o código porta direto para Apps Script/HtmlService ou para um front com backend.

```
js/core    util, i18n (EN/PT), schedule (motor do plano), seed (domínio DMAIC + dados),
           api (mesma interface do Apps Script; backend local com as mesmas regras de acesso),
           store (sessão do usuário, gravação por projeto, undo)
js/ui      kit (menus, modais, toasts), shell (sidebar, header, rotas, Ctrl K, idioma, usuário)
js/views   portfolio + my work, project (overview, charter, tollgates), share (compartilhar / sem acesso), toolkit
gas/       Code.gs (API segura sobre a planilha), Crypto.gs (cifra + integridade), appsscript.json
tools/     build_gas.py (empacota a interface para o Apps Script)
js/plan    plan (grade + Gantt), board (kanban)
js/canvas  charts (I-MR, Pareto, Cpk), shapes (biblioteca + templates), editor (canvas)
js/tools   sipoc, fishbone, fmea
```

Veja `docs/PESQUISA.md` para a pesquisa e o roadmap para levar à Whirlpool.
