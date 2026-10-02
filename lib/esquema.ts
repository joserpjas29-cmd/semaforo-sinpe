export const SENTENCIAS_ESQUEMA = [
  `CREATE TABLE IF NOT EXISTS reportes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telefono TEXT NOT NULL,
      tipo TEXT NOT NULL,
      descripcion TEXT NOT NULL,
      creado_en TEXT NOT NULL,
      ip_hash TEXT,
      es_ejemplo INTEGER NOT NULL DEFAULT 0
    )`,
  `CREATE INDEX IF NOT EXISTS idx_reportes_telefono ON reportes(telefono)`,
  `CREATE INDEX IF NOT EXISTS idx_reportes_creado ON reportes(creado_en)`,
  `CREATE TABLE IF NOT EXISTS limites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ip_hash TEXT NOT NULL,
      creado_en TEXT NOT NULL
    )`,
  `CREATE INDEX IF NOT EXISTS idx_limites_ip ON limites(ip_hash, creado_en)`,
  `CREATE TABLE IF NOT EXISTS meta (
      clave TEXT PRIMARY KEY,
      valor TEXT NOT NULL
    )`,
];
