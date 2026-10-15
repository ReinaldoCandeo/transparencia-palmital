import React from "react";

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
 * Converte HTML bruto da 1Doc em árvore de nós seguros.
 */
function parseHtmlToAst(rawHtml: string): AstNode[] {
  const cleanHtml = removeUnsafeBlocks(rawHtml);
  const rootNodes: AstNode[] = [];
  const stack: AstElement[] = [];

  const getCurrentChildren = (): AstNode[] => {
    return stack.length > 0 ? stack[stack.length - 1].children : rootNodes;
  };

  const tagRegex = /<\/?([a-zA-Z0-9]+)(\s[^>]*)?\/?>/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(cleanHtml)) !== null) {
    const textBefore = cleanHtml.slice(lastIndex, match.index);
    if (textBefore) {
      const decoded = decodeHtmlEntities(textBefore);
      if (decoded) {
        getCurrentChildren().push({ type: "text", text: decoded });
      }
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
    const decoded = decodeHtmlEntities(remainingText);
    if (decoded) {
      getCurrentChildren().push({ type: "text", text: decoded });
    }
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
    <div className={className}>
      {ast.map((node, index) => renderAstNode(node, index))}
    </div>
  );
}
