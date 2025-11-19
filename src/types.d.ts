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
    };
  }
}

export {};
