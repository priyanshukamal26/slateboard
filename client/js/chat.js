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
      <div class="chat-msg-text">${escapeHtml(msg.text)}</div>`;

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

  window.ChatController = ChatController;
})(window);
