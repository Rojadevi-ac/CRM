import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { settingsApi } from '../api/crmApi';

export const THEME_TEMPLATES = [
  {
    id: 'classic-blue',
    name: 'Classic Blue',
    description: 'Electric cobalt with sleek indigo gradients',
    primary: '#2563eb',
    secondary: '#4f46e5',
    accent: '#3b82f6',
    previewGradient: 'from-blue-600 to-indigo-600',
    lightBg: '#f8fafc',
    lightCard: '#ffffff',
    lightSidebar: '#ffffff',
    lightBorder: '#e2e8f0',
    lightTextHeading: '#0f172a',
    lightTextBody: '#334155',
    lightTextMuted: '#64748b',
    darkBg: '#090d16',
    darkCard: '#101726',
    darkSidebar: '#0c1322',
    darkBorder: '#1e293b',
    darkTextHeading: '#f8fafc',
    darkTextBody: '#cbd5e1',
    darkTextMuted: '#64748b',
  },
  {
    id: 'modern-indigo',
    name: 'Modern Indigo',
    description: 'Deep violet and electric indigo styling',
    primary: '#6366f1',
    secondary: '#8b5cf6',
    accent: '#818cf8',
    previewGradient: 'from-indigo-500 to-purple-600',
    lightBg: '#faf9fe',
    lightCard: '#ffffff',
    lightSidebar: '#ffffff',
    lightBorder: '#e0e0fc',
    lightTextHeading: '#1e1b4b',
    lightTextBody: '#3730a3',
    lightTextMuted: '#6366f1',
    darkBg: '#0b081c',
    darkCard: '#120f2e',
    darkSidebar: '#0e0b24',
    darkBorder: '#231e54',
    darkTextHeading: '#f5f3ff',
    darkTextBody: '#c7d2fe',
    darkTextMuted: '#818cf8',
  },
  {
    id: 'emerald-business',
    name: 'Emerald Business',
    description: 'High-velocity fintech emerald green',
    primary: '#059669',
    secondary: '#10b981',
    accent: '#34d399',
    previewGradient: 'from-emerald-600 to-teal-600',
    lightBg: '#f4fbf7',
    lightCard: '#ffffff',
    lightSidebar: '#ffffff',
    lightBorder: '#d1fae5',
    lightTextHeading: '#064e3b',
    lightTextBody: '#065f46',
    lightTextMuted: '#059669',
    darkBg: '#04130d',
    darkCard: '#082117',
    darkSidebar: '#061a12',
    darkBorder: '#123d2b',
    darkTextHeading: '#ecfdf5',
    darkTextBody: '#a7f3d0',
    darkTextMuted: '#34d399',
  },
  {
    id: 'slate-pro',
    name: 'Professional Slate',
    description: 'Minimalist industrial monochrome palette',
    primary: '#475569',
    secondary: '#334155',
    accent: '#64748b',
    previewGradient: 'from-slate-700 to-zinc-800',
    lightBg: '#f8fafc',
    lightCard: '#ffffff',
    lightSidebar: '#ffffff',
    lightBorder: '#e2e8f0',
    lightTextHeading: '#0f172a',
    lightTextBody: '#475569',
    lightTextMuted: '#64748b',
    darkBg: '#0b0f17',
    darkCard: '#151d28',
    darkSidebar: '#101720',
    darkBorder: '#273546',
    darkTextHeading: '#f8fafc',
    darkTextBody: '#cbd5e1',
    darkTextMuted: '#94a3b8',
  },
  {
    id: 'minimal-light',
    name: 'Minimal Studio',
    description: 'Pure studio white canvas with sky blue highlights',
    primary: '#0284c7',
    secondary: '#0369a1',
    accent: '#38bdf8',
    previewGradient: 'from-sky-500 to-blue-600',
    lightBg: '#ffffff',
    lightCard: '#f8fafc',
    lightSidebar: '#ffffff',
    lightBorder: '#e2e8f0',
    lightTextHeading: '#0f172a',
    lightTextBody: '#334155',
    lightTextMuted: '#64748b',
    darkBg: '#0d1117',
    darkCard: '#161b22',
    darkSidebar: '#11161d',
    darkBorder: '#30363d',
    darkTextHeading: '#f0f6fc',
    darkTextBody: '#c9d1d9',
    darkTextMuted: '#8b949e',
  },
  {
    id: 'dark-pro',
    name: 'Dark Professional',
    description: 'Deep obsidian stealth palette with electric cyan accents',
    primary: '#06b6d4',
    secondary: '#0284c7',
    accent: '#22d3ee',
    previewGradient: 'from-cyan-500 to-blue-600',
    lightBg: '#f0f9ff',
    lightCard: '#ffffff',
    lightSidebar: '#ffffff',
    lightBorder: '#bae6fd',
    lightTextHeading: '#082f49',
    lightTextBody: '#0369a1',
    lightTextMuted: '#0284c7',
    darkBg: '#020617',
    darkCard: '#091322',
    darkSidebar: '#060d18',
    darkBorder: '#152942',
    darkTextHeading: '#f0f9ff',
    darkTextBody: '#bae6fd',
    darkTextMuted: '#38bdf8',
  },
  {
    id: 'ocean-teal',
    name: 'Ocean Teal',
    description: 'Vibrant Caribbean teal with refreshing aquatic tones',
    primary: '#0d9488',
    secondary: '#14b8a6',
    accent: '#2dd4bf',
    previewGradient: 'from-teal-600 to-emerald-500',
    lightBg: '#f0fdfa',
    lightCard: '#ffffff',
    lightSidebar: '#ffffff',
    lightBorder: '#ccfbf1',
    lightTextHeading: '#134e4a',
    lightTextBody: '#115e59',
    lightTextMuted: '#0d9488',
    darkBg: '#021316',
    darkCard: '#062024',
    darkSidebar: '#04181b',
    darkBorder: '#0f383e',
    darkTextHeading: '#f0fdfa',
    darkTextBody: '#99f6e4',
    darkTextMuted: '#2dd4bf',
  },
  {
    id: 'purple-modern',
    name: 'Purple Modern',
    description: 'Striking royal purple with futuristic neon accents',
    primary: '#9333ea',
    secondary: '#a855f7',
    accent: '#c084fc',
    previewGradient: 'from-purple-600 to-pink-600',
    lightBg: '#faf5ff',
    lightCard: '#ffffff',
    lightSidebar: '#ffffff',
    lightBorder: '#f3e8ff',
    lightTextHeading: '#3b0764',
    lightTextBody: '#581c87',
    lightTextMuted: '#9333ea',
    darkBg: '#0f051c',
    darkCard: '#190a2e',
    darkSidebar: '#130724',
    darkBorder: '#311459',
    darkTextHeading: '#faf5ff',
    darkTextBody: '#e9d5ff',
    darkTextMuted: '#c084fc',
  },
];

