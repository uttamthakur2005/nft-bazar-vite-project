# NFT Bazar — Vite + React + Node.js + MongoDB

```
nft-bazar-vite-project/
├── backend/     Node.js + Express + MongoDB + JWT REST API
└── frontend/    React app built with Vite
```

## Step by step (VS Code)

### 1. Open the project
- Extract the zip
- VS Code → **File → Open Folder** → select `nft-bazar-vite-project`
- Open a terminal in VS Code: **Terminal → New Terminal** (or `` Ctrl + ` ``)

### 2. Install Node.js (if you haven't)
- Download the LTS version from [nodejs.org](https://nodejs.org)
- Check it worked: `node -v` in the terminal should print a version number

### 3. Set up MongoDB
Easiest option — free cloud database, no install needed:
- Sign up at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
- Create a free cluster
- Click **Connect → Drivers**, copy the connection string
  (looks like `mongodb+srv://user:pass@cluster0.mongodb.net/nft_bazar`)

### 4. Start the backend
In the VS Code terminal:
```bash
cd backend
npm install
```
Copy `.env.example` to `.env` (right-click the file → Copy, then Paste and rename),
then open `.env` and fill in:
- `MONGO_URI` → your Atlas connection string
- `JWT_SECRET` → any long random string

Then:
```bash
npm run seed:admin
npm run dev
```
You should see `NFT Bazar API listening on port 5000`. Leave this terminal running.

### 5. Start the frontend
Open a **second terminal** in VS Code (click the `+` icon in the terminal panel):
```bash
cd frontend
npm install
npm run dev
```
Vite will print a URL, usually `http://localhost:5173` — open that in your browser.

### 6. (Optional) Point the frontend at a different backend URL
Copy `frontend/.env.example` to `frontend/.env` and edit `VITE_API_BASE`
if your backend isn't running on `http://localhost:5000/api`.

## Project structure (frontend)

```
frontend/src/
├── main.jsx              # Vite entry point
├── App.jsx                # top-level state, routing between pages
├── api.js                  # fetch wrapper for the backend
├── index.css                # all styling
├── data/nftData.js           # NFT catalogue + wallet provider list
└── components/
    ├── Navbar.jsx
    ├── Hero.jsx
    ├── NFTCard.jsx
    ├── WalletModal.jsx
    ├── LoginPage.jsx
    ├── RegisterPage.jsx
    ├── AccountPage.jsx
    └── PaymentPage.jsx
```

Nothing was rewritten from scratch — this is the same app split into proper
files instead of one HTML file, so it works the standard Vite/React way
(`npm run dev`, `npm run build`, imports, JSX, etc).

## Building for deployment

```bash
cd frontend
npm run build
```
This creates a `dist/` folder — deploy it to Vercel, Netlify, or any static host.
Remember to set `VITE_API_BASE` to your live backend URL before building.

Backend deployment checklist is in `backend/README.md`.
