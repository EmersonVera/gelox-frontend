# DESIGN SYSTEM — TailwindCSS

## Brand Identity

La identidad visual del sistema es **Corporate Modern with a Bold Gastronomic Edge**.

El diseño debe sentirse:
- profesional
- moderno
- limpio
- administrativo
- premium
- altamente legible

La interfaz utiliza:
- fondos claros cálidos
- contrastes profundos
- tonos crimson/red como color principal
- sombras suaves
- bordes sutiles
- espaciados amplios
- componentes redondeados

---

# Tailwind Theme Mapping

## Primary Palette

| Token | Hex | Tailwind Equivalent |
|---|---|---|
| Primary | #9e2016 | `bg-red-700` |
| Primary Dark | #7c0202 | `bg-red-800` |
| Secondary | #a93627 | `bg-red-600` |
| Error | #ba1a1a | `bg-red-700` |
| Surface | #fcf9f9 | `bg-zinc-50` |
| Surface Low | #f6f3f3 | `bg-zinc-100` |
| Surface Container | #f0eded | `bg-zinc-200` |
| Border / Outline | #e1bfb9 | `border-zinc-300` |
| Text Primary | #1b1b1c | `text-zinc-900` |
| Text Secondary | #59413d | `text-zinc-600` |

---

# Typography

## Fonts

### Headings
Usar:

```html
font-manrope
```

### Body
Usar:

```html
font-inter
```

---

# Tailwind Typography Classes

## Display XL

```html
text-3xl font-extrabold leading-9 tracking-tight font-manrope
```

## Title LG

```html
text-lg font-bold leading-6 font-manrope
```

## Body MD

```html
text-sm leading-5 font-normal font-inter
```

## Label Caps

```html
text-[11px] uppercase tracking-wider font-bold font-inter
```

---

# Layout

## Main Layout

```html
min-h-screen bg-zinc-50 flex
```

## Sidebar

```html
w-64 bg-zinc-100 border-r border-zinc-200
```

## Main Content

```html
flex-1 max-w-7xl mx-auto p-8
```

---

# Spacing System

| Uso | Tailwind |
|---|---|
| Page Padding | `p-8` |
| Card Padding | `p-6` |
| Element Gap | `gap-4` |
| Section Gap | `gap-8` |
| Stack Vertical | `space-y-6` |

---

# Rounded System

| Uso | Tailwind |
|---|---|
| Small | `rounded` |
| Default | `rounded-lg` |
| Medium | `rounded-xl` |
| Large Cards | `rounded-2xl` |
| Pills / Avatars | `rounded-full` |

---

# Elevation & Shadows

## Base Cards

```html
bg-white shadow-sm border border-zinc-200
```

## Elevated Active Elements

```html
shadow-md
```

## Primary Glow

```html
shadow-lg shadow-red-700/20
```

---

# Components

# Buttons

## Primary Button

```html
bg-red-700 hover:bg-red-800 text-white rounded-xl px-4 py-2 transition-all duration-200 active:scale-95 shadow-lg shadow-red-700/20
```

## Secondary Button

```html
bg-zinc-200 hover:bg-zinc-300 text-zinc-900 rounded-xl px-4 py-2 transition-all duration-200 active:scale-95
```

## Danger Button

```html
bg-red-600 hover:bg-red-700 text-white rounded-xl px-4 py-2
```

---

# Inputs

## Default Input

```html
bg-zinc-100 border border-transparent focus:border-red-700 focus:ring-2 focus:ring-red-700/20 rounded-xl px-4 py-3 outline-none transition-all duration-200 text-zinc-900 placeholder:text-zinc-500
```

## Input Error

```html
border-red-600 focus:ring-red-600/20
```

---

# Labels

```html
text-sm font-medium text-zinc-700 mb-2
```

# Error Messages

```html
text-sm text-red-600 mt-1
```

---

# Cards

## Standard Card

```html
bg-white border border-zinc-200 rounded-2xl shadow-sm p-6
```

## Interactive Card

```html
bg-white border border-zinc-200 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200
```

---

# Tables

## Table Container

```html
bg-white rounded-2xl border border-zinc-200 overflow-hidden
```

## Table Header

```html
bg-zinc-100 text-zinc-700 uppercase text-xs tracking-wider font-bold
```

## Table Row Hover

```html
hover:bg-zinc-100/50 transition-colors
```

---

# Navigation

## Sidebar Item

```html
flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-700 hover:bg-zinc-200 hover:text-red-700 transition-all duration-200
```

## Active Sidebar Item

```html
bg-white text-red-700 shadow-sm font-semibold
```

---

# Badges

## Neutral Badge

```html
bg-zinc-200 text-zinc-800 px-3 py-1 rounded-full text-xs font-semibold
```

## Success Badge

```html
bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-semibold
```

## Warning Badge

```html
bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-semibold
```

---

# Modal Design

## Overlay

```html
fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50
```

## Modal Container

```html
bg-white rounded-2xl shadow-xl border border-zinc-200 p-6 w-full max-w-md
```

---

# Forms

## Form Layout

```html
space-y-6
```

## Two Columns Desktop

```html
grid grid-cols-1 md:grid-cols-2 gap-6
```

---

# Avatar Styles

## Profile Image

```html
w-24 h-24 rounded-full object-cover border-4 border-white shadow-md
```

---

# Responsive Rules

## Mobile First

Todo debe implementarse mobile-first usando:
- `sm:`
- `md:`
- `lg:`
- `xl:`

## Responsive Containers

```html
px-4 sm:px-6 lg:px-8
```

---

# Animations

## Standard Transition

```html
transition-all duration-200
```

## Hover Lift

```html
hover:-translate-y-0.5
```

---

# Glassmorphism Navbar

```html
backdrop-blur-xl bg-white/70 border-b border-zinc-200
```

---

# General Rules

## SIEMPRE

- usar TailwindCSS
- usar componentes reutilizables
- usar diseño responsive
- mantener espaciados consistentes
- usar sombras suaves
- usar transiciones suaves
- usar rounded-xl o rounded-2xl
- mantener accesibilidad visual

## NUNCA

- usar estilos inline
- usar colores fuera del sistema
- usar bordes negros fuertes
- usar sombras agresivas
- usar tamaños inconsistentes
- usar alert()
- romper consistencia visual

---

# Visual Direction

La UI debe sentirse:
- elegante
- administrativa
- moderna
- premium
- limpia
- suave
- altamente usable

Inspiración visual:
- Linear
- Notion
- Stripe Dashboard
- Vercel Dashboard
- Material 3 refinado