export const ACCENT_PRESETS = [
  { name: 'Cobalt Blue', value: '#2563eb' },
  { name: 'Electric Indigo', value: '#6366f1' },
  { name: 'Emerald Green', value: '#059669' },
  { name: 'Ocean Teal', value: '#0d9488' },
  { name: 'Royal Purple', value: '#9333ea' },
  { name: 'Sunset Orange', value: '#ea580c' },
  { name: 'Crimson Rose', value: '#e11d48' },
  { name: 'Graphite Slate', value: '#475569' },
];

function hexToRgb(hex) {
  if (!hex || typeof hex !== 'string') return { r: 37, g: 99, b: 235 };
  let c = hex.replace('#', '').trim();
  if (c.length === 3) c = c.split('').map((x) => x + x).join('');
  const num = parseInt(c, 16);
  if (isNaN(num)) return { r: 37, g: 99, b: 235 };
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function mixColors(hex1, hex2, weight) {
  const c1 = hexToRgb(hex1);
  const c2 = hexToRgb(hex2);
  const r = Math.round(c1.r * weight + c2.r * (1 - weight));
  const g = Math.round(c1.g * weight + c2.g * (1 - weight));
  const b = Math.round(c1.b * weight + c2.b * (1 - weight));
  return `rgb(${r}, ${g}, ${b})`;
}

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [themeMode, setThemeMode] = useState(() => {
    return localStorage.getItem('crm_theme_mode') || 'system';
  });

  const [themeTemplate, setThemeTemplate] = useState(() => {
    return localStorage.getItem('crm_theme_template') || 'classic-blue';
  });

  const [accentColor, setAccentColor] = useState(() => {
    return localStorage.getItem('crm_accent_color') || '#2563eb';
  });

  const [sidebarBehavior, setSidebarBehavior] = useState(() => {
    return localStorage.getItem('crm_sidebar_behavior') || 'expanded';
  });

  const [uiDensity, setUiDensity] = useState(() => {
    return localStorage.getItem('crm_ui_density') || 'comfortable';
  });

  const [borderRadius, setBorderRadius] = useState(() => {
    return localStorage.getItem('crm_border_radius') || 'medium';
  });

  const [customTheme, setCustomTheme] = useState(() => {
    const saved = localStorage.getItem('crm_custom_theme');
    return saved ? JSON.parse(saved) : {
      primary: '#2563eb',
      secondary: '#4f46e5',
      background: '#090d16',
      surface: '#101726',
      sidebar: '#131b2c',
      text: '#f8fafc',
      border: '#1e293b',
    };
  });

  const [isSystemDark, setIsSystemDark] = useState(() => {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Listen to OS dark mode changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => setIsSystemDark(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const isDark = themeMode === 'dark' || (themeMode === 'system' && isSystemDark);

  // Apply complete visual system to DOM in real-time
  const applyThemeToDOM = useCallback(() => {
    const root = document.documentElement;

    // 1. Dark class
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // 2. Active Primary & Secondary
    const activeTpl = THEME_TEMPLATES.find((t) => t.id === themeTemplate) || THEME_TEMPLATES[0];
    let primaryHex = '#2563eb';
    let secondaryHex = '#4f46e5';

    if (themeTemplate === 'custom') {
      primaryHex = customTheme?.primary || '#2563eb';
      secondaryHex = customTheme?.secondary || '#4f46e5';
    } else if (themeTemplate) {
      primaryHex = accentColor || activeTpl?.primary || '#2563eb';
      secondaryHex = activeTpl?.secondary || '#4f46e5';
    }

    // 3. Set dynamic shade palette for Tailwind brand classes
    root.style.setProperty('--color-brand-primary', primaryHex);
    root.style.setProperty('--color-brand-secondary', secondaryHex);

    root.style.setProperty('--color-brand-50', mixColors(primaryHex, '#ffffff', 0.08));
    root.style.setProperty('--color-brand-100', mixColors(primaryHex, '#ffffff', 0.16));
    root.style.setProperty('--color-brand-200', mixColors(primaryHex, '#ffffff', 0.32));
    root.style.setProperty('--color-brand-300', mixColors(primaryHex, '#ffffff', 0.55));
    root.style.setProperty('--color-brand-400', mixColors(primaryHex, '#ffffff', 0.78));
    root.style.setProperty('--color-brand-500', primaryHex);
    root.style.setProperty('--color-brand-600', mixColors(primaryHex, '#000000', 0.88));
    root.style.setProperty('--color-brand-700', mixColors(primaryHex, '#000000', 0.76));
    root.style.setProperty('--color-brand-800', mixColors(primaryHex, '#000000', 0.62));
    root.style.setProperty('--color-brand-900', mixColors(primaryHex, '#000000', 0.45));
    root.style.setProperty('--color-brand-950', mixColors(primaryHex, '#000000', 0.22));

    // 4. Set Theme Canvas, Surfaces, Borders & Typography Variables
    if (themeTemplate === 'custom' && customTheme) {
      root.style.setProperty('--theme-bg-canvas', isDark ? (customTheme.background || '#090d16') : '#f8fafc');
      root.style.setProperty('--theme-bg-card', isDark ? (customTheme.surface || '#101726') : '#ffffff');
      root.style.setProperty('--theme-bg-sidebar', isDark ? (customTheme.sidebar || '#131b2c') : '#ffffff');
      root.style.setProperty('--theme-border-color', isDark ? (customTheme.border || '#1e293b') : '#e2e8f0');
      root.style.setProperty('--theme-text-heading', isDark ? (customTheme.text || '#f8fafc') : '#0f172a');
      root.style.setProperty('--theme-text-body', isDark ? '#cbd5e1' : '#334155');
      root.style.setProperty('--theme-text-muted', isDark ? '#64748b' : '#64748b');
    } else {
      const bgCanvas = isDark ? activeTpl.darkBg : activeTpl.lightBg;
      const bgCard = isDark ? activeTpl.darkCard : activeTpl.lightCard;
      const bgSidebar = isDark ? activeTpl.darkSidebar : activeTpl.lightSidebar;
      const borderColor = isDark ? activeTpl.darkBorder : activeTpl.lightBorder;
      const textHeading = isDark ? activeTpl.darkTextHeading : activeTpl.lightTextHeading;
      const textBody = isDark ? activeTpl.darkTextBody : activeTpl.lightTextBody;
      const textMuted = isDark ? activeTpl.darkTextMuted : activeTpl.lightTextMuted;

      root.style.setProperty('--theme-bg-canvas', bgCanvas);
      root.style.setProperty('--theme-bg-card', bgCard);
      root.style.setProperty('--theme-bg-sidebar', bgSidebar);
      root.style.setProperty('--theme-border-color', borderColor);
      root.style.setProperty('--theme-text-heading', textHeading);
      root.style.setProperty('--theme-text-body', textBody);
      root.style.setProperty('--theme-text-muted', textMuted);
    }

    // 5. Border Radius
    let radiusValue = '1.125rem'; // medium
    if (borderRadius === 'sharp') radiusValue = '0.375rem';
    if (borderRadius === 'rounded') radiusValue = '1.75rem';
    root.style.setProperty('--theme-border-radius', radiusValue);

    // 6. UI Density
    if (uiDensity === 'compact') {
      root.classList.add('density-compact');
    } else {
      root.classList.remove('density-compact');
    }
  }, [themeMode, themeTemplate, accentColor, sidebarBehavior, uiDensity, borderRadius, customTheme, isDark]);

  useEffect(() => {
    applyThemeToDOM();
    localStorage.setItem('crm_theme_mode', themeMode);
    localStorage.setItem('crm_theme_template', themeTemplate);
    localStorage.setItem('crm_accent_color', accentColor);
    localStorage.setItem('crm_sidebar_behavior', sidebarBehavior);
    localStorage.setItem('crm_ui_density', uiDensity);
    localStorage.setItem('crm_border_radius', borderRadius);
    localStorage.setItem('crm_custom_theme', JSON.stringify(customTheme));
  }, [applyThemeToDOM, themeMode, themeTemplate, accentColor, sidebarBehavior, uiDensity, borderRadius, customTheme]);

  // Load server preferences on startup
  const loadUserPreferences = useCallback(async () => {
    const token = localStorage.getItem('crm_token');
    if (!token) return;
    try {
      const res = await settingsApi.getUserPreferences();
      if (res.data.success && res.data.data) {
        const p = res.data.data;
        if (p.theme_mode) setThemeMode(p.theme_mode);
        if (p.theme_template) setThemeTemplate(p.theme_template);
        if (p.accent_color) setAccentColor(p.accent_color);
        if (p.sidebar_behavior) setSidebarBehavior(p.sidebar_behavior);
        if (p.ui_density) setUiDensity(p.ui_density);
        if (p.border_radius) setBorderRadius(p.border_radius);
        if (p.custom_theme) setCustomTheme(p.custom_theme);
      }
    } catch (err) {
      console.warn("Could not sync preferences from server:", err);
    }
  }, []);

  useEffect(() => {
    loadUserPreferences();
  }, [loadUserPreferences]);

  // Save to backend API & state
  const savePreferences = async (newPrefs = {}) => {
    const nextMode = newPrefs.themeMode !== undefined ? newPrefs.themeMode : themeMode;
    const nextTemplate = newPrefs.themeTemplate !== undefined ? newPrefs.themeTemplate : themeTemplate;
    const nextAccent = newPrefs.accentColor !== undefined ? newPrefs.accentColor : accentColor;
    const nextSidebar = newPrefs.sidebarBehavior !== undefined ? newPrefs.sidebarBehavior : sidebarBehavior;
    const nextDensity = newPrefs.uiDensity !== undefined ? newPrefs.uiDensity : uiDensity;
    const nextRadius = newPrefs.borderRadius !== undefined ? newPrefs.borderRadius : borderRadius;
    const nextCustom = newPrefs.customTheme !== undefined ? newPrefs.customTheme : customTheme;

    if (newPrefs.themeMode !== undefined) setThemeMode(newPrefs.themeMode);
    if (newPrefs.themeTemplate !== undefined) setThemeTemplate(newPrefs.themeTemplate);
    if (newPrefs.accentColor !== undefined) setAccentColor(newPrefs.accentColor);
    if (newPrefs.sidebarBehavior !== undefined) setSidebarBehavior(newPrefs.sidebarBehavior);
    if (newPrefs.uiDensity !== undefined) setUiDensity(newPrefs.uiDensity);
    if (newPrefs.borderRadius !== undefined) setBorderRadius(newPrefs.borderRadius);
    if (newPrefs.customTheme !== undefined) setCustomTheme(newPrefs.customTheme);

    const token = localStorage.getItem('crm_token');
    if (token) {
      try {
        const res = await settingsApi.updateUserPreferences({
          theme_mode: nextMode,
          theme_template: nextTemplate,
          accent_color: nextAccent,
          sidebar_behavior: nextSidebar,
          ui_density: nextDensity,
          border_radius: nextRadius,
          custom_theme: nextCustom,
        });
        if (res.data && res.data.success) {
          return { success: true, data: res.data.data };
        }
        return { success: false, message: res.data?.message || 'Failed to save preferences' };
      } catch (err) {
        const errorMsg = err.response?.data?.message || err.message || 'Failed to persist user preferences to backend';
        console.error('Failed to persist user preferences to backend:', errorMsg);
        return { success: false, message: errorMsg };
      }
    }
    return { success: true };
  };

  const toggleTheme = () => {
    const nextMode = isDark ? 'light' : 'dark';
    setThemeMode(nextMode);
    savePreferences({ themeMode: nextMode });
  };

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        setThemeMode,
        themeTemplate,
        setThemeTemplate,
        accentColor,
        setAccentColor,
        sidebarBehavior,
        setSidebarBehavior,
        uiDensity,
        setUiDensity,
        borderRadius,
        setBorderRadius,
        customTheme,
        setCustomTheme,
        savePreferences,
        reloadPreferences: loadUserPreferences,
        isDark,
        theme: isDark ? 'dark' : 'light',
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
