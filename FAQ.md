# Frequently Asked Questions (FAQ)

## 🔄 Real-time Synchronization

### How does Slateboard ensure low-latency drawing?
Slateboard uses **WebSockets** (via Socket.io) to stream drawing coordinates instantly. Instead of waiting for a full drawing to finish, we emit `stroke:point` events as you move your cursor, ensuring your collaborators see your work in real-time.

### What happens if I lose my internet connection?
If you disconnect, the Socket.io client will automatically attempt to reconnect. Any strokes made while offline are stored locally in your browser's memory and synced once the connection is restored.

## 🗄️ Architecture & Databases

### Why does Slateboard use both MongoDB and PostgreSQL?
We use a **Hybrid Database Strategy**:
- **MongoDB** is perfect for our "Canvas" data because strokes and boards are naturally hierarchical and unstructured.
- **PostgreSQL** (via Prisma) is used for "Analytics and Auditing." It excels at structured logging and reporting, making it easier to track teacher/student engagement and audit activities.

## 🤖 AI Assistant (Brainy)

### Is the AI assistant safe for students?
Yes. **Brainy** is governed by a strict "Academic Only" system prompt. It is designed to refuse non-academic requests and avoid providing answers that are not educational in nature. It focuses on explaining concepts rather than just giving answers.

### Can Brainy see what I'm drawing?
Brainy has access to a summarized metadata "snapshot" of your board (e.g., how many shapes are present, what text is written). This allows it to provide context-aware help without needing a literal video feed of your screen.

## 🛠️ Usage & Exporting

### How do I export my board?
You can export your board at any time by clicking the **Export** button in the top toolbar. You have options to export as a **PNG** image or a vector **SVG** file.

### Can I use Slateboard on my tablet?
Absolutely! Slateboard is optimized for touch interaction. It supports pressure simulation on many styluses and works great on iPads and Android tablets through a modern web browser.

## 🆘 Troubleshooting

### My drawings aren't syncing with my teammates.
1. Check your internet connection.
2. Ensure you are in the same **Room** (check the room key in the top right).
3. Try refreshing the page; Slateboard will automatically restore your board state from the server.
