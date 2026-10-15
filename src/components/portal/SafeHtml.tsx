import React from "react";
import { cn } from "@/lib/utils";

/**
 * Mapeamento das entidades HTML nomeadas mais comuns (incluindo acentuação em pt-BR).
 */
const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: "\u00A0",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  copy: "©",
  reg: "®",
  trade: "™",
  bull: "•",
  deg: "°",
  plusmn: "±",
  euro: "€",
  pound: "£",
  yen: "¥",
  cent: "¢",
  // Acentuação da língua portuguesa e latinas
  aacute: "á", Aacute: "Á",
  agrave: "à", Agrave: "À",
  acirc: "â",  Acirc: "Â",
  atilde: "ã", Atilde: "Ã",
  auml: "ä",   Auml: "Ä",
  eacute: "é", Eacute: "É",
  egrave: "è", Egrave: "È",
  ecirc: "ê",  Ecirc: "Ê",
  euml: "ë",   Euml: "Ë",
  iacute: "í", Iacute: "Í",
  igrave: "ì", Igrave: "Ì",
  icirc: "î",  Icirc: "Î",
  iuml: "ï",   Iuml: "Ï",
  oacute: "ó", Oacute: "Ó",
  ograve: "ò", Ograve: "Ò",
  ocirc: "ô",  Ocirc: "Ô",
  otilde: "õ", Otilde: "Õ",
  ouml: "ö",   Ouml: "Ö",
  uacute: "ú", Uacute: "Ú",
  ugrave: "ù", Ugrave: "Ù",
  ucirc: "û",  Ucirc: "Û",
  uuml: "ü",   Uuml: "Ü",
  ccedil: "ç", Ccedil: "Ç",
  ordf: "ª",   ordm: "º",
  laquo: "«",  raquo: "»",
};

/**
 * Decodifica entidades HTML em nós de texto antes de entregá-los ao React,
 * garantindo que strings como &atilde;, &amp; e &#160; sejam exibidas corretamente.
 */
function decodeHtmlEntities(text: string): string {
  if (!text) return "";
  return text
    .replace(/&([a-zA-Z]+);/g, (match, entity) => {
      const lower = entity.toLowerCase();
      return NAMED_ENTITIES[entity] ?? NAMED_ENTITIES[lower] ?? match;
    })
    .replace(/&#(\d+);/g, (match, dec) => {
      try {
        const code = parseInt(dec, 10);
        return code > 0 && code < 0x10ffff ? String.fromCodePoint(code) : match;
      } catch {
        return match;
      }
    })
    .replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => {
      try {
        const code = parseInt(hex, 16);
        return code > 0 && code < 0x10ffff ? String.fromCodePoint(code) : match;
      } catch {
        return match;
      }
    });
}

/** Tags HTML permitidas na renderização segura */
const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "strike",
  "ul",
  "ol",
  "li",
  "blockquote",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "th",
  "td",
  "span",
  "div",
  "hr",
  "a",
  "sub",
  "sup",
]);

/** Elementos de bloco que acionam auto-close em <p> para evitar aninhamento inválido no HTML5/React 19 */
const BLOCK_TAGS = new Set([
  "p",
  "div",
  "ul",
  "ol",
  "table",
  "blockquote",
  "hr",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
]);

/** Tags estruturais de tabela onde nós de texto vazios geram erro de hidratação */
const TABLE_STRUCTURAL_TAGS = new Set(["table", "thead", "tbody", "tfoot", "tr"]);

/** Elementos void (sem tag de fechamento) */
const VOID_TAGS = new Set(["br", "hr"]);

interface AstElement {
  type: "element";
  tag: string;
  props: Record<string, unknown>;
  children: AstNode[];
}

interface AstText {
  type: "text";
  text: string;
}

type AstNode = AstElement | AstText;

/**
 * Extrai URL segura para links <a>.
 * Rejeita explicitamente javascript:, data:, vbscript: e formatos anômalos.
 */
function extractSafeHref(attrsString?: string): string | null {
  if (!attrsString) return null;
  const match = attrsString.match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
  if (!match) return null;
  const rawHref = (match[1] ?? match[2] ?? match[3] ?? "").trim();
  const lower = rawHref.toLowerCase();
  if (lower.startsWith("http://") || lower.startsWith("https://") || lower.startsWith("mailto:")) {
    return rawHref;
  }
  return null;
}

/**
 * Remove blocos de código/estilo completos (incluindo o conteúdo textual interno)
 * para evitar vazamento de CSS colado do Word ou scripts maliciosos.
 */
function removeUnsafeBlocks(html: string): string {
  return html
    .replace(/<(?:script|style|head|svg|object|iframe|noscript)\b[^>]*>[\s\S]*?<\/(?:script|style|head|svg|object|iframe|noscript)>/gi, "")
    .replace(/<(?:script|style|head|svg|object|iframe|noscript)\b[^>]*\/?>/gi, "");
}

/**
 * Converte HTML bruto da 1Doc em árvore de nós seguros, aplicando regras estritas
 * de aninhamento do HTML5/React 19 para prevenir erros de hidratação.
 */
