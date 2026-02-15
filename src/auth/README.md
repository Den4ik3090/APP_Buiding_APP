# Auth module — Login page (2026)

Production-ready login page: React + TypeScript + Tailwind CSS.

## Where styles are connected

- **Tailwind + auth keyframes:** `src/auth/auth.css` is imported in `src/index.js`.
  - Contains `@tailwind base; @tailwind components; @tailwind utilities;`
  - Plus custom keyframes: `.auth-bg-gradient`, `.auth-blob`, `.auth-motion-reduced`
- **Tailwind config:** `tailwind.config.js` in project root (content: `src/**/*.{js,jsx,ts,tsx}`).
- **PostCSS:** `postcss.config.js` with `tailwindcss` and `autoprefixer`.

## Components

| Component | Purpose |
|-----------|--------|
| `AuthLayout` | Full-screen wrapper + animated background; syncs `dark` class with `prefers-color-scheme`. |
| `AnimatedBackground` | CSS-only gradient + floating blur orbs. |
| `Logo` | Brand block (image or placeholder icon + title + tagline). |
| `TextField` | Accessible input with label, optional left icon, error state. |
| `PasswordField` | Password input with show/hide toggle. |
| `PrimaryButton` | CTA with loading spinner. |
| `LoginCard` | Glass card: form + forgot link + policy + social placeholders. |
| `LoginPage` | Composes AuthLayout + LoginCard; accepts `signIn`, `onSuccess`, `onError`. |

## Usage (no router)

In `App.jsx` when there is no session:

```jsx
import { LoginPage } from "./auth";
import { supabase } from "./supabaseClient";

<LoginPage
  logoSrc={logo}
  onSuccess={() => {}}
  onError={(msg) => addNotification(msg, TOAST_TYPES.ERROR)}
  signIn={async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  }}
/>
```

## Usage with React Router

See `src/pages/Login.example.tsx` for a route example.

## Reduce motion

Pass `reducedMotion={true}` to `LoginPage` or add class `auth-motion-reduced` to the `.auth-page` container to slow and soften the background animation.

## Dark mode

Controlled by system preference: `AuthLayout` toggles `class="dark"` on `<html>` via `prefers-color-scheme: dark`. Tailwind `dark:` classes are used for inputs and card in dark theme.
