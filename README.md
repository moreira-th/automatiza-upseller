# Automatiza UpSeller

Extensão Chrome para automação de produtos no **UpSeller** — remapeamento de variantes, preenchimento de guia de tamanhos, descrições e preços especiais em lote.

Feito por [Thales Moreira](https://github.com/moreira-th).

---

## Funcionalidades

| Funcionalidade | Descrição |
|---|---|
| **Remapeamento de Variantes** | Abre o diálogo de remapeamento, mapeia cores e tamanhos automaticamente e salva |
| **Tabela de Medidas** | Preenche busto/cintura/quadril para cada tamanho (PP–16) na guia de tamanhos |
| **Descrições** | Injeta a descrição salva da biblioteca no campo de texto do produto |
| **Preços Especiais** | Aplica preço em massa com overrides por tamanho na tabela de variantes |
| **Editar em Massa** | Quantidade, preço, peso e pacote em todas as variantes de uma vez |
| **Atributos Customizados** | Expande, limpa e aplica presets de atributos (composição, decote, etc.) |
| **Cores** | Confirma/copia cores da especificação principal, tradução EN→PT |
| **SKU Automático** | Botão ⚡ no campo N° do Anúncio com auto-trigger após 500ms sem digitar |
| **Recorte de Imagem** | Recorte em massa + cópia de cores para imagem de detalhe |
| **Multi-Aba** | Executa em paralelo ou sequencial em múltiplas abas de edição |
| **Presets** | Salva/carrega/deleta configurações completas da overlay |
| **Export/Import** | Backup/restauração seletiva por categoria de dados |
| **Drafts** | Atributos em massa nos produtos selecionados na listagem de drafts |
| **Botões Flutuantes** | Atalhos visuais na página: ⚙️ Automatiza, 💲 Preço Especial |
| **Atalhos de Teclado** | `Alt+Z` = executar macro, `Alt+X` = aplicar preços |

## Instalação

1. Abra `chrome://extensions`
2. Ative **"Modo do desenvolvedor"** (canto superior direito)
3. Clique em **"Carregar sem compactação"**
4. Selecione a pasta `upseller-unificado/`
5. A extensão aparecerá como **"UpSeller Moreira"**

## Como Usar

### Remapeamento + Medidas + Preços (fluxo completo)

1. Acesse um produto em edição: `https://app.upseller.com/pt/products/shein/edit/*`
2. Clique com botão direito → **✅ Preencher Medidas** (ou `Alt+Z`)
3. No diálogo que abrir:
   - Selecione a **tabela de medidas** salva
   - Configure a **origem do preço**: Tabela / Último / Definir novo
   - Se "Definir novo", digite o preço em massa e overrides por tamanho
   - Clique em **EXECUTAR**
4. A macro executa:
   - Remapeamento de variantes (se necessário)
   - Preenchimento da guia de tamanhos
   - Descrição do produto
   - Aplicação dos preços especiais

### Multi-Aba

1. No diálogo de medidas, ative o checkbox **"Executar em todas as abas abertas"**
   *(requer dupla confirmação: 1º clique → aviso, 2º clique → ativa)*
2. Clique em EXECUTAR
3. A extensão processará todas as abas de edição abertas automaticamente

### Remapeamento rápido

Clique direito → **🔄 Remapeamento - Remapear Variante**

### Apenas preços

- Clique direito → **💰 Preços - Aplicar Últimos** (ou selecione um preset salvo)
- Ou use `Alt+X` para abrir o diálogo de preços

## Armazenamento

| Chave | Conteúdo |
|---|---|
| `biblioteca` | Tabelas de medidas com descrições e preços vinculados |
| `bibliotecaPrecos` | Presets de preço avulsos |
| `ultimaSelecionada` | Última tabela usada |
| `ultimosPrecos` | Último preço aplicado |

Os dados ficam no `chrome.storage.local` do navegador e podem ser exportados na aba **Preços** do popup.

## Estrutura do Projeto

```
upseller-unificado/
├── manifest.json          — Configuração MV3, permissões, atalhos
├── background.js          — Service worker: menus, atalhos, coordenação multi-aba
├── popup.html             — Popup com abas (CSS inline)
├── popup.js               — Lógica do popup: grid de medidas, biblioteca, preços
│
├── state.js               — Estado global compartilhado
├── common.js              — Utilitários: sleep, esperarElemento, nativeClick...
├── message-router.js      — chrome.runtime.onMessage centralizado
├── main.js                — Entry point: MutationObserver + inicialização
│
├── remapeamento.js        — Automação de variantes: stepSelecionarTamanho, runAutomation...
├── medidas.js             — Overlay "Automatiza Shein" + guia de tamanhos + painel medidas
├── precos.js              — Preço especial: setPrecosCompletos, abrirDialogPrecos
├── editar-massa.js        — Editar em massa: subespecificacaoMassa, setColunaEmMassa...
├── sku.js                 — Gerar SKU em massa + auto-trigger 500ms
├── atributos.js           — Expandir/ler/aplicar atributos customizados
├── cores.js               — Confirmar/copiar cores, traduzir EN→PT
├── imagem.js              — Recortar imagem quadrada + ajustarCoresERecortar
├── overlay.js             — Overlay de progresso (macro) + overlay multi-aba
├── drafts.js              — Atributos em massa na página de drafts
├── injectors.js           — Botões flutuantes injetados na página
│
├── icons/                 — Ícones 16/48/128
└── README.md              — Este documento
```

## Tecnologias

- Chrome Extension Manifest V3
- JavaScript (vanilla)
- `chrome.storage.local` para persistência
- `chrome.tabs.sendMessage` / `chrome.runtime.sendMessage` para comunicação
- `chrome.contextMenus` para menu de contexto
- `chrome.commands` para atalhos de teclado

## Licença

MIT