function parseHtmlToAst(rawHtml: string): AstNode[] {
  const cleanHtml = removeUnsafeBlocks(rawHtml);
  const rootNodes: AstNode[] = [];
  const stack: AstElement[] = [];

  const getCurrentChildren = (): AstNode[] => {
    return stack.length > 0 ? stack[stack.length - 1].children : rootNodes;
  };

  const pushText = (text: string) => {
    if (!text) return;
    const decoded = decodeHtmlEntities(text);
    if (!decoded) return;

    const currentParent = stack.length > 0 ? stack[stack.length - 1] : null;

    // Ignora nós de texto com apenas espaços em branco dentro de elementos estruturais de tabela
    if (currentParent && TABLE_STRUCTURAL_TAGS.has(currentParent.tag) && !decoded.trim()) {
      return;
    }

    getCurrentChildren().push({ type: "text", text: decoded });
  };

  const tagRegex = /<\/?([a-zA-Z0-9]+)(\s[^>]*)?\/?>/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(cleanHtml)) !== null) {
    const textBefore = cleanHtml.slice(lastIndex, match.index);
    if (textBefore) {
      pushText(textBefore);
    }

    lastIndex = tagRegex.lastIndex;

    const fullTag = match[0];
    const tagName = match[1].toLowerCase();
    const attrsStr = match[2] || "";
    const isClosing = fullTag.startsWith("</");
    const isSelfClosing = fullTag.endsWith("/>") || VOID_TAGS.has(tagName);

    if (isClosing) {
      // Procura a tag correspondente mais próxima na pilha
      const foundIdx = stack.map((item) => item.tag).lastIndexOf(tagName);
      if (foundIdx !== -1) {
        // Desempilha até fechar a tag encontrada
        stack.length = foundIdx;
      }
      continue;
    }

    // Se a tag não for permitida pela whitelist, ignoramos a tag mas o texto interno continua
    if (!ALLOWED_TAGS.has(tagName)) {
      continue;
    }

    // 1. Auto-close de <p>: se abrir uma tag de bloco e houver um <p> aberto, desempilha até o <p>
    if (BLOCK_TAGS.has(tagName)) {
      const pIndex = stack.map((item) => item.tag).lastIndexOf("p");
      if (pIndex !== -1) {
        stack.length = pIndex;
      }
    }

    // 2. Auto-close de <li>: se abrir <li> e o topo da stack for outro <li>, fecha o anterior
    if (tagName === "li" && stack.length > 0 && stack[stack.length - 1].tag === "li") {
      stack.pop();
    }

    // 3. Tabelas válidas no React 19: se abrir <tr> e o pai direto for <table>, insere/reutiliza <tbody>
    if (tagName === "tr") {
      const currentParent = stack.length > 0 ? stack[stack.length - 1] : null;
      if (currentParent && currentParent.tag === "table") {
        let tbodyNode = currentParent.children
          .filter((c): c is AstElement => c.type === "element" && c.tag === "tbody")
          .slice(-1)[0];

        if (!tbodyNode) {
          tbodyNode = {
            type: "element",
            tag: "tbody",
            props: {},
            children: [],
          };
          currentParent.children.push(tbodyNode);
        }
        stack.push(tbodyNode);
      }
    }

    const props: Record<string, unknown> = {};

    if (tagName === "a") {
      const safeHref = extractSafeHref(attrsStr);
      if (safeHref) {
        props.href = safeHref;
        props.target = "_blank";
        props.rel = "noopener noreferrer";
      }
    }

    const elementNode: AstElement = {
      type: "element",
      tag: tagName,
      props,
      children: [],
    };

    getCurrentChildren().push(elementNode);

    if (!isSelfClosing) {
      stack.push(elementNode);
    }
  }

  // Captura qualquer texto restante após a última tag
  const remainingText = cleanHtml.slice(lastIndex);
  if (remainingText) {
    pushText(remainingText);
  }

  return rootNodes;
}

function renderAstNode(node: AstNode, key: string | number): React.ReactNode {
  if (node.type === "text") {
    return node.text;
  }

  const renderedChildren = node.children.map((child, index) =>
    renderAstNode(child, `${node.tag}-${key}-${index}`)
  );

  return React.createElement(
    node.tag,
    { key, ...node.props },
    renderedChildren.length > 0 ? renderedChildren : undefined
  );
}

const DEFAULT_TYPOGRAPHY_CLASSES =
  "leading-relaxed space-y-2 [&_p]:mb-3 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3 [&_li]:mb-1 [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_a]:font-medium [&_blockquote]:border-l-4 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:italic [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-border [&_th]:p-2 [&_th]:bg-muted/50 [&_td]:border [&_td]:border-border [&_td]:p-2";

export interface SafeHtmlProps {
  html?: string | null;
  className?: string;
}

/**
 * Renderizador de HTML seguro e ultraleve para Server Components e Client Components.
 * Não utiliza dangerouslySetInnerHTML, não usa dependências nativas (sem jsdom)
 * e converte dados da 1Doc em nós virtuais protegidos do React.
 */
export function SafeHtml({ html, className }: SafeHtmlProps) {
  if (!html || typeof html !== "string" || !html.trim()) {
    return null;
  }

  const ast = parseHtmlToAst(html);
  if (ast.length === 0) {
    return null;
  }

  return (
    <div className={cn(DEFAULT_TYPOGRAPHY_CLASSES, className)}>
      {ast.map((node, index) => renderAstNode(node, index))}
    </div>
  );
}
