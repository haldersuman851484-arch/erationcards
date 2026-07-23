/**
 * Semantic design tokens — synced from the sibling web artifact (index.css).
 * Brand primary: teal #00afc8  (hsl 190 100% 39%)
 */

const colors = {
  light: {
    // Legacy aliases
    text: '#0b0f1c',
    tint: '#00afc8',

    // Core surfaces
    background: '#ffffff',
    foreground: '#0b0f1c',

    // Cards
    card: '#ffffff',
    cardForeground: '#0b0f1c',

    // Primary action (teal — matches web --primary)
    primary: '#00afc8',
    primaryForeground: '#ffffff',

    // Secondary
    secondary: '#f0f4f8',
    secondaryForeground: '#1a2b4a',

    // Muted
    muted: '#f0f4f8',
    mutedForeground: '#6b7b8e',

    // Accent (light teal tint)
    accent: '#e6f7fb',
    accentForeground: '#006e80',

    // Destructive
    destructive: '#ef4444',
    destructiveForeground: '#ffffff',

    // Borders and inputs
    border: '#dde5ef',
    input: '#dde5ef',
  },

  dark: {
    text: '#f5f8fc',
    tint: '#00c4d6',

    background: '#0b0f1c',
    foreground: '#f5f8fc',

    card: '#131b2e',
    cardForeground: '#f5f8fc',

    primary: '#00c4d6',
    primaryForeground: '#0b0f1c',

    secondary: '#1a2b3f',
    secondaryForeground: '#c8d8e8',

    muted: '#1a2b3f',
    mutedForeground: '#8fa3b8',

    accent: '#0d2f3a',
    accentForeground: '#00c4d6',

    destructive: '#7f1d1d',
    destructiveForeground: '#fca5a5',

    border: '#1a2b3f',
    input: '#1a2b3f',
  },

  // Border radius in px (synced from web --radius: 0.5rem = 8px)
  radius: 8,
};

export default colors;
