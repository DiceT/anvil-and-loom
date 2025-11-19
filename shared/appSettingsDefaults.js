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
};

export function cloneDefaultSettings() {
  return JSON.parse(JSON.stringify(appSettingsDefaults));
}
