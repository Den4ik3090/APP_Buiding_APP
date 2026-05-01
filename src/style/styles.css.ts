import { createTheme, style } from '@vanilla-extract/css';

// 1. Создаем типизированные переменные (контрастность и цвет через OKLCH)
export const [themeClass, vars] = createTheme({
  color: {
    primary: 'oklch(55% 0.2 260)',
    bg: 'oklch(100% 0 0)',
    text: 'oklch(20% 0.02 240)',
  },
  space: {
    medium: '16px'
  }
});

// 2. Оптимизированный стиль модального окна
export const modalStyle = style({
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: vars.color.bg,
  padding: vars.space.medium,
  borderRadius: '24px',
  // Используем Layer для управления приоритетами (CSS Layers)
  '@layer': {
    components: {
      boxShadow: '0 20px 50px oklch(0% 0 0 / 15%)'
    }
  }
});