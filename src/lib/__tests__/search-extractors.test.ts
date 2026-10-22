import { describe, it, expect } from "vitest";
import {
  removeAcentos,
  extractAnoEmenda,
  extractSearchCnpj,
  extractSearchValorGlobal,
  isAnexoSensivel,
  extractSearchCategoria,
} from "../search-extractors";

describe("search-extractors.ts", () => {
  describe("removeAcentos", () => {
    it("deve remover acentuação e converter para minúsculas", () => {
      expect(removeAcentos("São João da Boa Vista")).toBe("sao joao da boa vista");
      expect(removeAcentos("EMENDA PARLAMENTAR À SAÚDE")).toBe("emenda parlamentar a saude");
    });

    it("deve converter símbolos ordinais para caracteres alfanuméricos", () => {
      expect(removeAcentos("1º Distrito")).toBe("1o distrito");
      expect(removeAcentos("2ª Parcela")).toBe("2a parcela");
    });

    it("deve remover espaços no início e no fim", () => {
      expect(removeAcentos("   Texto com Espaços   ")).toBe("texto com espacos");
    });
  });

  describe("extractAnoEmenda", () => {
    it("deve extrair ano prioritário de 'Ano de Execução'", () => {
      const formData = [
        { label: "Ano de Execução", valor: "2024" },
        { label: "Outro Campo", valor: "Teste" },
      ];
      expect(extractAnoEmenda(formData)).toBe(2024);
    });

    it("deve extrair ano de 'Exercício'", () => {
      const formData = [{ label: "Exercício", valor: "2025" }];
      expect(extractAnoEmenda(formData)).toBe(2025);
    });

    it("deve extrair ano de fallback 'Ano da Emenda'", () => {
      const formData = [{ label: "Ano da Emenda", valor: "2023" }];
      expect(extractAnoEmenda(formData)).toBe(2023);
    });

    it("deve extrair ano do texto livre quando ausente no formulário", () => {
      const conteudo = "Processo administrativo referente ao exercício de 2022 para repasse.";
      expect(extractAnoEmenda([], conteudo)).toBe(2022);
    });

    it("deve retornar null se nenhum ano válido for identificado", () => {
      expect(extractAnoEmenda([])).toBeNull();
      expect(extractAnoEmenda([], "Texto genérico sem referência a anos")).toBeNull();
    });
  });

  describe("extractSearchCnpj", () => {
    it("deve extrair e normalizar CNPJ com pontuação para apenas dígitos", () => {
      const formData = [{ label: "CNPJ da Unidade", valor: "44.543.981/0001-99" }];
      expect(extractSearchCnpj(formData)).toBe("44543981000199");
    });

    it("deve manter CNPJ que já venha sem formatação", () => {
      const formData = [{ label: "CNPJ Beneficiária", valor: "44543981000199" }];
      expect(extractSearchCnpj(formData)).toBe("44543981000199");
    });

    it("deve retornar string vazia caso o campo não exista", () => {
      expect(extractSearchCnpj([])).toBe("");
    });
  });

  describe("extractSearchValorGlobal", () => {
    it("deve converter valor formatado em padrão monetário brasileiro", () => {
      expect(extractSearchValorGlobal("R$ 15.000,00")).toBe(15000);
      expect(extractSearchValorGlobal("1.500.250,50")).toBe(1500250.5);
    });

    it("deve lidar com cascas de banana (milhar sem centavos)", () => {
      expect(extractSearchValorGlobal("15.000")).toBe(15000);
      expect(extractSearchValorGlobal("250.000")).toBe(250000);
    });

    it("deve suportar valores negativos", () => {
      expect(extractSearchValorGlobal("-10.500,00")).toBe(-10500);
    });

    it("deve retornar 0 para entradas nulas, indefinidas ou inválidas", () => {
      expect(extractSearchValorGlobal(null)).toBe(0);
      expect(extractSearchValorGlobal(undefined)).toBe(0);
      expect(extractSearchValorGlobal("texto-invalido")).toBe(0);
    });
  });

  describe("isAnexoSensivel (LGPD com Anti-Falso Positivo)", () => {
    it("deve censurar anexos com documentos pessoais diretos", () => {
      expect(isAnexoSensivel("Documento_RG_frente.pdf")).toBe(true);
      expect(isAnexoSensivel("cpf_digitalizado.pdf")).toBe(true);
      expect(isAnexoSensivel("CNH_motorista.png")).toBe(true);
      expect(isAnexoSensivel("certidao_obito.pdf")).toBe(true);
      expect(isAnexoSensivel("holerite_servidor.pdf")).toBe(true);
      expect(isAnexoSensivel("titulo de eleitor.pdf")).toBe(true);
      expect(isAnexoSensivel("Dados sensíveis do requerente.docx")).toBe(true);
    });

    it("não deve gerar falsos positivos para nomes de empresas ou comprovantes operacionais", () => {
      expect(isAnexoSensivel("comprovante_cpfl_energia.pdf")).toBe(false);
      expect(isAnexoSensivel("projeto_executivo_reforma.pdf")).toBe(false);
      expect(isAnexoSensivel("plano_de_trabalho_entidade.pdf")).toBe(false);
      expect(isAnexoSensivel("oficio_solicitacao_repasse.pdf")).toBe(false);
    });

    it("deve retornar false para entradas vazias", () => {
      expect(isAnexoSensivel(null)).toBe(false);
      expect(isAnexoSensivel(undefined)).toBe(false);
      expect(isAnexoSensivel("")).toBe(false);
    });
  });

  describe("extractSearchCategoria", () => {
    it("deve mapear ID de assunto para as categorias correspondentes", () => {
      expect(extractSearchCategoria(1915747)).toBe("saude");
      expect(extractSearchCategoria(1915780)).toBe("obras");
      expect(extractSearchCategoria(1915789)).toBe("agricultura");
      expect(extractSearchCategoria(1915782)).toBe("educacao");
      expect(extractSearchCategoria(1915739)).toBe("terceiro_setor");
      expect(extractSearchCategoria(9999999)).toBe("outros");
    });
  });
});
