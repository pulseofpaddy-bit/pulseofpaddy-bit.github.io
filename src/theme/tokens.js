export const tokens = {
  font: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  radius: { sm: 10, md: 16, lg: 22, pill: 999 },
  space: { xs: 6, sm: 10, md: 16, lg: 24, xl: 32 },
  tap: 44,
  light: {
    bg: "#f4f1f6",
    bgElevated: "#ffffff",
    text: "#1c1424",
    textMuted: "#6d6478",
    textFaint: "#9a91a6",
    border: "rgba(28, 20, 36, 0.08)",
    accent: "#9d174d",
    accentSoft: "rgba(157, 23, 77, 0.1)",
    nav: "rgba(255, 255, 255, 0.92)",
    danger: "#be123c",
    shadow: "0 1px 2px rgba(28, 20, 36, 0.06), 0 8px 24px rgba(28, 20, 36, 0.06)",
  },
  dark: {
    bg: "#100c16",
    bgElevated: "#1b1524",
    text: "#f7f2fb",
    textMuted: "#b7adc4",
    textFaint: "#8b8298",
    border: "rgba(247, 242, 251, 0.1)",
    accent: "#fb7185",
    accentSoft: "rgba(251, 113, 133, 0.16)",
    nav: "rgba(16, 12, 22, 0.92)",
    danger: "#fb7185",
    shadow: "none",
  },
};

export function palette(isDark) {
  return isDark ? tokens.dark : tokens.light;
}
