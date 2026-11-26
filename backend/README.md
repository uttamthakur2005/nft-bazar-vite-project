# NFT Bazar — Backend API

Node.js + Express + MongoDB + JWT REST API for the NFT Bazar frontend.

## Setup

```bash
cd nft-bazar-backend
npm install
cp .env.example .env
# edit .env: set MONGO_URI and a strong JWT_SECRET
npm run seed:admin     # creates the default admin account
npm run dev            # starts on http://localhost:5000 (nodemon)
# or: npm start
```

Requires Node.js 18+ and a running MongoDB instance (local or Atlas).

## Environment variables (.env)

| Key | Description |
|---|---|
| `PORT` | API port (default 5000) |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Long random secret used to sign tokens |
| `JWT_EXPIRES_IN` | Token lifetime, e.g. `7d` |
| `CLIENT_ORIGIN` | Comma-separated allowed CORS origins |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | Used only by `npm run seed:admin` |

## API Reference

All responses are JSON: `{ success: boolean, message?, ...data }`.
Protected routes require header: `Authorization: Bearer <token>`.

### Auth
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | `{ name, email, password }` → creates user, returns token |
| POST | `/api/auth/login` | Public | `{ email, password }` → returns token |
| POST | `/api/auth/admin/login` | Public | Same body; rejects non-admin accounts |

### User
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/user/me` | Private | Current user's profile |

### Wallet
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/wallet/connect` | Private | `{ address, provider }` — provider ∈ MetaMask/Rainbow/WalletConnect/Coinbase |
| GET | `/api/wallet` | Private | Current wallet status |
| DELETE | `/api/wallet/disconnect` | Private | Removes wallet from account |

### Payment
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/payment/checkout` | Private | `{ nftId, nftName, amount, currency }` — requires a connected wallet |
| GET | `/api/payment/history` | Private | Current user's payment history |

### Admin
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/admin/users` | Admin only | List all users |
| GET | `/api/admin/payments` | Admin only | List all payments |

## Production checklist

- [ ] Set `NODE_ENV=production` and a strong, unique `JWT_SECRET`
- [ ] Use MongoDB Atlas or a managed/replicated MongoDB, not a single local instance
- [ ] Put the API behind HTTPS (reverse proxy: Nginx / a platform load balancer)
- [ ] Restrict `CLIENT_ORIGIN` to your real frontend domain(s) only
- [ ] Replace the mock payment processor in `routes/payment.routes.js` with a real
      gateway (Razorpay/Stripe) or verified on-chain transaction check
- [ ] Verify wallet ownership with a signed-message challenge instead of trusting
      the address sent by the client (`routes/wallet.routes.js`)
- [ ] Add centralized logging (e.g. pino/winston) and monitoring/alerts
- [ ] Set up automated MongoDB backups
- [ ] Run `npm audit` and keep dependencies patched


## Razorpay checkout setup

1. Create or open a Razorpay account and switch to **Test Mode**.
2. In the Razorpay Dashboard, open **Account & Settings → API Keys** and generate Test Mode keys.
3. Copy `backend/.env.example` to `backend/.env`; set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`. Never put the secret in frontend env files or commit it to GitHub.
4. Set `ETH_CONVERSION_RATE` to the intended INR equivalent for one ETH. Catalog prices are converted using this fixed demo rate.
5. Restart the backend and frontend. Test the checkout with Razorpay's documented test payment methods; Test Mode does not debit real money.

Important: before production use, calculate the price from a trusted server-side NFT catalog/database rather than accepting `amount` from the browser, and confirm payment status/order amount with Razorpay's API or webhooks.
