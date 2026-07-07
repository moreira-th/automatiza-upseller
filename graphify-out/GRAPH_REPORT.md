# Graph Report - upseller-unificado  (2026-06-09)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 148 nodes · 192 edges · 7 communities (6 shown, 1 thin omitted)
- Extraction: 90% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d72046b7`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]

## God Nodes (most connected - your core abstractions)
1. `nativeClick()` - 7 edges
2. `processNextTab()` - 6 edges
3. `upsExecutarAtributosPopup()` - 6 edges
4. `stepMapearVariantes()` - 5 edges
5. `findMainDialog()` - 5 edges
6. `stepAbrirRemapeamento()` - 4 edges
7. `cleanupParallel()` - 4 edges
8. `icons` - 4 edges
9. `default_icon` - 4 edges
10. `stepConfirmar()` - 3 edges

## Surprising Connections (you probably didn't know these)
- `stepSelecionarTamanho()` --calls--> `findMainDialog()`  [INFERRED]
  automacao.js → core.js
- `stepMapearVariantes()` --calls--> `normalizarCor()`  [INFERRED]
  automacao.js → extras.js
- `stepMapearVariantes()` --calls--> `traduzirCorEnPt()`  [INFERRED]
  automacao.js → extras.js
- `upsExecutarAtributosPopup()` --calls--> `criarOverlayProgresso()`  [INFERRED]
  extras.js → overlay.js
- `upsExecutarAtributosPopup()` --calls--> `removerOverlayProgresso()`  [INFERRED]
  extras.js → overlay.js

## Import Cycles
- None detected.

## Communities (7 total, 1 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.09
Nodes (15): abrirSubespecificacaoSeNecessario(), stepAbrirRemapeamento(), stepConfirmar(), stepFechar(), stepMapearVariantes(), stepOK(), stepSalvar(), stepSelecionarTamanho() (+7 more)

### Community 1 - "Community 1"
Cohesion: 0.09
Nodes (15): esperarBotaoContem(), abrirDropdownSelect(), ajustarCoresERecortar(), aplicarAtributo(), aplicarCoresNaPagina(), esperarAtributosExpandirem(), esperarAtualizacaoCores(), expandirAtributos() (+7 more)

### Community 2 - "Community 2"
Cohesion: 0.08
Nodes (12): btnMulti, btnSingle, carregarCoresRemap(), listaTamanhos, overrides, progressFill, renderizarCoresLista(), setError() (+4 more)

### Community 3 - "Community 3"
Cohesion: 0.13
Nodes (16): cascadeWindows, cleanupParallel(), doUpload(), hideOverlayAllTabs(), limparEstadoMulti(), moveCompletedTab(), processNextTab(), processTab() (+8 more)

### Community 4 - "Community 4"
Cohesion: 0.12
Nodes (21): action, default_icon, default_popup, background, service_worker, commands, aplicar-precos, executar-macro (+13 more)

### Community 5 - "Community 5"
Cohesion: 0.18
Nodes (8): upsClickElement(), upsExecutarAtributosPopup(), upsProcessarCategoriaPopup(), upsToastDrafts(), criarOverlayProgresso(), injetarBotaoOverlay(), injetarBotaoPrecoEspecial(), removerOverlayProgresso()

## Knowledge Gaps
- **20 isolated node(s):** `tabQueue`, `cascadeWindows`, `tabOriginalIndexes`, `observer`, `manifest_version` (+15 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `stepMapearVariantes()` connect `Community 0` to `Community 1`?**
  _High betweenness centrality (0.097) - this node is a cross-community bridge._
- **Why does `upsExecutarAtributosPopup()` connect `Community 5` to `Community 1`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **Why does `normalizarCor()` connect `Community 1` to `Community 0`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Are the 6 inferred relationships involving `nativeClick()` (e.g. with `stepAbrirRemapeamento()` and `stepConfirmar()`) actually correct?**
  _`nativeClick()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `upsExecutarAtributosPopup()` (e.g. with `criarOverlayProgresso()` and `removerOverlayProgresso()`) actually correct?**
  _`upsExecutarAtributosPopup()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `stepMapearVariantes()` (e.g. with `findMainDialog()` and `nativeClick()`) actually correct?**
  _`stepMapearVariantes()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `findMainDialog()` (e.g. with `stepConfirmar()` and `stepMapearVariantes()`) actually correct?**
  _`findMainDialog()` has 4 INFERRED edges - model-reasoned connections that need verification._