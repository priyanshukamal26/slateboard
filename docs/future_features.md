# Future Features Documentation

This document serves as an archive for features that were developed but have been temporarily removed from the main Slateboard UI to maintain focus and conciseness. These features can be reintroduced in future iterations.

## 1. Replay Feature
- **Concept:** A timeline slider that replays the drawing process stroke by stroke.
- **Frontend Controller:** Was previously handled by `client/js/replay.js`, which bound to `#replay-panel`, `#replay-start-btn`, `#replay-stop-btn`, and `#replay-scrubber`.
- **Backend Component:** The board strokes are already chronologically stored. The replay mechanism simply clears the canvas and re-renders strokes incrementally over time.

## 2. Chat Summarization
- **Concept:** An AI feature that fetches the last 100 chat messages from the MongoDB `ChatMessage` collection for a specific board and passes them to an LLM to generate a bulleted summary.
- **Frontend Interaction:** Handled by a specific button in the AI Assistant panel.
- **Backend Route:** Formerly implemented at `/api/v1/ai/summarize-chat`.

## 3. Diagram Generation
- **Concept:** Allowed users to type a text prompt (e.g., "A flowchart of login") and the AI returned a JSON array of `tool`, `x`, `y` coordinates which the frontend mapped into standard Slateboard strokes and injected into the canvas.
- **Backend Route:** Formerly implemented at `/api/v1/ai/generate-diagram`.
