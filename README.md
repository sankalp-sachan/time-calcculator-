
# Time Calculator App (Fullstack)

This is a simple fullstack Time Calculator app with:
- Signup / Login (JWT + bcrypt)
- Persistent user-specific time entries saved in MongoDB
- LocalStorage sync for offline/refresh persistence
- Node.js + Express backend; MongoDB with Mongoose
- Frontend: plain HTML/CSS/JS (no frameworks)

## Quick start (local)

1. Install dependencies
```bash
cd time-calculator-app
npm install
```

2. Create a `.env` file based on `.env.example` and fill values (`MONGO_URI`, `JWT_SECRET`).

3. Start the server:
```bash
node server.js
```

4. Open your browser at `http://localhost:5000` (or the port you set).

## Notes
- The backend serves static frontend files from `/public` so no separate frontend server is required.
- For production, use a proper hosting setup and secure your secrets.
