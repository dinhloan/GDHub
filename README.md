# GDHub Backend

NestJS backend for Collaborative Knowledge Diary Hub.

## Run

```bash
cp .env.example .env
npm install
npm run start:dev
```

Default API URL: `http://localhost:4000/api`

## Environment

- `MONGODB_URI`: MongoDB connection string.
- `FRONTEND_ORIGIN`: Vite frontend origin.
- `OPENAI_API_KEY`: enables embeddings, GPT-4o critique, and Whisper transcription.
- `CLOUDINARY_*`: reserved for production media upload integration.

Without `OPENAI_API_KEY`, the AI service uses deterministic local embeddings and local critique placeholders so development can continue offline.

## Modules

- `users`: member profiles.
- `groups`: 3-5 person learning groups and leader ownership.
- `topics`: leader-created topics, deadlines, hourly overdue cron.
- `entries`: notes, media metadata, tags, embeddings, semantic search, graph data.
- `discussion`: Socket.io discussion events and persisted entry messages.
- `checklists`: Apple DRI and Google Design Sprint workflows.
- `ai`: critique, embedding and Whisper transcription integration.
