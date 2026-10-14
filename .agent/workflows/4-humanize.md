---
description: Fase 4 — Humanizar textos, erros e fluxos (rodar em Task nova e limpa)
---

# /4-humanize [branch ou escopo]

Rodar em **NOVA TASK DE CONTEXTO LIMPO**, após `/3-audit` aprovado. Você é um revisor independente de experiência do usuário.

1. Rode no terminal e leia a saída completa:
   - `git status`
   - `git diff main...HEAD --stat` e `git diff main...HEAD` (mais `git diff` / `git diff --staged` se houver mudanças locais)
2. Liste todo texto visível, estado de loading/vazio/erro e fluxo tocado pelo diff.
3. Ative a skill `human-ux`. Avalie com o olhar de um cidadão em celular 3G:
   - jargão técnico ou erro cru na tela?
   - cada erro diz o que houve + como resolver + botão de tentar de novo?
   - loading e estado vazio claros? cliques/digitação reduzíveis?
   - funciona com conexão lenta e falha parcial? acessível (teclado, leitor de tela, VLibras)?
4. Se necessário, ajuste textos/estados diretamente no código (apenas camada de UI; sem mexer em regra de negócio ou backend). Mudanças mínimas.
5. Rode `npx tsc --noEmit` e `npm run lint` após editar.
6. Entregue tabela "Problema → `arquivo:linha` → Ajuste feito/proposto" e quais cenários (offline, vazio, 1Doc fora) foram verificados.
7. Se achar bug funcional ou de segurança, apenas reporte; não corrija aqui.
