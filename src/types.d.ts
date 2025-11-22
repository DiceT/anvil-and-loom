import type { AppSettings } from "./lib/settingsStore";



type TapestryNode = {
  type: "folder" | "file";
  name: string;
  path: string;
  children?: TapestryNode[];
};

declare global {
  interface Window {
    settingsAPI?: {
      getSettings: () => Promise<AppSettings>;
      updateSettings: (partial: Partial<AppSettings>) => Promise<AppSettings>;
      subscribe?: (
        callback: (settings: AppSettings) => void
      ) => () => void;
      getAppVersion?: () => Promise<string>;
      chooseTapestriesRoot?: () => Promise<string | null>;
      listTapestries?: () => Promise<string[]>;
      createTapestry?: (name: string) => Promise<{ name: string; path: string }>;
      listTapestryEntries?: () => Promise<TapestryNode[]>;
      readTapestryEntry?: (
        relativePath: string
      ) => Promise<{ path: string; content: string }>;
      createTapestryFolder?: (payload: {
        parentPath: string;
        folderName: string;
      }) => Promise<{ path: string; name: string }>;
      createTapestryEntry?: (payload: {
        parentPath: string;
        entryName: string;
      }) => Promise<{ path: string; name: string }>;
      renameTapestryPath?: (payload: {
        path: string;
        newName: string;
      }) => Promise<{ path: string; type: "file" | "folder" }>;
      deleteTapestryPath?: (payload: { path: string }) => Promise<void>;
      saveTapestryEntry?: (payload: {
        path: string;
        content: string;
      }) => Promise<{ path: string }>;
      devSaveTableJson?: (payload: { type: "aspect" | "domain"; name: string; json: string }) => Promise<{ ok: boolean; path: string } | { ok: false; error: string }>;
      listTables?: () => Promise<TableDescriptor[]>;
      getTableById?: (id: string) => Promise<any>;
    };
  }
}

export interface TableDescriptor {
  id: string;                // unique per subtable (e.g. "Domain:Catacombs:Objectives")
  name: string;              // full label, e.g. "Catacombs: Objectives"
  category?: string;         // "Aspect" | "Domain" | ...
  oracle_type?: string;      // "Objectives" | "Atmosphere" | "Banes" | ...
  tags?: string[];
  sourcePath: string;

  // NEW: parent branch for the tree view: "Blighted", "Catacombs", etc.
  parentName?: string;       // e.g. "Catacombs"
}
export {};
