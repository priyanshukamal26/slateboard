# Development Guide

Welcome to the Slateboard development guide. This document provides a deeper technical dive into the project's internal mechanics.

## Architecture Overview

Slateboard is built with a clear separation of concerns:
- **Client**: Vanilla JS using the HTML5 Canvas API for high-performance rendering.
- **Server**: Express.js handling state persistence, AI integration, and real-time synchronization via Socket.io.

## Key Modules

### 1. CanvasEngine (`client/js/canvas/engine.js`)
The heart of the frontend. It manages the rendering loop, camera state (zoom/pan), and coordinates all drawing tools. It uses a dual-buffer approach (draft stroke vs. permanent strokes) to ensure high-FPS interactions.

### 2. Socket Handlers (`server/sockets/boardHandler.js`)
Handles the real-time event stream. It manages room joining, presence colors, and the critical `stroke:point` / `stroke:end` lifecycle that synchronizes the canvas across all users.

### 3. AI Brainy (`server/services/ai.js`)
Interfaces with the Groq SDK. It uses specialized prompts to ensure the AI remains an academic assistant and processes board snapshots to provide context-aware help.

## Development Environment

### Local Setup
Ensure you have MongoDB and PostgreSQL running.
```bash
npm install
npx prisma migrate dev
npm run dev
```

### Working with the Canvas
If you are modifying tool logic in `client/js/canvas/tools.js`:
- Use the **Catmull-Rom Spline** for smoothing.
- Ensure the **RDP algorithm** is applied to prevent point bloat.
- Test with different **Simulated Pressure** values.

## Debugging Tips

### Frontend
- **Socket.io Logs**: Check the browser console for connection events.
- **Canvas Debugging**: Use the browser's "Canvas Inspector" or simply `console.log` stroke objects to verify point coordinates.

### Backend
- **Prisma Studio**: Run `npx prisma studio` to visually inspect the PostgreSQL audit logs and activity logs.
- **Mongoose Debug**: Set `mongoose.set('debug', true)` in `server/index.js` to see raw MongoDB queries.

## Performance Considerations
- **Vector vs. Raster**: We store strokes as vector data (points). Large boards can become slow if stroke counts exceed thousands; this is mitigated by our simplification algorithms.
- **WebSocket Throttling**: The server broadcasts `stroke:point` events as they happen. Ensure payloads are kept small (only essential coordinates).
