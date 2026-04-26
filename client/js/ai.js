/**
 * AI Controller (Groq + LLaMA 3.1)
 * Manages the academic AI chat interface.
 */
(function (window) {
  "use strict";

  function AiController(engine) {
    this.engine = engine;
    this.panel = document.getElementById("ai-panel");
    this.toggle = document.getElementById("ai-toggle");
    this.closeBtn = document.getElementById("ai-close");
    
    this.promptInput = document.getElementById("ai-prompt");
    this.sendBtn = document.getElementById("ai-generate-btn"); // Repurposed as send button
    this.responseArea = document.getElementById("ai-response");

    this.messages = [];
    this.isOpen = false;
    this.isLoading = false;

    if (!this.panel) return;

    this._bindEvents();
  }

  AiController.prototype._bindEvents = function () {
    const self = this;
    if (this.toggle) {
      this.toggle.addEventListener("click", () => self.setOpen(!self.isOpen));
    }
    if (this.closeBtn) {
      this.closeBtn.addEventListener("click", () => self.setOpen(false));
    }
    if (this.sendBtn) {
      this.sendBtn.addEventListener("click", () => self.sendChat());
    }
    if (this.promptInput) {
      this.promptInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          self.sendChat();
        }
      });
    }
  };

  AiController.prototype.setOpen = function (open) {
    this.isOpen = open;
    if (this.panel) this.panel.hidden = !open;
    if (this.toggle) this.toggle.setAttribute("aria-expanded", String(open));
    if (open && this.promptInput) this.promptInput.focus();
  };

  AiController.prototype._setLoading = function (loading) {
    this.isLoading = loading;
    if (this.sendBtn) this.sendBtn.disabled = loading;
    if (this.promptInput) this.promptInput.disabled = loading;
    
    if (loading) {
      this._appendUI("system", '<i class="fa-solid fa-circle-notch fa-spin"></i> AI is thinking...');
    } else {
      // Remove loading indicator if it's the last child
      const lastChild = this.responseArea.lastElementChild;
      if (lastChild && lastChild.classList.contains("msg-system")) {
        this.responseArea.removeChild(lastChild);
      }
    }
  };

  AiController.prototype._appendUI = function (role, htmlContent) {
    const div = document.createElement("div");
    div.style.padding = "10px 14px";
    div.style.border = "2px solid var(--color-ink)";
    div.style.borderRadius = "0"; // Neo-brutalism sharp corners
    div.style.boxShadow = "2px 2px 0px var(--color-ink)";
    div.style.lineHeight = "1.4";
    div.style.fontWeight = "500";
    div.className = "msg-" + role;

    if (role === "user") {
      div.style.background = "var(--color-sea)";
      div.style.color = "var(--color-white)";
      div.style.alignSelf = "flex-end";
      div.style.maxWidth = "85%";
      div.innerHTML = `<strong>You</strong><br/><span style="font-weight: 400">${htmlContent}</span>`;
    } else if (role === "assistant") {
      div.style.background = "var(--color-white)";
      div.style.color = "var(--color-ink)";
      div.style.alignSelf = "flex-start";
      div.style.maxWidth = "95%";
      const formatted = this._formatMarkdown(htmlContent);
      div.innerHTML = `<strong><i class="fa-solid fa-graduation-cap"></i> Assistant</strong><br/><span style="font-weight: 400">${formatted}</span>`;
    } else {
      // system / loading
      div.style.alignSelf = "center";
      div.style.color = "var(--color-ink)";
      div.style.background = "var(--color-secondary)";
      div.style.fontSize = "0.85rem";
      div.style.border = "2px solid var(--color-ink)";
      div.style.boxShadow = "1px 1px 0px var(--color-ink)";
      div.style.padding = "6px 12px";
      div.innerHTML = htmlContent;
    }

    this.responseArea.appendChild(div);
    this.responseArea.scrollTop = this.responseArea.scrollHeight;
  };

  AiController.prototype._formatMarkdown = function (text) {
    if (!text) return "";
    return text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/^\s*-\s+(.*)$/gm, "• $1<br/>")
      .replace(/\n/g, "<br/>");
  };

  AiController.prototype.sendChat = async function () {
    const text = (this.promptInput.value || "").trim();
    if (!text || this.isLoading) return;

    this.promptInput.value = "";
    
    // Add to local state
    this.messages.push({ role: "user", content: text });
    this._appendUI("user", text);
    this._setLoading(true);

    try {
      const token = window.__slateToken || "";
      const headers = token ? { Authorization: "Bearer " + token, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
      
      const res = await fetch("/api/v1/ai/chat", {
        method: "POST",
        headers,
        body: JSON.stringify({ messages: this.messages }),
      });
      const data = await res.json();
      if (res.status === 401) {
        throw new Error("Please <a href='/login.html' style='color:var(--color-accent); font-weight:bold;'>login</a> to use the Academic AI Assistant.");
      }
      if (!res.ok) throw new Error(data.message || "Failed to get AI response");
      
      const aiResponse = data.response;
      this.messages.push({ role: "assistant", content: aiResponse });
      
      this._setLoading(false);
      this._appendUI("assistant", aiResponse.replace(/\\n/g, "<br>"));
    } catch (err) {
      console.error(err);
      this._setLoading(false);
      this._appendUI("system", `<span style="color:red"><i class="fa-solid fa-triangle-exclamation"></i> ${err.message}</span>`);
    }
  };

  window.AiController = AiController;
})(window);
