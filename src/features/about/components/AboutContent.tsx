import React from 'react';
import styles from '../styles/about.module.scss';

const VERSION = '1.0.0';

interface Feature {
  icon: string;
  title: string;
  desc: string;
}

const FEATURES: Feature[] = [
  {
    icon: '👥',
    title: 'Управление персоналом',
    desc: 'Централизованный реестр сотрудников с фотографиями, должностями и датами инструктажей.',
  },
  {
    icon: '🎓',
    title: 'Отслеживание сертификаций',
    desc: 'Автоматический контроль сроков дополнительных обучений с цветовой индикацией статуса.',
  },
  {
    icon: '✅',
    title: 'Задачи и чек-листы',
    desc: 'Постановка задач с дедлайнами, фотофиксация устранений и контроль исполнения.',
  },
  {
    icon: '📋',
    title: 'Наряды-допуски и предписания',
    desc: 'Реестр нарядов-допусков с продлением, закрытием и журналом аудита. Реестр предписаний с отслеживанием статусов.',
  },
  {
    icon: '📊',
    title: 'Аналитика и отчёты',
    desc: 'Дашборд с графиками, экспорт в CSV и отправка отчётов по организации в Telegram.',
  },
  {
    icon: '🔔',
    title: 'Real-time уведомления',
    desc: 'Моментальное обновление реестров через Supabase Realtime. Уведомления в Telegram-бот.',
  },
];

interface TechGroup {
  label: string;
  color: string;
  items: string[];
}

const TECH_GROUPS: TechGroup[] = [
  {
    label: 'Frontend',
    color: '#3b82f6',
    items: ['React 18', 'TypeScript 5', 'TanStack Query v5', 'React Router v7', 'Tailwind CSS', 'SCSS Modules'],
  },
  {
    label: 'Backend & Database',
    color: '#10b981',
    items: ['Supabase (Postgres)', 'Supabase Auth', 'Row Level Security', 'Edge Functions (Deno)'],
  },
  {
    label: 'Infrastructure',
    color: '#8b5cf6',
    items: ['Supabase Storage', 'Supabase Realtime', 'Telegram Bot API', 'Webpack 5'],
  },
];

export function AboutContent() {
  return (
    <div className={styles['page-wrapper']}>
      <div className={styles['glow-purple']} aria-hidden="true" />
      <div className={styles['glow-blue']} aria-hidden="true" />
      <div className={styles['glow-pink']} aria-hidden="true" />
      <div className={styles['glow-teal']} aria-hidden="true" />
      <div className={styles['noise-overlay']} aria-hidden="true" />

      <div className={styles.container}>
        {/* Hero */}
        <section className={styles.hero} aria-labelledby="about-title">
          <div className={styles['hero-badge']}>
            <span>v{VERSION}</span>
            <span>·</span>
            <span>АО"ПУТЕВИ"УЖИЦЕ</span>
          </div>

          <h1 id="about-title" className={styles['hero-title']}>
            PUTEVI Safety
          </h1>

          <p className={styles['hero-tagline']}>
            Система управления безопасностью и сертификацией персонала
          </p>

          <p className={styles['hero-description']}>
            Цифровая платформа для контроля охраны труда на строительных объектах АО ПУТЕВИ.
            Ведите реестры сотрудников, нарядов-допусков и предписаний, отслеживайте сроки
            обучений и получайте уведомления о нарушениях в режиме реального времени.
          </p>

          <div className={styles['hero-version']}>
            Версия {VERSION} · 2026
          </div>
        </section>

        {/* Features */}
        <section className={styles['features-section']} aria-labelledby="features-heading">
          <h2 id="features-heading" className={styles['section-heading']}>
            Возможности системы
          </h2>

          <div className={styles['features-grid']}>
            {FEATURES.map((feature) => (
              <article key={feature.title} className={styles['feature-card']}>
                <span className={styles['feature-icon']} aria-hidden="true">
                  {feature.icon}
                </span>
                <h3 className={styles['feature-title']}>{feature.title}</h3>
                <p className={styles['feature-desc']}>{feature.desc}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Tech Stack */}
        <section className={styles['tech-section']} aria-labelledby="tech-heading" id="tech-stack">
          <h2 id="tech-heading" className={styles['section-heading']}>
            Технологический стек
          </h2>

          <div className={styles['tech-groups']}>
            {TECH_GROUPS.map((group) => (
              <div key={group.label} className={styles['tech-group']}>
                <p className={styles['tech-group-label']}>{group.label}</p>
                <div className={styles['tech-badges']}>
                  {group.items.map((item) => (
                    <span key={item} className={styles['tech-badge']}>
                      <span
                        className={styles['tech-badge-dot']}
                        style={{ background: group.color }}
                      />
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className={styles['footer-section']}>
          <p className={styles['footer-copyright']}>
            © 2024 АО ПУТЕВИ. Все права защищены.
          </p>
          <nav className={styles['footer-links']} aria-label="Служебные ссылки">
            <a href="#about-title" className={styles['footer-link']}>
              О системе
            </a>
            <a href="#tech-stack" className={styles['footer-link']}>
              Технологии
            </a>
            <a href="#features-heading" className={styles['footer-link']}>
              Функции
            </a>
          </nav>
        </footer>
      </div>
    </div>
  );
}
