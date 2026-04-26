/**
 * Chat UI controller — works with chatHandler.js socket events.
 * Called from board.runtime.js after socket is connected.
 */
(function (window) {
  "use strict";

  function ChatController(socket, boardId, currentUser) {
    this.socket = socket;
    this.boardId = boardId;
    this.currentUser = currentUser;
    this.isOpen = false;
    this.unread = 0;

    this.panel = document.getElementById("chat-panel");
    this.toggle = document.getElementById("chat-toggle");
    this.close = document.getElementById("chat-close");
    this.messageList = document.getElementById("chat-messages");
    this.input = document.getElementById("chat-input");
    this.sendBtn = document.getElementById("chat-send-btn");
    this.badge = document.getElementById("chat-badge");
    this.typingEl = document.getElementById("chat-typing");
    this.fileInput = document.getElementById("chat-file-input");
    this.uploadBtn = document.getElementById("chat-upload-btn");

    if (!this.panel || !this.socket) return;

    this._bindEvents();
    this._bindSocket();

    // Join chat — fetch history
    socket.emit("chat:join", { boardId });
  }

  ChatController.prototype._bindEvents = function () {
    const self = this;

    if (this.toggle) {
      this.toggle.addEventListener("click", () => self.setOpen(!self.isOpen));
    }
    if (this.close) {
      this.close.addEventListener("click", () => self.setOpen(false));
    }
    if (this.sendBtn) {
      this.sendBtn.addEventListener("click", () => self._send());
    }
    if (this.uploadBtn && this.fileInput) {
      this.uploadBtn.addEventListener("click", () => self.fileInput.click());
      this.fileInput.addEventListener("change", (e) => self._handleFileUpload(e));
    }
    if (this.input) {
      this.input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          self._send();
        } else {
          self.socket.emit("chat:typing", {});
        }
      });
    }
  };

  ChatController.prototype._bindSocket = function () {
    const self = this;

    this.socket.on("chat:history", ({ messages }) => {
      if (self.messageList) self.messageList.innerHTML = "";
      (messages || []).forEach((m) => self._appendMessage(m));
    });

    this.socket.on("chat:message", (msg) => {
      self._appendMessage(msg);
      if (!self.isOpen) {
        self.unread++;
        if (self.badge) {
          self.badge.textContent = self.unread;
          self.badge.hidden = false;
        }
      }
    });

    this.socket.on("chat:typing", ({ userId, displayName, isTyping }) => {
      if (!self.typingEl) return;
      if (userId === (self.currentUser && self.currentUser.id)) return;
      if (isTyping) {
        self.typingEl.textContent = `${displayName || "Someone"} is typing...`;
        self.typingEl.hidden = false;
      } else {
        self.typingEl.hidden = true;
      }
    });
  };

  ChatController.prototype._send = function () {
    const text = this.input && this.input.value.trim();
    if (!text) return;

    const user = this.currentUser;
    const token = window.__slateToken || "";
    const guestId = localStorage.getItem("slateboard.guestId") || "";

    this.socket.emit("chat:send", {
      boardId: this.boardId,
      text,
      token,
      guestId,
    });

    if (this.input) this.input.value = "";
  };

  ChatController.prototype._handleFileUpload = async function (e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    // Optional: show a loading state on the upload button
    const originalBtnContent = this.uploadBtn.innerHTML;
    this.uploadBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';
    this.uploadBtn.disabled = true;

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/v1/chat/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");

      const data = await response.json();

      // Send message with file info
      this.socket.emit("chat:send", {
        boardId: this.boardId,
        token: window.__slateToken || "",
        guestId: localStorage.getItem("slateboard.guestId") || "",
        fileUrl: data.url,
        fileName: data.name,
        fileType: data.type,
      });
    } catch (error) {
      console.error("[chat] file upload error:", error);
      alert("Failed to upload file. Please try again.");
    } finally {
      this.uploadBtn.innerHTML = originalBtnContent;
      this.uploadBtn.disabled = false;
      this.fileInput.value = ""; // clear for next time
    }
  };

  ChatController.prototype._appendMessage = function (msg) {
    if (!this.messageList) return;

    const el = document.createElement("div");
    el.className = "chat-msg";
    const localGuestId = window.localStorage.getItem("slateboard.guestId");
    const isSelf = (this.currentUser && msg.userId === this.currentUser.id) || (msg.userId === localGuestId);
    if (isSelf) el.classList.add("chat-msg--self");

    const time = msg.createdAt
      ? new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : "";

    el.innerHTML = `
      <div class="chat-msg-header">
        <span class="chat-msg-name" style="color:${msg.color || "#ff6b6b"}">${escapeHtml(msg.displayName || "Guest")}</span>
        <span class="chat-msg-time">${time}</span>
      </div>
      ${msg.text ? `<div class="chat-msg-text">${escapeHtml(msg.text)}</div>` : ""}
      ${
        msg.fileUrl
          ? `
        <div class="chat-msg-file" style="margin-top:4px;">
          <a href="${msg.fileUrl}" download="${msg.fileName}" class="chat-file-download" style="display:inline-flex;align-items:center;gap:8px;padding:8px 12px;background:var(--color-white);border:2px solid var(--color-ink);color:var(--color-ink);text-decoration:none;font-size:0.75rem;font-weight:600;box-shadow:2px 2px 0 var(--color-ink);">
            <i class="fa-solid ${getFileIcon(msg.fileType)}"></i>
            <span style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(msg.fileName)}</span>
            <i class="fa-solid fa-download" style="opacity:0.6;font-size:0.7rem;"></i>
          </a>
        </div>`
          : ""
      }`;

    this.messageList.appendChild(el);
    this.messageList.scrollTop = this.messageList.scrollHeight;
  };

  ChatController.prototype.setOpen = function (open) {
    this.isOpen = open;
    if (this.panel) this.panel.hidden = !open;
    if (this.toggle) this.toggle.setAttribute("aria-expanded", String(open));
    if (open) {
      this.unread = 0;
      if (this.badge) this.badge.hidden = true;
      if (this.input) this.input.focus();
      if (this.messageList) this.messageList.scrollTop = this.messageList.scrollHeight;
    }
  };

  function escapeHtml(str) {
    return String(str).replace(
      /[&<>"']/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
    );
  }

  function getFileIcon(mimeType) {
    if (!mimeType) return "fa-file";
    if (mimeType.startsWith("image/")) return "fa-file-image";
    if (mimeType.startsWith("video/")) return "fa-file-video";
    if (mimeType.startsWith("audio/")) return "fa-file-audio";
    if (mimeType.includes("pdf")) return "fa-file-pdf";
    if (mimeType.includes("word") || mimeType.includes("officedocument.wordprocessingml"))
      return "fa-file-word";
    if (mimeType.includes("excel") || mimeType.includes("officedocument.spreadsheetml"))
      return "fa-file-excel";
    if (mimeType.includes("powerpoint") || mimeType.includes("officedocument.presentationml"))
      return "fa-file-powerpoint";
    if (mimeType.includes("zip") || mimeType.includes("archive")) return "fa-file-zipper";
    return "fa-file";
  }

  window.ChatController = ChatController;
})(window);
