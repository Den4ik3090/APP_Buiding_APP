import { createTheme, createThemeContract } from '@vanilla-extract/css';

// 1. Создаем "скелет" (контракт) переменных
export const vars = createThemeContract({
  color: {
    primary: '',
    bg: '',
    text: '',
  },
  space: {
    medium: ''
  }
});

// 2. Реализация светлой темы (по умолчанию)
export const lightThemeClass = createTheme(vars, {
  color: {
    primary: 'oklch(55% 0.2 260)',
    bg: 'oklch(100% 0 0)',
    text: 'oklch(20% 0.02 240)',
  },
  space: {
    medium: '16px'
  }
});

// 3. Реализация темной темы (тот самый код)
export const darkThemeClass = createTheme(vars, {
  color: {
    primary: 'oklch(70% 0.15 260)',
    bg: 'oklch(15% 0.02 240)',
    text: 'oklch(95% 0.01 240)',
  },
  space: {
    medium: '16px'
  }
});