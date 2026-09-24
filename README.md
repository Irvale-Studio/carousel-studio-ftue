# Carousel Studio: first-time user flow

A redesign of the first-run flow in the Carousel Studio Canva app, built only with the Canva App UI Kit (`@canva/app-ui-kit` 5.14.3). New users get credits before the paid step, inside Canva, and the Pro offer appears on the finished carousel.

## What is in this folder

| File | What it is |
| --- | --- |
| `Carousel Studio FTUE.html` | The working prototype in one file. Double-click to open it in a browser. No install. |
| `App.tsx` | The source to drop into the dev app. |
| `preview/` | The local project used to build and check it (Vite + React). |

## Three versions

A dropdown at the top right of the prototype switches between them. It opens on the newest.

| Version | How credits work |
| --- | --- |
| V3 - Credits straight away, prompt for Pro after | Every user starts on the Free plan with 15 credits and can create a design without signing in. When they run low or cannot afford a design, the account row, the Review button and the success screen all point to upgrading to Pro (pricing page). |
| V2 - Credits straight away, prompt for Google after | Every user starts on the Free plan with 15 credits and can create a design without signing in. When they run low or cannot afford a design, the account row, the Review button and the success screen all point to connecting Google for 50 more. After connecting, the Pro upgrade takes over. |
| V1 - No credits until login | Credits arrive only when the user connects Google (50). The home screen leads with the claim offer and Review asks the user to log in before creating. |

In code: `CarouselStudio` takes `version="v3"` (default), `"v2"` or `"v1"`. Starter credits are `V2_START_CREDITS`.

## 1. Open the prototype

Double-click `Carousel Studio FTUE.html`. It opens as the Carousel Studio side panel and every button works.

Flows to try from the start screen:

- **V1, claim first:** Claim free credits, then Connect. You return to the home screen logged in and the 50 credits count in.
- **V3, create first:** type a topic, Generate outline, Create design on the 15 starter credits. With 3 credits left, the home screen and Review offer Upgrade for more credits.
- **V2, create first:** type a topic, Generate outline, Create design on the 15 starter credits. The success screen and the home screen then offer 50 more for connecting Google.
- **V1, create first:** type a topic (or use Inspire me), Generate outline, then on Review press Log in to create design, Connect, and you return to Review with the credits added. Create design takes you to the success screen with the Pro offer.

To open a state directly, add one of these to the end of the file's address in the browser bar (add `&v=1` or `&v=2` for an older version):

| Add | Shows |
| --- | --- |
| `?plan=free` | Logged in, Free plan |
| `?plan=free&credits=8` | Free, running low (Get 500 credits with Pro) |
| `?plan=pro` | Logged in, Pro plan |
| `?plan=pro&credits=32` | Pro, running low (Purchase extra credits) |
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

Links open in a new tab through `requestOpenExternalUrl`. `@canva/platform` is loaded lazily because it reads the Canva runtime when imported and fails outside Canva.

| Button | Opens |
| --- | --- |
| Upgrade, Get 500 credits with Pro, Start free trial | `https://carouselstudio.design/en/pricing` |
| Manage account, Manage plan and credits, Purchase extra credits | `https://carouselstudio.design/en/settings?tab=billing` |

### Modelled locally, to wire to the real app

- Connect: the prototype logs in straight away. In the app this is the Google connect.
- Account state: plan and credit balance come from the backend (`initialAccount` is the hook for it).
- Credits: 50 on connect. V2 and V3 start every user on 15. The Review line uses a render cost of 12 (`RENDER_COST`).
- Running-low thresholds: Free under 12 credits, Pro under 50 (`PRO_LOW_CREDITS`).
- Recently created: sample data for logged-in users, hidden when the list is empty.
- Outline and design generation: timed placeholders. The progress bar value is fixed.
- Theme: the Theme field is a placeholder box until the real theme picker goes in.
- Publish, Shuffle colors and Share feedback are not connected.

### Open questions

1. AI model cost: the selector shows 1 to 5 credits per model. How does that combine with the design cost, and should Review show one total?
2. Credits on cancel: should credits be taken only when the design is created, so Cancel costs nothing?
3. Theme picker: which component from the current app should replace the placeholder?

## 3. Run the source

```bash
cd preview
npm install --legacy-peer-deps
npm run dev            # http://localhost:5188
npm run typecheck
npm run build:single   # rebuilds the one-file prototype into preview/dist-single/index.html
```

`AppUiProvider` only works inside Canva, so the local preview (`preview/src/main.tsx`) wraps the app in the kit's `TestAppUiProvider` and draws a stand-in for Canva's panel header. `preview/src/App.tsx` is the same file as `App.tsx` at the top level.
