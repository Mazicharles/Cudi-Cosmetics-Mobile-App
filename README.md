# Cudi Cosmetics Mobile App

An Android companion to the existing Next.js shop. It uses **the same Supabase project, Google accounts, products, `cart_items` rows, orders, and web `/api` endpoints**. There is no mobile backend, separate Google client, payment processor, or email integration.

## Setup

Use Node 22.19+ and npm. From this repository:

```powershell
cd Cudi-Cosmetics-Mobile-App
npm install
Copy-Item .env.example .env
```

Fill `.env` with the web project's `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` under their `EXPO_PUBLIC_*` names. Set `EXPO_PUBLIC_API_BASE_URL` to the HTTPS deployment of this web app **including the web changes in this branch**. Do not append `/api`. Restart Expo after changing environment variables.

Only the URL, anon key, and public API base URL belong here. Never copy the service role, Paystack secret, or email keys. Public variables are embedded in the APK; RLS enforces ownership.

## Supabase configuration

1. In the existing project, go to **Authentication → URL Configuration → Redirect URLs** and add exactly **`cudicometics://auth/callback`**.
2. Confirm the existing Google provider is enabled. Reuse its existing Google Cloud configuration; do not create another client.
3. Optionally apply `backend-integration/003_cart_realtime.sql` through the existing migration workflow. It adds `public.cart_items` to the `supabase_realtime` publication if available. All refresh mechanisms work without it. Existing RLS remains in force.
4. Ensure the web deployment's Paystack webhook is configured and reachable. A mobile browser has no guarantee of sharing the website's login cookies; the webhook is essential to confirmation on mobile. Test with the web server's Paystack test credentials.

**Scheme spelling decision:** the brief specifies `cudicometics` in the actual auth flow and app identity, but spells it `cudicosmetics` in one README instruction. The configured scheme and allowlisted redirect must match, so this implementation consistently uses `cudicometics://auth/callback`. The displayed name is always **Cudi Cosmetics**.

## Development

```powershell
npm start
npm run typecheck
npm run lint
npm test
```

Expo SDK 57 is the latest stable SDK verified when this app was created; dependencies are locked in `package-lock.json`. Playfair Display and Inter fonts are bundled locally, so startup does not fetch fonts. Product photos use `expo-image`.

React and React DOM are both pinned to 19.2.3. Expo Router has optional web dependencies even in an Android build; letting npm select a newer React DOM causes EAS's clean `npm ci` install to fail. Regenerate the lockfile with `npm install` after dependency changes and check `npm ci --dry-run --ignore-scripts` before uploading a build.

Expo Go is useful for browsing UI, but **cannot test this Google sign-in flow** because it doesn't own the custom app scheme or launcher icon. Use a development build or the preview APK for Google authentication and recording.

For a local native build, install Android Studio/Android SDK and a Java version supported by Expo's Android toolchain, connect your phone over USB, enable Developer options and USB debugging, accept the debugging prompt, then run:

```powershell
npx expo run:android
```

This generates an ignored `android/` project. `npm run android` runs the same command. For an EAS development client, run `npx eas-cli build -p android --profile development`, install it, then `npx expo start --dev-client`. Configure the same public variables in EAS's **development** environment.

## Build an installable APK

1. Create a free Expo account.
2. From **`mobile/`**, run `npx eas-cli login`, then `npx eas-cli build:configure`. Link/create the Expo project when prompted; EAS adds its project ID to app configuration. Do not run this from the web root.
3. In Expo's project dashboard → Environment variables, create all three `EXPO_PUBLIC_*` values in the **preview** environment. They are public build configuration, not secrets. Alternatively use `npx eas-cli env:create --environment preview --name EXPO_PUBLIC_SUPABASE_URL --value YOUR_URL --visibility plaintext` and repeat for the anon key and API URL. Use the same backend values as web.
4. Run `npm run build:apk` (`eas build -p android --profile preview`). Accept Android keystore generation for your own Expo project. Preserve the keystore for future updates.
5. Follow the build page link printed by EAS and download the `.apk`. Preview is internal distribution with `android.buildType: apk`; it does not publish to Google Play.

EAS login, project registration, signing, and a hosted build require the owner's Expo account. This repository provides the build configuration; a cloud APK is not claimed until EAS finishes successfully.

## Install on Android

Open the EAS build link on the phone and download the APK, or transfer it over USB. When prompted, allow **Install unknown apps** for the browser or file manager used to open the file. Install, then find **Cudi Cosmetics** under the plum icon with the white C in your app drawer. Launch it and sign in. You can revoke the unknown-app install permission afterward.

For local installation, the USB debugging workflow with `npx expo run:android` above installs directly on a connected phone.

## Demo / screen recording

1. Show the Android home screen with the **Cudi Cosmetics** icon; launch the app.
2. Tap Account, continue with Google, and show the signed-in name/avatar. Use the same account as the website.
3. On the laptop website, add a product to your bag.
4. Return to the phone's Cart tab. Show the item and Last synced time, using pull-to-refresh if necessary. Add another product on the phone, switch focus back to the website, and show it appearing. If needed, refresh the website.
5. Proceed to Checkout, enter a valid Nigerian address, open Paystack hosted checkout, and make a test payment. Close/back out of the browser once the web callback appears. Show the server-confirmed order in Orders. A pending order is not a payment success.

## Structure and decisions

```text
app/                    Expo Router stack and Shop / Cart / Orders / Account tabs
src/providers/auth.tsx  Supabase PKCE, persistent session, foreground token refresh
src/providers/cart.tsx  Shared database cart, guest storage, merge, rollback, sync
src/lib/                Web-matching config, types, validation, money and queries
src/components/ui.tsx   Cream/blush/plum components and route guards
tests/                  Jest business-rule and OAuth tests
scripts/                Reproducible path-based monogram PNG generator
assets/                 Launcher/adaptive icon, splash, favicon
eas.json                Development client and internal preview APK profiles
```

