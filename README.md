# Onyx Binary Signal Bot — App (frontend)

Static web app for GitHub Pages. Four screens: **Home, Signals, Results, Premium**.
Mobile-first, Telegram Mini App style. No paid service, no paid library, no API key.

## Run locally

```bash
cd app
python3 -m http.server 8000
```

Then open http://localhost:8000 in a browser.

## Configure the API base URL

The backend base URL lives in **one place**: `ONYX_CONFIG.API_BASE` at the top
of `js/app.js`. Default:

```js
API_BASE: 'http://localhost:8000/api'
```

Override without editing code:

- Query param: `index.html?api=https://your-render-url.onrender.com/api`
- Or save `onyx_api_base` in the browser's localStorage.

Expected endpoints: `GET /signals`, `GET /results`, `POST /payments`
(`{ txid, network, amount }`). If the API is unreachable, the app falls back
to clearly-marked **SAMPLE** data so the screens still render — it never fails
blank and never pretends sample data is live.

## Scope (Nov 24, owner decision)

**Real pairs only for now. OTC is "coming soon".** No OTC signal appears in
the feed, cards, or results — any OTC entry returned by the API is filtered
out. OTC pairs are listed in a separate "Coming soon" section on the Signals
screen. Prime is real-market only anyway.

## Beta notes

- Every signal and result in this build is marked **BETA / SAMPLE / TEST DATA**,
  with the banner: "BETA — sample signals for testing only. No live signals yet."
- Wallet addresses are **placeholders only**: "Wallet address not set yet —
  premium checkout is disabled in this beta build." Never paste a real address
  here until the owner supplies the BSC and Tron USDT addresses.
- Price: **1.97 USDT / month** (USDT only, BSC BEP20 or Tron TRC20).
- The headline "The first bot with 98.76% accuracy" is the owner's chosen
  headline and is kept as-is. No other accuracy claim appears anywhere.
- Strategy methods are secret: strategy names + benefit copy only, no logic
  or rules anywhere in this code.
- Free tier: 1–2 sample signals/day, locked signals, "Ad space" placeholder
  slots (no real ad network wired). Premium preview toggle in the header lets
  the owner preview both states. Day/Night theme toggle in the header.
- Live chart: free TradingView widget embed, real-market pairs only.

## Files

- `index.html` — all four screens + bottom tab navigation
- `css/style.css` — Night (obsidian + champagne gold) / Day (porcelain + gold) themes
- `js/app.js` — navigation, filters, theme/plan toggles, API + sample fallback,
  TradingView chart, network selector, TXID submit
