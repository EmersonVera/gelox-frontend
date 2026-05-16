---
name: Gelox Crimson System
colors:
  surface: '#fcf9f9'
  surface-dim: '#dcd9d9'
  surface-bright: '#fcf9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f3'
  surface-container: '#f0eded'
  surface-container-high: '#eae7e7'
  surface-container-highest: '#e4e2e2'
  on-surface: '#1b1b1c'
  on-surface-variant: '#59413d'
  inverse-surface: '#303031'
  inverse-on-surface: '#f3f0f0'
  outline: '#8d706c'
  outline-variant: '#e1bfb9'
  surface-tint: '#b02d21'
  primary: '#7c0202'
  on-primary: '#ffffff'
  primary-container: '#9e2016'
  on-primary-container: '#ffb2a6'
  inverse-primary: '#ffb4a9'
  secondary: '#a93627'
  on-secondary: '#ffffff'
  secondary-container: '#fd735f'
  on-secondary-container: '#6f0903'
  tertiary: '#632924'
  on-tertiary: '#ffffff'
  tertiary-container: '#7f3f39'
  on-tertiary-container: '#ffb2a9'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad5'
  primary-fixed-dim: '#ffb4a9'
  on-primary-fixed: '#410000'
  on-primary-fixed-variant: '#8e130c'
  secondary-fixed: '#ffdad4'
  secondary-fixed-dim: '#ffb4a8'
  on-secondary-fixed: '#410100'
  on-secondary-fixed-variant: '#881e12'
  tertiary-fixed: '#ffdad6'
  tertiary-fixed-dim: '#ffb4ab'
  on-tertiary-fixed: '#3a0a08'
  on-tertiary-fixed-variant: '#71342f'
  background: '#fcf9f9'
  on-background: '#1b1b1c'
  surface-variant: '#e4e2e2'
typography:
  display-xl:
    fontFamily: Manrope
    fontSize: 30px
    fontWeight: '800'
    lineHeight: 36px
    letterSpacing: -0.02em
  title-lg:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '700'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
  data-mono:
    fontFamily: monospace
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-padding: 2rem
  stack-gap: 2rem
  element-gap: 1rem
  sidebar-width: 16rem
---

## Brand & Style
The brand personality is **Corporate Modern with a Bold Gastronomic Edge**. It balances the reliability required for logistics and inventory management with the vibrant energy of the food and beverage industry. 

The design style utilizes a **Refined Material** approach: it leverages deep tonal shifts, high-quality typography, and subtle shadows to create a workspace that feels efficient yet premium. The emotional response is one of organized control, using a "Crimson and Zinc" palette to signify urgency in stock management while maintaining a clean, professional atmosphere.

## Colors
The color palette is anchored by **Gelox Red (#9e2016)**, used strategically for primary actions, branding, and critical status indicators. This is supported by a sophisticated "Zinc" neutral scale that moves from a warm off-white surface (#fcf9f9) to deep grays for text and borders.

- **Primary Action**: Use the high-fidelity Crimson for buttons and active navigation states.
- **Surface Strategy**: Employ subtle shifts in gray (#f6f3f3 vs #ffffff) to define content areas rather than heavy borders.
- **Semantic Feedback**: Use high-saturation emerald for positive stock status and a vibrant red-tinted wash for alerts and low-stock warnings.

## Typography
The system uses a dual-font strategy to separate intent. 
- **Manrope** is the "Brand Voice," used for headlines and navigation to provide a modern, geometric, and confident feel. 
- **Inter** is the "Utility Voice," used for all body text, data entries, and inputs to ensure maximum legibility and a systematic, clean appearance.
- **Special Case**: Product codes and numeric identifiers should use a monospace or semi-bold Inter variant to ensure easy scannability in dense tables.

## Layout & Spacing
The layout follows a **Fixed Sidebar + Fluid Content** model. The sidebar remains at a constant 16rem width, while the main content area expands to a maximum of 1280px (7xl) for optimal readability.

- **Grid**: A standard 12-column underlying structure is suggested, though the content naturally falls into a 2:1 ratio (Main Table : Sidebar Stats) on desktop.
- **Rhythm**: Use a 4px (0.25rem) base unit. Standard page margins are 32px (2rem). Internal card padding should be a consistent 24px (1.5rem) to maintain a spacious, professional feel.

## Elevation & Depth
Depth is achieved through **Tonal Layering** rather than aggressive shadows. 
- **Level 0 (Background)**: The base surface is #fcf9f9.
- **Level 1 (Cards)**: White (#ffffff) containers with a very soft `shadow-sm` create the first layer of elevation.
- **Level 2 (Active Elements)**: Elements like the active navigation link use a white background with a shadow to "lift" from the sidebar.
- **Glassmorphism**: The top navigation bar utilizes a backdrop-blur (blur-xl) with 70% opacity to maintain context while scrolling.
- **Call-to-Action**: Primary buttons use a tinted shadow (Shadow Color: Primary @ 20% opacity) to provide a glow effect that signifies importance.

## Shapes
The shape language is consistently **Soft-Rounded**. 
- **Standard Cards**: Use a 1rem (16px) radius for a friendly but modern container feel.
- **Interactive Elements**: Buttons and input fields use a 0.75rem (12px) radius.
- **System Components**: Smaller elements like badges and icon containers use a 0.5rem (8px) radius.
- **Specialty**: Avatars and specific action FABs utilize full pill/circle rounding for distinct visual differentiation.

## Components
- **Buttons**: Primary buttons are high-contrast crimson with white text and a 12px radius. Secondary buttons use a light gray (#e5e2e2) fill with dark text. Both should have a subtle active scale effect (95%).
- **Inputs**: Use a "ghost" style with a light gray background (#f6f3f3) and no border, focusing on a primary-colored ring during interaction.
- **Tables**: Header rows should be distinct with a subtle gray background and bold, uppercase caps labels. Body rows should feature a hover state with a 50% opacity neutral tint.
- **Badges**: Status badges (e.g., "Normal", "Bajo Stock") are pill-shaped with highly desaturated background colors and high-contrast text for maximum accessibility.
- **Navigation**: Sidebar items feature a hover transition that changes text color to primary and background to a light zinc; the active state is white with a shadow.
- **Cards**: All containers should feature a subtle border or a light shadow to distinguish them from the off-white background.