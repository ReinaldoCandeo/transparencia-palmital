import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SafeHtml } from "../SafeHtml";

describe("SafeHtml.tsx", () => {
  it("deve neutralizar completamente tags de script e seu conteúdo", () => {
    const malicious = '<p>Olá mundo</p><script>alert("xss")</script><p>Fim</p>';
    const html = renderToStaticMarkup(<SafeHtml html={malicious} />);

    expect(html).not.toContain("<script>");
    expect(html).not.toContain("alert");
    expect(html).toContain("Olá mundo");
    expect(html).toContain("Fim");
  });

  it("deve remover blocos de estilo do Word incluindo seu conteúdo interno", () => {
    const wordHtml = '<style type="text/css">p { color: red; font-family: Calibri; }</style><p>Texto limpo</p>';
    const html = renderToStaticMarkup(<SafeHtml html={wordHtml} />);

    expect(html).not.toContain("<style");
    expect(html).not.toContain("Calibri");
    expect(html).not.toContain("color: red");
    expect(html).toContain("Texto limpo");
  });

  it("deve neutralizar atributos perigosos de eventos (onerror, onload, onclick)", () => {
    const xss = '<p onerror="attack()" onclick="steal()">Clique aqui</p><b onload="run()">Negrito</b>';
    const html = renderToStaticMarkup(<SafeHtml html={xss} />);

    expect(html).not.toContain("onerror");
    expect(html).not.toContain("onclick");
    expect(html).not.toContain("onload");
    expect(html).not.toContain("attack");
    expect(html).toContain("Clique aqui");
    expect(html).toContain("Negrito");
  });

  it("deve neutralizar protocolos perigosos em links (javascript:, data:)", () => {
    const badLinks = '<a href="javascript:alert(1)">Link JS</a><a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">Link Data</a>';
    const html = renderToStaticMarkup(<SafeHtml html={badLinks} />);

    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("data:");
  });

  it("deve permitir links legítimos http/https com target='_blank' e rel seguro", () => {
    const goodLink = '<a href="https://palmital.sp.gov.br/transparencia">Portal Palmital</a>';
    const html = renderToStaticMarkup(<SafeHtml html={goodLink} />);

    expect(html).toContain('href="https://palmital.sp.gov.br/transparencia"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain("Portal Palmital");
  });

  it("deve decodificar entidades HTML de acentuação da língua portuguesa", () => {
    const entities = "<p>Aprova&ccedil;&atilde;o da emenda or&ccedil;ament&aacute;ria &amp; conv&ecirc;nio</p>";
    const html = renderToStaticMarkup(<SafeHtml html={entities} />);

    expect(html).toContain("Aprovação da emenda orçamentária &amp; convênio");
  });

  describe("Blindagens de Hydration do React 19", () => {
    it("deve realizar auto-close de <p> quando encontrar elemento de bloco aninhado", () => {
      // No HTML5 / React 19, colocar um <div> dentro de um <p> é inválido e causa hydration mismatch.
      const invalidNesting = "<p>Início do parágrafo<div>Bloco em div</div>Fim</p>";
      const html = renderToStaticMarkup(<SafeHtml html={invalidNesting} />);

      // Garante que o div não está aninhado dentro da tag <p>, ou seja, <p> foi fechado antes do <div>
      expect(html).toContain("<p>Início do parágrafo</p><div>Bloco em div</div>");
      expect(html).toContain("Fim");
    });

    it("deve injetar automaticamente <tbody> quando <tr> for inserido diretamente em <table>", () => {
      // Tabelas sem <tbody> explícito geram erros de hidratação no React 19.
      const tableWithoutTbody = "<table><tr><td>Célula 1</td><td>Célula 2</td></tr></table>";
      const html = renderToStaticMarkup(<SafeHtml html={tableWithoutTbody} />);

      expect(html).toContain("<table");
      expect(html).toContain("<tbody>");
      expect(html).toContain("<tr><td>Célula 1</td><td>Célula 2</td></tr>");
      expect(html).toContain("</tbody></table>");
    });

    it("deve ignorar nós de texto vazios dentro de nós estruturais de tabela", () => {
      const tableWithWhitespaces = `
        <table>
          <tr>
            <td>Dado A</td>
          </tr>
        </table>
      `;
      const html = renderToStaticMarkup(<SafeHtml html={tableWithWhitespaces} />);

      expect(html).toContain("Dado A");
      expect(html).toContain("<tbody>");
    });
  });

  it("deve retornar vazio/nulo para conteúdos ausentes ou apenas com espaços", () => {
    expect(renderToStaticMarkup(<SafeHtml html={null} />)).toBe("");
    expect(renderToStaticMarkup(<SafeHtml html={undefined} />)).toBe("");
    expect(renderToStaticMarkup(<SafeHtml html="   " />)).toBe("");
  });
});
