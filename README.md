# Carousel Studio: first-time user flow

A redesign of the first-run flow in the Carousel Studio Canva app, built only with the Canva App UI Kit (`@canva/app-ui-kit` 5.14.3). New users get credits before the paid step, inside Canva, and the Pro offer appears on the finished carousel.

## What is in this folder

| File | What it is |
| --- | --- |
| `Carousel Studio FTUE.html` | The working prototype in one file. Double-click to open it in a browser. No install. |
| `App.tsx` | The source to drop into the dev app. |
| `preview/` | The local project used to build and check it (Vite + React). |

**Live prototype:** https://carousel-studio-ftue.vercel.app (opens on the newest version; switch with the dropdown at the top right)

## Five versions

A dropdown at the top right of the prototype switches between them. It opens on the newest.

| Version | How credits work |
| --- | --- |
| V5 - Template quick pick | V4, plus a Templates row at the top of Create: a sideways-scrolling quick pick and See all, the way Canva shows templates. Picking a template opens it on the canvas. Details below. |
| V4 - Credit limit paywall flow | Every user starts with 0 credits and the app does not say so. Review offers one button, Start free trial, which goes straight to checkout on the website. Details below. |
| V3 - Credits straight away, prompt for Pro after | Every user starts on the Free plan with 15 credits and can create a design without signing in. When they run low or cannot afford a design, the account row, the Review button and the success screen all point to upgrading to Pro (pricing page). |
| V2 - Credits straight away, prompt for Google after | Every user starts on the Free plan with 15 credits and can create a design without signing in. When they run low or cannot afford a design, the account row, the Review button and the success screen all point to connecting Google for 50 more. After connecting, the Pro upgrade takes over. |
| V1 - No credits until login | Credits arrive only when the user connects Google (50). The home screen leads with the claim offer and Review asks the user to log in before creating. |

In code: `CarouselStudio` takes `version="v5"` (default), `"v4"`, `"v3"`, `"v2"` or `"v1"`. Starter credits are `V2_START_CREDITS`.

### V5 in detail

Same credits and checkout as V4. On Create, above the topic box:
- **Templates row:** kit `Carousel` of `ImageCard`s (the first 6 templates), with the kit's own scroll arrows, and a See all `LinkButton`.
- **See all** (`?step=templates`): `SurfaceHeader` back, a search `TextInput` and every template in a two-column `Grid`. Picking a template keeps the user on this screen, like Canva.
- **Pick:** the card shows as selected and the app calls `onOpenTemplate(template)`. The preview's canvas (a blank Instagram portrait page) shows a loader, then the template. In the app, `openTemplateInDesign` in `App.tsx` is the TODO: add the template's pages to the design with the Canva Apps SDK.
- **Theme** (every version; on Create, Customize and Review, one shared theme): five preset themes as kit `Swatch`es (background, text, accent), with the picked template's own look first; the three colours as kit `ColorSelector`s; Heading font and Body font `Select`s (8 Google Fonts). Any edit makes the theme "Custom". The app reports it through `onThemeChange(theme)`; the preview canvas restyles the open template live. In the app, `applyThemeToDesign` in `App.tsx` is the TODO (restyle the design, send the theme with generation).
- The template art is stand-in artwork drawn from a theme (`preview/src/templateArt.ts`). `npm run templates` writes the thumbnails (`preview/public/templates/*.svg`) and checks `App.tsx` agrees with it.
- The real template list and thumbnails come from the backend.

### V4 in detail

The credit limit is where trials come from, so V4 sends users there with as little friction as possible.

1. **Create:** no credit row and no credit costs in the AI model picker. Generate outline is free.
2. **Review:** the only button is Start free trial, with "Uses 12 Carousel Studio credits." underneath.
3. **Canva's leave dialog:** "You are about to leave Canva. Carousel Studio wants to open https://carouselstudio.design/trial/7Kx2Qp in a new tab." Cancel keeps the user on Review. Continue opens checkout in a new tab.
4. **Waiting screen:** "Finish checkout in the new tab", with Reopen checkout and Cancel.
5. **Back on Review** with the outline kept: "Your Pro trial has started. 50 credits added." and Create design.

The main button (Generate outline on Create; Start free trial or Create design on Review) is pinned to the bottom of the panel and everything above it scrolls, so it is always visible however short the panel is.

The leave dialog is drawn by Canva, not the app, every time the app opens a link; the prototype draws a copy so the flow can be seen outside Canva. Today the app's pricing link carries the login token (`/pricing?user_token=eyJ...`), so the dialog fills with a wall of characters. V4 uses a short link instead (`TRIAL_URL`).

## 1. Open the prototype

Double-click `Carousel Studio FTUE.html`. It opens as the Carousel Studio side panel and every button works.

Flows to try from the start screen:

- **V1, claim first:** Claim free credits, then Connect. You return to the home screen logged in and the 50 credits count in.
- **V4, straight to checkout:** type a topic (or Inspire me), Generate outline, then Start free trial on Review. Canva's leave dialog shows the short checkout link (Cancel keeps you on Review); Continue opens checkout in a new tab and the panel waits; I've started my trial (stands in for the backend confirming the trial) returns you to Review with the credits added.
- **V3, create first:** type a topic, Generate outline, Create design on the 15 starter credits. With 3 credits left, the home screen and Review offer Upgrade for more credits.
- **V2, create first:** type a topic, Generate outline, Create design on the 15 starter credits. The success screen and the home screen then offer 50 more for connecting Google.
- **V1, create first:** type a topic (or use Inspire me), Generate outline, then on Review press Log in to create design, Connect, and you return to Review with the credits added. Create design takes you to the success screen with the Pro offer.

