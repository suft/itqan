# Itqan / إتقان

A static, mobile-friendly Quran memorization quiz
(guess the surah, guess the next ayah; Regular, Survival, Three Lives and Hafiz modes),
with statistics, recitation audio, a shareable ayah card, Arabic and English UI.

SvelteKit 3 + Svelte 5, `adapter-static`. Settings live in `localStorage`; progress and statistics in IndexedDB.

## Develop

Tooling is managed by [mise](https://mise.jdx.dev) (bun, node).

```
mise run deps      # bun install
mise run dev       # dev server
mise run check     # svelte-check
mise run test      # bun test (domain logic)
mise run build     # static site into build/   (BASE_PATH=/itqan for GitHub Pages)
mise run convert   # regenerate src/lib/data/*.json from the AyahIQ assets
```

## Data and credits

- Quran text: [Tanzil](https://tanzil.net) (Simple, v1.0.2). The text must not be changed; see the
  copyright block in `src/lib/data/quran.json`.
- Recitations: [everyayah.com](https://everyayah.com).
- Mutashabihat: Aswaatul Qurraa.
- Fonts (SIL OFL): Amiri, Amiri Quran, Scheherazade New, Rakkas, Inter. Licences in `static/licenses/`.
