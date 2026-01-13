export const themes = {
  whatsapp: {
    name: "WhatsApp",
    primary: "142 70% 49%", // Green
    primaryForeground: "0 0% 100%",
    secondary: "142 70% 96%",
    accent: "142 70% 49%",
    background: "0 0% 100%",
    foreground: "0 0% 9%",
  },
  messenger: {
    name: "Messenger",
    primary: "214 89% 52%", // Blue
    primaryForeground: "0 0% 100%",
    secondary: "214 89% 96%",
    accent: "214 89% 52%",
    background: "0 0% 100%",
    foreground: "0 0% 9%",
  },
  purple: {
    name: "Dark Purple",
    primary: "271 81% 56%", // Purple
    primaryForeground: "0 0% 100%",
    secondary: "271 81% 96%",
    accent: "271 81% 56%",
    background: "0 0% 100%",
    foreground: "0 0% 9%",
  },
  light: {
    name: "Light Gray",
    primary: "215 16% 47%", // Gray-blue
    primaryForeground: "0 0% 100%",
    secondary: "215 16% 96%",
    accent: "215 16% 47%",
    background: "0 0% 100%",
    foreground: "0 0% 9%",
  },
};

export type ThemeName = keyof typeof themes;

export function applyTheme(themeName: ThemeName) {
  const theme = themes[themeName];
  if (!theme) return;

  const root = document.documentElement;
  root.style.setProperty("--primary", theme.primary);
  root.style.setProperty("--primary-foreground", theme.primaryForeground);
  root.style.setProperty("--secondary", theme.secondary);
  root.style.setProperty("--accent", theme.accent);
  root.style.setProperty("--background", theme.background);
  root.style.setProperty("--foreground", theme.foreground);

  // Save to localStorage
  localStorage.setItem("theme", themeName);
}

export function getStoredTheme(): ThemeName {
  if (typeof window === "undefined") return "whatsapp";
  return (localStorage.getItem("theme") as ThemeName) || "whatsapp";
}
