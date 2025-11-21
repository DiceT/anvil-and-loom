export const appSettingsDefaults = {
  theme: "dark",
  launchOnStartup: false,
  dailyBackupReminder: false,
  activeTapestry: "Prime Chronicle",
  liveSpellcheck: true,
  focusMode: false,
  defaultBodyFont: "Caudex",
  automaticUpdates: true,
  autoLinkTitles: true,
  attachmentFolder: "/tapestries/assets",
  linkStyle: "wiki",
  accentColor: "Gilded Ember",
  highContrastText: false,
  showParchmentTexture: true,
  coreDiceEngine: true,
  coreTapestrySync: true,
  coreLoreAtlas: false,
  tapestriesRoot: "tapestries",
  currentTapestry: "Prime Chronicle",
  diceFadeDurationMs: 3000,
  diceThemeName: "default",
  diceThemeColor: "#ff7f00",
  diceTensThemeColor: "#000000",
  diceTexture: "paper",
  diceScale: 4,
  diceEnableExploding: true,
  diceEnableDegrade: true,
  diceEnablePools: true,
};

export function cloneDefaultSettings() {
  return JSON.parse(JSON.stringify(appSettingsDefaults));
}
