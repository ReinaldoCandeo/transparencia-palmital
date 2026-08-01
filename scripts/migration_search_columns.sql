-- Migration: Adiciona colunas de busca planas à tabela processos_emendas
-- Executar no Supabase SQL Editor

ALTER TABLE processos_emendas
  ADD COLUMN IF NOT EXISTS search_autores   TEXT,
  ADD COLUMN IF NOT EXISTS search_esfera    TEXT,
  ADD COLUMN IF NOT EXISTS search_categoria TEXT,
  ADD COLUMN IF NOT EXISTS search_ano       SMALLINT;

-- Índice GIN para busca textual full-text nos autores (suporta partial match sem ILIKE)
CREATE INDEX IF NOT EXISTS idx_pe_search_autores
  ON processos_emendas USING gin(to_tsvector('portuguese', coalesce(search_autores, '')));

-- Índices B-Tree simples para filtros exatos
CREATE INDEX IF NOT EXISTS idx_pe_search_esfera    ON processos_emendas (search_esfera);
CREATE INDEX IF NOT EXISTS idx_pe_search_categoria ON processos_emendas (search_categoria);
CREATE INDEX IF NOT EXISTS idx_pe_search_ano       ON processos_emendas (search_ano);
