# AI Agent Instructions (AGENTS.md)

Welcome, AI Agent (OpenCode, Copilot, etc.). When you are tasked with assisting in this repository (`Map-projection-visualization`), please adhere to the following strict guidelines and context to ensure your code matches the existing architecture and standards.

## 1. Project Overview & Architecture

This project is a 3D/2D geographical math visualization platform built with **Vue 3, Three.js, and D3.js**.
The core architectural philosophy is **strict decoupling of the 3D WebGL engine and the Vue 2D UI**.

- **`src/App.vue`**: The single source of truth for UI state, drag mode selections, and configuration params (like `globeRotation`, `projectionType`).
- **`src/components/Map2D.vue`**: The D3.js SVG renderer. It listens to props from `App.vue` and `emit`s events when the user interacts with 2D elements (like the secant slider).
- **`src/core/threeApp.js`**: A pure JavaScript module that handles all Three.js WebGL rendering, GSAP animations, and custom GLSL shaders. **IT MUST NOT IMPORT VUE**. It communicates with the UI via callback functions (e.g., `onRotationChange`).

## 2. Core Constraints & Magic Numbers

When writing code for the 3D space (`threeApp.js`), adhere to these specific constants and rules to avoid visual glitches (Z-fighting):
- **Earth Radius (`R_EARTH`)**: Always use `5.0`.
- **Projection Geometries (Cylinder, Cone, Plane)**: Must be rendered slightly larger than the Earth to avoid Z-fighting. Use a multiplier of `1.01` (e.g., `radius = R_EARTH * 1.01`).
- **Euler Angles for Oblique Projections**: The system supports "Rotate Plane" mode (true oblique projections). To implement this mathematically, the rotation is applied inversely to the geographical coordinates using `THREE.Euler('YXZ')`. Look at the `rotateLonLat` function in `threeApp.js`.

## 3. UI Conventions (Minimalist Theme)

The UI was completely refactored to a minimalist, "OpenCode-inspired" theme. Do NOT introduce:
- Heavy drop shadows (use `box-shadow: 0 1px 3px rgba(0,0,0,0.05)` at most).
- Rounded, pill-shaped buttons with gradients.
- Bright, neon colors (except for the `#d92d20` red invariant line).
- Default emojis (use `lucide-vue-next` icons instead).

*Always* use ultra-thin borders (`1px solid #e0e0e0`), stark white/light grey backgrounds, and dark typography (`#333` or `#666`).

## 4. Workflows for Adding New Projections

If asked to add a new projection type, follow these exact 3 steps:

1. **`threeApp.js` (The 3D Math)**:
   - Add a coordinate mapping function (e.g., `lonLatToMyNewShape(lon, lat, R)`).
   - Create a transparent, physical wrapping geometry (e.g., `THREE.CylinderGeometry`).
   - Write custom `onBeforeCompile` vertex shaders in `createUnfoldMaterial` to animate the 3D geometry morphing into a flat plane.
2. **`Map2D.vue` (The 2D Math)**:
   - Update the D3 projection generator logic to support the new mode.
   - You may need to create a custom D3 projection using `d3.geoProjection()` if a native one doesn't exist, applying the exact mathematical inverse of your 3D logic.
3. **`App.vue` (The UI)**:
   - Expose the new projection type in the sidebar tabs.
   - Create any necessary UI controls (sliders, inputs) for the specific projection parameters (like standard parallels).

## 5. Development Reminders

- The Vite build requires precise file paths. Do not introduce spaces in static asset names (e.g., `public/wechat-pay.jpg`).
- When making file edits, prefer exact string replacement over full file rewrites.
- After modifying math logic, verify that the 3D invariant line (red) perfectly matches the 2D invariant line (red) and that they both reflect the `secantLat` mathematically.
- Ensure `npm run build` passes before concluding your task.