Run `npm run assets` to regenerate the PNGs with Sharp; no machine-specific font is required. Launcher icon is 1024×1024. The adaptive foreground keeps its monogram in the mask-safe center on a plum background.

Money remains integer kobo. `formatNaira` manually inserts thousands separators and two decimal places; it never uses Intl. Shipping copies the web config: ₦2,500, free at ₦50,000. Even an empty subtotal has the web shipping function's value; an empty bag hides the totals panel. Order timestamps are displayed in Africa/Lagos.

Cart rows use the existing unique `(user_id, product_id)` constraint and upserts. Adds read the current database cart before increasing quantity, with serialized writes in this app. Guests persist in AsyncStorage. On login, guest quantities are summed and capped at stock and 99, then local storage is cleared only after writes succeed. RLS controls every cart operation. Signed-out users see their local guest cart, never a previous account's cart.

Cart sync runs on Cart tab focus, app foreground, pull-to-refresh, and optionally Realtime events. Website focus/visibility listeners refetch its own rows after queued writes. Realtime failure falls back to the other mechanisms. Cart mutations update the UI before persistence and roll back on failure; checkout remains disabled until the cart has loaded successfully. React Query caches catalogue and order data; session-specific query keys avoid cross-account cache leakage.

Protected Account, Orders, and Checkout routes return through Login to the requested screen. Supabase owns Google identity and exchanges the redirect's PKCE code. Sessions persist with AsyncStorage; token refresh starts/stops with AppState.

Checkout posts the copied strict web Zod schema with the current Supabase access token to `/api/checkout`. Bearer auth validates `getUser(token)` server-side; invalid supplied credentials do not fall back to cookies. Cookie-only web requests keep their origin protection. Checkout's response adds `order_id` without removing `authorization_url`. The existing hosted Paystack initialization, verification, webhook, stock reservation, and confirmation email processing are unchanged. Mobile never collects card details or marks an order paid.

## Known limitations / next steps

- Requires configured public env values, existing seeded products, the web deployment, Google provider, and Paystack webhook. No fake catalogue or payment success fallback is supplied.
- A read/upsert is not a database-atomic increment across two simultaneously writing devices. Focus refresh resolves display differences, but simultaneous adds to the same product can race, as in the web implementation. An atomic backend RPC would require a separately reviewed backend extension.
- Guest merge is a multi-request operation. A process crash after an upsert but before clearing guest storage can repeat that merge on restart; a fully transactional exactly-once merge requires a backend idempotency contract.
- Hosted Paystack retains the existing web callback URL. On Android, close the browser manually after payment, then mobile polls the exact order for up to 60 seconds. A delayed webhook remains pending and can be refreshed in Orders. No new payment callback logic is introduced.
- Tests and bundle checks do not replace a real Android Google OAuth / Paystack test run. Physical-device recording and APK installation require the owner's account/device.
- Accessibility labels, 48px buttons, readable contrast, loading skeletons, retries, and pull-to-refresh are included. No offline checkout; guests can view their stored cart, but fresh catalogue and cart writes require connectivity.
- Config/types/schema are intentionally copied to keep EAS builds self-contained in `mobile/`. Update these copies together when the web contract changes; a parity test checks them against web sources.

## Manual acceptance checklist

- Install APK and confirm launcher name, plum C icon, splash, headings and images.
- Google login, cancellation, logout, app restart session persistence, and protected-screen return path.
- Search, category chips, all sorts, stock limits, product details, pull-to-refresh, empty/error states.
- Guest add → restart → login merge; existing shared quantity plus guest quantity, capped by stock.
- Web add → phone Cart focus/foreground/refresh; phone add/change/remove → web refocus; matching quantities and badge.
- Disable connectivity during a cart write; confirm error/rollback and successful retry after reconnecting.
- Shipping just below/at ₦50,000, matching web totals.
- Valid/invalid Nigerian phone and state; hosted test payment; browser close; paid, pending, cancelled order states; server-side email remains unchanged.
- Switch accounts and verify no previous account's cart/orders appear.

Web checks run from the monorepo root: `npm run build`, `npm run lint`, `npm test`. Mobile is excluded from all three web tools.

## Verification completed

Android navigation compatibility: signed-out Account and Orders tab presses open Login above the existing tabs instead of mounting a protected tab and immediately replacing the entire tab navigator. Android stack animations are disabled to avoid native view re-parenting during removal transitions (a `SurfaceMountingManager.addViewAt` crash captured on a Tecno Camon 19 Pro running Android 13). Integration tests cover both login destinations and returning to browsing. The replacement APK must still be verified on the physical phone.

| Location | Check | Result |
| --- | --- | --- |
| `mobile/` | `npm install` | Passed; lockfile committed |
| `mobile/` | `npm run typecheck` | Passed |
| `mobile/` | `npm run lint` | Passed with zero warnings |
| `mobile/` | `npm test` | 41 tests passed using jest-expo |
| `mobile/` | `npx expo install --check` | SDK-compatible versions confirmed against the local SDK list (offline check) |
| `mobile/` | `npx expo export --platform android --output-dir dist` | Final production Hermes bundle built successfully |
| Web root | `npm run build` | Passed |
| Web root | `npm run lint` | Passed |
| Web root | `npm test` | 46 tests passed |

The Android export is a JavaScript/assets bundle, **not an APK**. EAS account/project setup, hosted APK build, physical installation, live Google login, Paystack test payment, and the screen recording remain manual acceptance steps above. No live backend settings were changed or test payments submitted during implementation.

