# UpSeller Moreira

Extensão Chrome para automação de produtos no **UpSeller** — remapeamento de variantes, medidas, descrições, preços, cores, imagem, atributos e SKU em lote.

Feito por [Thales Moreira](https://github.com/moreira-th).

## Estrutura

```
upseller-unificado/
├── manifest.json       — MV3, permissões, atalhos, content_scripts
├── background.js       — Service worker: menus de contexto, multi-aba, upload
├── popup.html / .js    — Popup com abas
├── core.js             — Utilitários + estado global
├── overlay.js          — Overlays de progresso + botões flutuantes
├── extras.js           — SKU, atributos, cores, imagem, drafts
├── automacao.js        — Remapeamento, medidas, preços, editar-massa, message-router
├── entry.js            — MutationObserver + init + atalhos de teclado
└── icons/              — Ícones 16/48/128
```

Arquitetura detalhada: `../AGENTS.md` (na raiz do repositório).

## Instalação

1. `chrome://extensions` → **Modo do desenvolvedor**
2. **Carregar sem compactação** → selecionar esta pasta `upseller-unificado/`

## Comandos

- Validar sintaxe: `node -c arquivo.js`
- Playwright: configurado via `../opencode.json`

## Licença

MIT
