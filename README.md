# GDHub Backend

NestJS backend for Collaborative Knowledge Diary Hub.

## Run

```bash
cp .env.example .env
npm install
npm run start:dev
```

Default API URL: `http://localhost:4000/api`
Health check: `http://localhost:4000/api/health`

## Environment

- `MONGODB_URI`: MongoDB connection string.
- `FRONTEND_ORIGIN`: Vite frontend origin.
- `OPENAI_API_KEY`: enables embeddings, GPT-4o critique, and Whisper transcription.
- `CLOUDINARY_*`: reserved for production media upload integration.

Without `OPENAI_API_KEY`, the AI service uses deterministic local embeddings and local critique placeholders so development can continue offline.

## Deploy to Render

Use the repository root as this backend folder.

Render can read `render.yaml` directly:

- Build command: `npm ci && npm run build`
- Start command: `npm run start:prod`
- Health check path: `/api/health`

Set these Render environment variables:

```bash
MONGODB_URI=mongodb://...
FRONTEND_ORIGIN=https://your-vercel-app.vercel.app
OPENAI_API_KEY=
```

After Vercel creates the final frontend domain, update `FRONTEND_ORIGIN` with that domain. For multiple origins, separate values with commas.

## Modules

- `users`: member profiles.
- `groups`: 3-5 person learning groups and leader ownership.
- `topics`: leader-created topics, deadlines, hourly overdue cron.
- `entries`: notes, media metadata, tags, embeddings, semantic search, graph data.
- `discussion`: Socket.io discussion events and persisted entry messages.
- `checklists`: Apple DRI and Google Design Sprint workflows.
- `ai`: critique, embedding and Whisper transcription integration.
