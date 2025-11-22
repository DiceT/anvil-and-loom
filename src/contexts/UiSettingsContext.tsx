import { createContext, useContext, useState, type ReactNode } from "react";

export interface UiSettings {
  logToEntry: boolean;
}

interface UiSettingsContextValue {
  settings: UiSettings;
  setSettings: React.Dispatch<React.SetStateAction<UiSettings>>;
}

const UiSettingsContext = createContext<UiSettingsContextValue | null>(null);

export function UiSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<UiSettings>({
    logToEntry: true,
  });

  return (
    <UiSettingsContext.Provider value={{ settings, setSettings }}>
      {children}
    </UiSettingsContext.Provider>
  );
}

export function useUiSettings() {
  const ctx = useContext(UiSettingsContext);
  if (!ctx) {
    throw new Error("useUiSettings must be used within UiSettingsProvider");
  }
  return ctx;
}
