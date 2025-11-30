<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/10ZGK_3zFy5dU8vuerkEjI0LjgAqnTLoI

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Start frontend (Vite dev server): `npm run dev`
4. Start backend API (Express): `npm run server:dev`
   - Or run both together: `npm run start:all`
5. Open the app at: `http://localhost:9080`

### Ports
- Frontend (Vite): http://localhost:9080
- Backend API (Express): http://localhost:9081

These are the defaults. Frontend port is set in `vite.config.ts`. Backend port is controlled by `PORT` in `server/.env` (defaults to 9081 if unset).

### Backend configuration
Create a `server/.env` (or copy `server/.env.example`) and set at minimum:

```
PORT=9081
ALLOWED_ORIGINS=http://localhost:9080
JWT_SECRET=change-me-to-a-long-random-string
JWT_EXPIRES_IN=1d
DB_PATH=./server/data/app.db
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
NODE_ENV=development
```

Notes:
- CORS is restricted to `ALLOWED_ORIGINS` and defaults to `http://localhost:9080` for local dev.
- Health check: `GET http://localhost:9081/api/health`
