import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { Colors, DarkColors, type ThemeColors } from '../constants/colors';
import { useSettingsStore } from '../store/useSettingsStore';

const ThemeContext = createContext<ThemeColors>(Colors);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const theme = useSettingsStore((s) => s.theme);

  const colors = useMemo<ThemeColors>(() => {
    if (theme === 'dark') return DarkColors;
    if (theme === 'light') return Colors;
    // 'system' — follow OS preference
    return systemScheme === 'dark' ? DarkColors : Colors;
  }, [theme, systemScheme]);

  return (
    <ThemeContext.Provider value={colors}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeColors {
  return useContext(ThemeContext);
}
