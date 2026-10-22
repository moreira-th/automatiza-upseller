---
name: renomear-cores-camisetas
description: >
  Renomear arquivos 01.jpg ate 12.jpg (ou .jpeg) em pastas de produto Shein/Alex.
  Use quando o usuario pedir para renomear imagens de cores de camiseta,
  organizar fotos por cor, ou padronizar nomes de arquivos em pasta de produto.
  Tambem ative se o usuario mencionar pastas como 021-MY, 023-MY, 024-6W, 022-AP
  com arquivos numerados.
---

# Renomear Cores de Camisetas

Usa **Qwen2.5-VL-3B** (VLM local via Ollama) — ~3.2GB, cabe na VRAM da GTX 1650, inferencia GPU pura.

## Pre-requisitos

- Ollama rodando (`ollama serve` no startup)
- Modelo `qwen2.5vl:3b` instalado (`ollama pull qwen2.5vl:3b`)

## Fluxo

1. Rodar o script Python (mais rapido, sem overhead MCP):
   ```
   python C:\Users\Thales\renomeia_cores.py "D:\path\pasta"
   ```
2. O script tenta extrair cor do nome do arquivo (atalho), fallback pra VLM
3. Mapeia ingles → portugues, lida com duplicatas por angulo, renomeia

## Cores (mapeamento ingles → portugues)

White→Branco, Black→Preto, Navy→Azul Marinho, Royal→Azul Royal, Gray/Cinza, Brown→Marrom, Beige/Tan→Bege, Red→Vermelho, Pink→Rosa, Purple→Roxo, Yellow→Amarelo, Green→Verde, Orange→Laranja, Burgundy→Bordo, Light Blue→Azul Bebe

## Regras

- NUNCA Read tool em imagem — sempre VLM ou script
- NUNCA usar numero original no nome final
- Usar espacos no nome da cor, sem espaco antes do traco: `Azul Marinho-01.jpeg`
- Caminho padrao Alex: `D:\DOWNLOADS\1 PROJETOS\ALEX\Camiseta\MENINO\`
- Caminho padrao Shein: `D:\DOWNLOADS\1 PROJETOS\MATHEUS SOARES\SHEIN\`

## Exemplos

```
Branco-01.jpeg
Azul Marinho-01.jpeg
Azul Marinho-02.jpeg
Amarelo-01.jpeg
```

## Regras

- Analises em paralelo (batch unico)
- NUNCA Read tool em imagem — sempre `vision-tool_analyze_image`
- NUNCA usar numero original no nome final
- Usar espacos no nome da cor, sem espaco antes do traco: `Azul Marinho-01.jpeg`
- Renomear com `Rename-Item -LiteralPath "origem" -NewName "novo-nome"`
- Caminho padrao Alex: `D:\DOWNLOADS\1 PROJETOS\ALEX\Camiseta\MENINO\`
- Caminho padrao Shein: `D:\DOWNLOADS\1 PROJETOS\MATHEUS SOARES\SHEIN\`
- Mostrar tabela resumo ao final