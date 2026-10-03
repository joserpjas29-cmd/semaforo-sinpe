/**
 * Esquema de la base.
 *
 * `reportes.telefono` e `ip_hash` son columnas heredadas: ya no se llenan (el teléfono
 * se guarda como HMAC en `telefono_hash` y la IP no se guarda en el reporte). Se dejan
 * en la tabla para no reconstruirla en bases que ya existen; `migrarPrivacidad` las vacía.
 */
export const SENTENCIAS_TABLAS = [
  `CREATE TABLE IF NOT EXISTS reportes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telefono TEXT NOT NULL DEFAULT '',
      telefono_hash TEXT,
      tipo TEXT NOT NULL,
      descripcion TEXT NOT NULL,
      creado_en TEXT NOT NULL,
      ip_hash TEXT,
      es_ejemplo INTEGER NOT NULL DEFAULT 0
    )`,
  `CREATE TABLE IF NOT EXISTS eventos_limite (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      accion TEXT NOT NULL,
      clave TEXT NOT NULL,
      creado_en TEXT NOT NULL
    )`,
  `CREATE TABLE IF NOT EXISTS meta (
      clave TEXT PRIMARY KEY,
      valor TEXT NOT NULL
    )`,
];

/** Van después de la migración: en una base vieja `telefono_hash` todavía no existe antes de ella. */
export const SENTENCIAS_INDICES = [
  `CREATE INDEX IF NOT EXISTS idx_reportes_telefono_hash ON reportes(telefono_hash)`,
  `CREATE INDEX IF NOT EXISTS idx_reportes_creado ON reportes(creado_en)`,
  `CREATE INDEX IF NOT EXISTS idx_eventos_limite ON eventos_limite(accion, clave, creado_en)`,
];

/** Restos del esquema anterior: el índice por teléfono en claro y la tabla de límites por IP. */
export const SENTENCIAS_LIMPIEZA = [
  `DROP INDEX IF EXISTS idx_reportes_telefono`,
  `DROP INDEX IF EXISTS idx_limites_ip`,
  `DROP TABLE IF EXISTS limites`,
];

export const COLUMNA_TELEFONO_HASH = `ALTER TABLE reportes ADD COLUMN telefono_hash TEXT`;
export const META_PRIVACIDAD = "privacidad_v1";
