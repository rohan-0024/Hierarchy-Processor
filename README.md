# BFHL — Hierarchy Processor

REST API + Frontend for the Bajaj Finserv SRM Full Stack Engineering Challenge.

## Features

- **POST /bfhl** — Accepts an array of node strings, processes hierarchical relationships, returns structured insights
- **GET /bfhl** — Returns `{ operation_code: 1 }`
- **Frontend** — Premium dark-themed SPA with interactive tree visualization

## Tech Stack

- **Backend**: Node.js (Vercel Serverless Functions)
- **Frontend**: Vanilla HTML/CSS/JS
- **Hosting**: Vercel

## Project Structure

```
├── api/bfhl.js          # Vercel serverless function
├── lib/processData.js   # Core processing logic
├── public/              # Frontend SPA
│   ├── index.html
│   ├── style.css
│   └── script.js
├── server.js            # Local dev server
├── test/test.js         # Test suite
└── vercel.json          # Vercel routing config
```

## Local Development

```bash
node server.js
# Open http://localhost:3000
```

## Deploy to Vercel

```bash
npx vercel --prod
```

## API Usage

```bash
curl -X POST https://your-url/bfhl \
  -H "Content-Type: application/json" \
  -d '{"data": ["A->B", "A->C", "B->D"]}'
```

## Author

**Rohan Paul** — RA2311028010024 — SRMIST
