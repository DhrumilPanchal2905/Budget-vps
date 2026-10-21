# Budget Pro app (v4) — Expo: Web + Android + iOS + tablets/iPad from one code base

- **expo-router** (`src/app`): `(public)` website + free tools (pre-rendered HTML for SEO), `(auth)` sign-in,
  `(app)` the signed-in app (sidebar on tablets/desktop, drawer + bottom tabs on phones).
- **UI kit** `src/ui` (7 themes synced to the account), charts with `react-native-svg` (`src/components/charts.tsx`).
- **API client** `src/lib/api.ts`: end-to-end encrypted bodies (ECDH P-256 + AES-256-GCM — WebCrypto on web,
  @noble on native), cookies on web / Keychain-Keystore cookie jar in the app.
- **Realtime** WebSocket (`src/components/realtime.tsx`), **push** (`src/lib/push.ts` native · `push.web.ts` web),
  **updates** (`src/lib/version.ts` stores · `version.web.ts` web banner), **payments** (Razorpay: web popup / in-app
  WebView), **passkeys** (`src/lib/passkey*.ts`), **Angel AI** voice + chat (`src/components/angel`).

```bash
cp .env.example .env
npm install && npx expo install --fix     # align Expo package versions with the installed SDK
npm run web                               # dev in the browser (needs the API: EXPO_PUBLIC_API_URL)
npx expo run:android | npx expo run:ios   # dev on a device/emulator (dev build)

npm run version:bump                      # bump version + build numbers (+ public/version.json)
npm run build:web && npm run deploy:web   # website → /var/www/budget-pro (on the VPS)
npm run eas:android / npm run eas:ios     # store builds (EAS)
```
Local dev against a local API: `EXPO_PUBLIC_API_URL=http://localhost:4000` here and
`CORS_ORIGINS=http://localhost:8081` in the API `.env`. Full guide: `../DEPLOY.md`.
