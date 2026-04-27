# Project Documentation: Slateboard

## 1. Project Overview
*   **Project Name:** Slateboard
*   **Purpose:** Slateboard is a real-time collaborative whiteboard platform designed specifically for academic environments. It enables teachers and students to interact on an infinite canvas, share ideas through drawing and chat, and leverage AI-powered assistance for educational queries.
*   **Target Users:** Educators, students, and collaborative research teams.

### Key Features
*   **Real-time Multi-user Drawing:** Synchronized canvas state with low-latency updates for multiple participants using WebSockets.
*   **Academic AI (Brainy):** An integrated assistant that provides concise, context-aware academic help (strictly limited to educational topics).
*   **Rich Toolset:** Includes pens with variable pressure simulation, highlighters, geometric shapes (rectangles, ellipses, arrows), text elements, and image imports.
*   **Hybrid Analytics & Audit:** A dual-database approach to track board activities, user sessions, and granular stroke-level audit trails.
*   **Export Capabilities:** High-resolution export of boards to PNG (view or full canvas) and SVG formats.

---

## 2. System Architecture
Slateboard follows a **decoupled client-server architecture** optimized for real-time interactivity and data integrity.

### Component Breakdown
*   **Frontend (Client):** A vanilla JavaScript application served as static files. It utilizes the HTML5 Canvas API for rendering and Socket.io-client for real-time collaboration.
*   **Backend (Server):** An Express.js server that manages RESTful APIs, authentication, and WebSocket namespaces.
*   **Real-time Engine:** A Socket.io implementation that handles room-based collaboration, cursor presence, and stroke synchronization.
*   **Data Tier (Hybrid):**
    *   **MongoDB (Mongoose):** Primary store for application state including Users, Boards, and Stroke data.
    *   **PostgreSQL (Prisma):** Handles structured, high-volume logging (Activity Logs, Audit Trails, and Session metrics).

### Architecture Diagram
![alt text](architecture_diagram.png)

---

## 3. Folder & Codebase Structure
*   `client/`: Frontend assets and logic.
    *   `js/canvas/`: Core whiteboard logic including the rendering engine (`engine.js`), vector tools (`tools.js`), and history management (`history.js`).
    *   `js/storage/`: Logic for local browser storage and session persistence.
    *   `css/`: Atomic CSS structure for styling (`tokens.css`, `base.css`, `components.css`).
*   `server/`: Backend implementation.
    *   `routes/`: Versioned API endpoints (v1 and v2) for AI, Auth, Boards, and Analytics.
    *   `sockets/`: Event-driven handlers for board state and real-time chat collaboration.
    *   `models/`: Mongoose schemas for MongoDB data entities.
    *   `services/`: Business logic abstractions (e.g., AI prompting logic, analytics processing).
    *   `middleware/`: Security implementations (Rate limiting, security headers) and request logging.
*   `prisma/`: Relational schema definitions and migrations for PostgreSQL.
*   `tests/`: Suite for validating backend functionality.

---

## 4. Technology Stack
*   **Languages:** JavaScript (ES6+), HTML5, CSS3.
*   **Frameworks:** Express.js (Node.js).
*   **Real-time:** Socket.io.
*   **Persistence:** Mongoose (MongoDB), Prisma (PostgreSQL).
*   **Security:** `cookie-session`, `cors`, `helmet`.
*   **AI:** Groq Node.js SDK (utilizing models like Llama-3).
*   **Build/Dev Tools:** ESLint, Prettier, Dotenv.

---

## 5. Core Modules & Functionality

### Canvas Engine (`CanvasEngine`)
The central rendering pipeline located in `client/js/canvas/engine.js`.
*   **Logic:** Uses a `requestAnimationFrame` loop to maintain smooth rendering. It handles camera transformations (zoom/pan) and coordinates the rendering of historical strokes vs. active draft strokes.
*   **Spline Interpolation:** Implements Catmull-Rom Splines to transform raw input points into smooth, continuous curves.
*   **Path Simplification:** Uses the Ramer-Douglas-Peucker (RDP) algorithm to prune redundant points, capped at 500 points per stroke to maintain performance.

### Vector Tools (`tools.js`)
*   **Pressure Simulation:** Dynamically calculates "simulated pressure" based on input velocity: `pressure = clamp(1.35 - velocity * 0.18, 0.2, 1)`.
*   **Dynamic Rendering:** Strokes are rendered as filled quadrilaterals between interpolated points, allowing for variable-width segments.

### Socket Handlers (`boardHandler.js`)
*   **Presence Management:** Assigns unique colors to collaborators based on their User ID.
*   **Synchronization:**
    *   `stroke:start`: Initializes a buffer for a new drawing action.
    *   `stroke:point`: Streams incremental vector data to all room participants.
    *   `stroke:end`: Flushes the buffer to MongoDB and triggers a PostgreSQL audit log.

### AI Assistant (`Brainy`)
*   **Logic:** Uses a strictly constrained system prompt to ensure responses are concise, academic, and formatted without complex Markdown headers.

---

## 6. Execution Flow

### Application Startup
1.  **Environment Check:** Loads configuration from `.env`.
2.  **Database Connection:** Establishes connections to MongoDB and PostgreSQL.
3.  **Server Launch:** Starts the Express server and initializes Socket.io handlers.

### User Drawing Workflow
1.  **Input:** `pointerdown` event triggers the local `CanvasEngine`.
2.  **Broadcast:** Client emits `stroke:start` via WebSockets.
3.  **Synchronization:** Server broadcasts the stroke data to other users in the same room.
4.  **Completion:** `pointerup` triggers `stroke:end`. The server persists the full stroke to MongoDB and logs the change in the PostgreSQL `AuditLog`.

---

## 7. APIs & Interfaces

### Internal REST API (v1)
*   `POST /api/v1/auth/login`: Session initialization.
*   `GET /api/v1/boards`: Retrieves accessible boards for the current user.
*   `POST /api/v1/ai/ask`: Interface for communicating with Brainy.
*   `GET /api/v1/export/png/:roomKey`: Triggers a high-res board export.

### API v2 (Evolution)
*   **Versioning Concept:** Implements a `{ data, meta }` response envelope for future-proofing and better metadata handling.
*   **Strict Security:** Shifts towards mandatory `Authorization` headers for programmatic access.

---

## 8. Data Handling

### Schema Strategy
*   **MongoDB (Primary State):** Uses a document-per-board model with embedded stroke arrays for atomic canvas operations.
*   **PostgreSQL (Observability):**
    *   `ActivityLog`: High-level user actions (login, create-board).
    *   `AuditLog`: Detailed delta tracking of stroke additions and deletions.
    *   `SessionLog`: IP and duration tracking for collaborative sessions.

---

## 9. Configuration & Environment
*   `MONGODB_URI`: Primary database connection.
*   `DATABASE_URL`: PostgreSQL connection for Prisma.
*   `GROQ_API_KEY`: API key for academic AI features.
*   `SESSION_SECRET`: Security key for session signing.

---

## 10. Build & Run Instructions
1.  **Install:** `npm install`
2.  **Database:** `npx prisma migrate dev`
3.  **Configure:** Setup `.env` file.
4.  **Run:** `npm run dev` (starts server and serves client).
