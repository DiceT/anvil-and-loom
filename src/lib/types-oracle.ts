export interface AISettings {
  oracleName: string;
  oraclePersonaId: "loomwright" | "archivist" | "trickster" | "veilkeeper" | "harrower" | "architect";
  model: string;
  temperature: number;
}

export interface OracleResultCardPayload {
  tableId: string;
  tableName: string;
  roll: number;
  resultText: string;
  tags: string[];
  sourcePath: string;
}

export interface EntryOracleSnapshot {
  entryId: string;
  title?: string;
  oracleResults: OracleResultCardPayload[];
}
