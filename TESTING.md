# Testing Slateboard

This guide outlines the testing strategies and procedures for ensuring the reliability of Slateboard.

## 🧪 Automated Testing

### Backend (API & Sockets)
We use **Jest** and **Supertest** for backend validation.
- **Run all tests**:
  ```bash
  npm test
  ```
- **Test Structure**:
  - `tests/auth.test.js`: Validates login, registration, and session management.
  - `tests/boards.test.js`: Validates CRUD operations for boards and stroke persistence.
  - `tests/sockets.test.js`: (Future) Integration tests for real-time synchronization.

## ✍️ Manual Testing (Canvas & Real-time)

### 1. Canvas Rendering
- **Tool Check**: Verify that all tools (Pen, Line, Rect, Ellipse, Arrow, Text, Eraser) render correctly.
- **Pressure Simulation**: Draw at different speeds to ensure stroke width varies as expected.
- **Smoothing**: Ensure freehand strokes are smoothed via the Catmull-Rom interpolation.

### 2. Real-time Collaboration
- **Multi-user Sync**: Open the same board in two separate browser windows (or different devices).
  - Draw in Window A and verify immediate appearance in Window B.
  - Verify that cursors show the correct user name and color.
- **Concurrency**: Have multiple users draw simultaneously in the same area. Verify that strokes do not overlap or glitch.

### 3. AI Assistant (Brainy)
- **Academic Restriction**: Ask a non-academic question (e.g., "What's the weather?"). Verify the AI politely declines or redirects to academic topics.
- **Context Handling**: Draw a triangle and ask "What is the area of the shape on board?". Verify the AI correctly identifies the shape.

## 🚩 Edge Cases & Stress Testing

- **Network Drops**: Simulate a network disconnection while drawing. Verify that the client handles the reconnect gracefully and attempts to sync state.
- **Large Boards**: Create a board with 1000+ strokes. Verify that zoom/pan performance remains smooth (due to RDP simplification).
- **Concurrency Overload**: Rapidly emit stroke events to test server-side message handling and MongoDB write capacity.

## Reporting Bugs
If you find a bug during testing, please open an issue on GitHub with:
1. Steps to reproduce.
2. Expected behavior.
3. Screenshots or screen recordings.
4. Browser/OS environment details.
