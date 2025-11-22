/**
 * Type definitions for Oracle AI functionality.
 */

/**
 * Payload for a single table roll result.
 * This structure is emitted by TablesPane and logged into entries.
 */
export interface OracleResultCardPayload {
  /** Unique table identifier */
  tableId: string;
  /** Human-readable table name */
  tableName: string;
  /** The d100 roll value (1-100) */
  roll: number;
  /** The result text from the table row */
  resultText: string;
  /** Tags associated with this table (for categorization) */
  tags: string[];
  /** File path where this table is defined */
  sourcePath: string;
}

/**
 * Snapshot of all oracle results for a single journal entry.
 * This is passed to the AI oracle for interpretation.
 */
export interface EntryOracleSnapshot {
  /** ID of the entry being interpreted */
  entryId: string;
  /** Optional title of the entry */
  title?: string;
  /** All oracle table results rolled for this entry */
  oracleResults: OracleResultCardPayload[];
}
