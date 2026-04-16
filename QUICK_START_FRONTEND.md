# CodeRAG Frontend — Quick Start Guide

## 30-Second Setup

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser. ✅ Done!

The backend is not an npm project. Run it with Docker Compose or, for local development, install Python dependencies from `backend/requirements.txt` and start `uvicorn`.

---

## 5-Minute Full Stack

```bash
# Terminal 1: Backend
cd backend
# Ensure .env is set with DB credentials
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000

# Terminal 2: Frontend  
cd frontend
npm run dev

# Terminal 3: Docker services (MySQL, ChromaDB, Elasticsearch)
docker compose up mysql chromadb elasticsearch
```

All running:
- Frontend: `http://localhost:5173` (dev) or `http://localhost:3000` (docker)
- Backend: `http://localhost:8000`
- API Docs: `http://localhost:8000/docs`

---

## Using Docker Compose

```bash
# One-command full stack
docker compose up --build

# View logs
docker logs -f coderag-frontend
docker logs -f coderag-backend

# Stop everything
docker compose down
```

---

## First Run Checklist

- [ ] Frontend loads at `http://localhost:5173`
- [ ] Click "Register" 
- [ ] Enter email (e.g., `test@example.com`)
- [ ] Enter password (8+ chars)
- [ ] Click Register → Redirects to Chat
- [ ] Go to Settings → "Ingest Repository"
- [ ] Paste GitHub URL (e.g., `https://github.com/facebook/react`)
- [ ] Enter Repo ID (e.g., `react`)
- [ ] Click "Ingest Repository"
- [ ] Go back to Chat
- [ ] Select repo from dropdown
- [ ] Ask a question: "What handles state updates?"
- [ ] Watch the streaming response!

---

## File Structure (Key Files)

```
frontend/
├── src/
│   ├── pages/ChatPage.tsx         ← Main debug interface
│   ├── api/query.ts               ← SSE streaming logic
│   ├── components/chat/           ← Chat UI components
│   ├── store/authStore.ts         ← Authentication state
│   └── types/index.ts             ← TypeScript interfaces
├── .env                           ← Configure API URL
├── Dockerfile                     ← Docker build
└── package.json                   ← Dependencies
```

---

## Common Tasks

### Update API URL
Update `.env`:
```env
VITE_API_URL=http://your-backend-url:8000
```

Then restart: `npm run dev`

### Build for Production
```bash
npm run build          # Creates ./dist/
npm run preview        # Test locally
docker build .         # Build Docker image
```

### Add New Component

1. Create file in `src/components/`
2. Import from `src/types/` for types
3. Import in parent component
4. Use Tailwind for styling

Example:
```typescript
// src/components/MyComponent.tsx
import { Message } from '../types';

interface Props {
  message: Message;
}

export function MyComponent({ message }: Props) {
  return <div className="p-4 bg-white dark:bg-gray-800">
    {message.content}
  </div>;
}
```

### Debug in Browser DevTools

- **Network tab**: Watch API calls
- **Application tab**: See stored repos in localStorage
- **React DevTools extension**: Inspect components
- **Console**: Error messages

---

## Environment Variables

| Variable | Default | Use |
|----------|---------|-----|
| `VITE_API_URL` | `http://localhost:8000` | Backend URL |

For Docker Compose, set in `docker-compose.yml`:
```yaml
frontend:
  environment:
    - VITE_API_URL=http://localhost:8000
```

---

## Troubleshooting

### Port 5173 Already In Use
```bash
# Find what's using it
lsof -i :5173

# Or use a different port
npm run dev -- --port 5174
```

### npm install Fails
```bash
# Try clean install
rm -rf node_modules package-lock.json
npm install
```

### Backend Connection Error
```bash
# Check backend is running
curl http://localhost:8000/docs

# Check .env VITE_API_URL matches backend URL
grep VITE_API_URL .env
```

### Dark Mode Not Working
- Refresh page
- Check `tailwind.config.js` has `darkMode: 'class'`
- Check localStorage: `localStorage.getItem('coderag_dark_mode')`

---

## Development Tips

### Hot Reload
Changes auto-reload in browser. No manual refresh needed.

### TypeScript Errors
Check IDE for squiggles. All types in `src/types/index.ts`.

### Component Testing
Drop into existing page, e.g., `ChatPage.tsx`, watch it render.

### API Testing
Use browser DevTools Network tab to see requests/responses.

### Mobile Testing
On same network, visit `http://<your-ip>:5173` from phone.

---

## Next Steps

1. **Read the code**: Start with `src/pages/ChatPage.tsx`
2. **Understand the flow**: Query → API → Streaming → Result
3. **Explore components**: Each file is ~200 lines, well-commented
4. **Try modifying**: Change a color in `tailwind.config.js`, see instant reload
5. **Deploy**: Follow `PHASE5_WALKTHROUGH.md` for production setup

---

## Useful Commands

```bash
# Development
npm run dev              # Start dev server (HMR enabled)
npm run build           # Production build
npm run preview         # Preview production locally

# Docker
docker compose up       # Full stack
docker compose logs     # View all logs
docker compose down     # Stop all services

# Cleanup
rm -rf dist node_modules
npm ci                  # Clean install

# Package management
npm list                # Show installed packages
npm outdated            # Check for updates
npm audit               # Security vulnerabilities
```

---

## System Requirements

- **Node.js**: 18+ 
- **npm**: 9+
- **Browser**: Chrome, Firefox, Safari, Edge (all modern versions)
- **Memory**: 512MB minimum for dev, 1GB for full stack
- **Disk**: 500MB for node_modules + docker images

---

## Documentation

- **Full Walkthrough**: [PHASE5_WALKTHROUGH.md](../PHASE5_WALKTHROUGH.md)
- **Implementation Summary**: [PHASE5_SUMMARY.md](../PHASE5_SUMMARY.md)
- **Frontend README**: [README.md](./README.md)
- **Backend Docs**: `http://localhost:8000/docs` (Swagger UI)

---

## Getting Help

1. **Check logs**: `npm run dev` output + browser console
2. **Read PHASE5_WALKTHROUGH.md**: Comprehensive guide
3. **Check types**: `src/types/index.ts` for contracts
4. **Network tab**: See what API calls are happening
5. **React DevTools**: Inspect component state

---

**You're ready!** Start with:
```bash
npm install && npm run dev
```

🚀 Happy coding!