To open a state directly, add one of these to the end of the file's address in the browser bar (add `&v=1`, `&v=2` or `&v=3` for an older version):

| Add | Shows |
| --- | --- |
| `?plan=free` | Logged in, Free plan |
| `?plan=free&credits=8` | Free, running low (Get 500 credits with Pro) |
| `?plan=pro` | Logged in, Pro plan |
| `?plan=pro&credits=32` | Pro, running low (Purchase extra credits) |
| `?step=checkout` | V4 waiting for checkout |
| `?step=templates` | V5 See all templates |
| `?step=connect` | Connect screen |
| `?step=review` | Review, logged out |
| `?step=success&plan=free` | Success with the Pro offer |
| `?step=success&plan=pro` | Success for a Pro user |
| `?plan=free&tab=customize` | Customize tab |
| `?plan=free&tab=learn` | Learn tab |
| `?plan=free&step=recent` | Recent carousels |

Fonts: outside Canva the kit falls back to a system font. Inside Canva it uses Canva Sans.

## 2. Use the code in the dev app

`App.tsx` exports:

- `App`: the app wrapped in `AppUiProvider`, for inside Canva.
- `CarouselStudio`: the panel itself. Optional props: `initialAccount` (`{ plan: "free" | "pro", credits }`), `initialStep`, `initialTab`, `openUrl`.

It uses only kit components and kit icons (`@canva/app-ui-kit/icons`), plus `@canva/platform` for opening links. There is no custom CSS in the app.

Links open in a new tab through `requestOpenExternalUrl`, which returns `completed` or `aborted` (the user can cancel Canva's leave dialog). `openUrl` passes that status back, so V4 only shows the waiting screen after Continue. `@canva/platform` is loaded lazily because it reads the Canva runtime when imported and fails outside Canva.

| Button | Opens |
| --- | --- |
| Upgrade, Get 500 credits with Pro, Start free trial (V1 to V3) | `https://carouselstudio.design/en/pricing` |
| Start free trial, Reopen checkout (V4) | `https://carouselstudio.design/trial/7Kx2Qp` (`TRIAL_URL`) |
| Manage account, Manage plan and credits, Purchase extra credits | `https://carouselstudio.design/en/settings?tab=billing` |

### Modelled locally, to wire to the real app

- Connect: the prototype logs in straight away. In the app this is the Google connect.
- Account state: plan and credit balance come from the backend (`initialAccount` is the hook for it).
- Credits: 50 on connect. V2 and V3 start every user on 15; V4 starts on 0. The trial adds 50 (`TRIAL_CREDITS`). The Review line uses a render cost of 12 (`RENDER_COST`).
- Running-low thresholds: Free under 12 credits, Pro under 50 (`PRO_LOW_CREDITS`).
- Recently created: sample data for logged-in users, hidden when the list is empty.
- V4 trial detection: the waiting screen's "I've started my trial" button stands in for the app learning the trial has started (checking the account, or a webhook).
- V4 short link: `/trial/7Kx2Qp` stands for a one-time code from the backend; the website swaps it for the user's session and redirects to the trial checkout.
- Outline and design generation: timed placeholders. The progress bar value is fixed.
- Theme: the Theme field is a placeholder box until the real theme picker goes in.
- Publish, Shuffle colors and Share feedback are not connected.

### Open questions

1. AI model cost: the selector shows 1 to 5 credits per model. How does that combine with the design cost, and should Review show one total?
2. Credits on cancel: should credits be taken only when the design is created, so Cancel costs nothing?
3. Theme picker: which component from the current app should replace the placeholder?
4. V4: can the app detect a started trial by itself, so the waiting screen moves on without a button? Can checkout send the user back to Canva?
5. V4: can the backend issue a short one-time code for the checkout link, so Canva's leave dialog shows a clean URL instead of the login token?

## 3. Run the source

```bash
cd preview
npm install --legacy-peer-deps
npm run dev            # http://localhost:5188
npm run typecheck
npm run build:single   # rebuilds the one-file prototype into preview/dist-single/index.html
```

### Automated checks

With the dev server running (or pass the live URL as the second argument):

```bash
node qa/v4-walk.mjs out/walk                 # full V4 flow, real clicks, screenshot per step
node qa/theme-after-dialog.mjs out/theme     # kit colours survive the leave-Canva dialog
node qa/v5-templates.mjs out/templates       # V5 template row, theme (presets, colours, fonts), See all, search, canvas
```

Both need Chrome (set `CHROME` to its path if it is not the default Windows install). Look at the screenshots too; a pass only covers what the script asserts.

`AppUiProvider` only works inside Canva, so the local preview (`preview/src/main.tsx`) wraps the app in the kit's `TestAppUiProvider` and draws stand-ins for Canva's own UI: the panel header, the editor canvas and the leave-Canva dialog. `preview/src/App.tsx` is the same file as `App.tsx` at the top level.
