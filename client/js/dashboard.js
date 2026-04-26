(function () {
  "use strict";

  // ── DOM refs ──────────────────────────────────────────────────────────────
  const boardsGrid = document.getElementById("boards-grid");
  const emptyState = document.getElementById("dashboard-empty");
  const newBoardBtn = document.getElementById("new-board-button");
  const logoutBtn = document.getElementById("logout-button");
  const userDisplay = document.getElementById("dashboard-user");
  const loadMoreBtn = document.getElementById("load-more-button");
  const totalCount = document.getElementById("total-boards-count");
  const recentSection = document.getElementById("recent-boards");
  const recentGrid = document.getElementById("recent-grid");
  const themeBtn = document.getElementById("theme-toggle");

  let currentPage = 1;
  const PAGE_LIMIT = 12;
  let totalPages = 1;
  let currentUser = null;

  // ── Theme ─────────────────────────────────────────────────────────────────
  const savedTheme = localStorage.getItem("slateboard-theme") || "light";
  document.documentElement.dataset.theme = savedTheme;

  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      localStorage.setItem("slateboard-theme", next);
      themeBtn.innerHTML =
        next === "dark" ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
    });
    themeBtn.innerHTML =
      savedTheme === "dark"
        ? '<i class="fa-solid fa-sun"></i>'
        : '<i class="fa-solid fa-moon"></i>';
  }

  // ── Fetch helper ─────────────────────────────────────────────────────────
  async function api(path, options) {
    const token = localStorage.getItem("slateboard.token") || "";
    const headers = Object.assign(
      token ? { Authorization: "Bearer " + token } : {},
      (options && options.headers) || {}
    );
    const res = await fetch(path, Object.assign({ credentials: "include", headers }, options || {}));
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.message || "Request failed.");
      err.status = res.status;
      throw err;
    }
    return data;
  }

  // ── Relative time ─────────────────────────────────────────────────────────
  function relativeTime(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d}d ago`;
    return new Date(dateStr).toLocaleDateString();
  }

  // ── Board card renderer ──────────────────────────────────────────────────
  const ACCENT_COLORS = ["#ff6b6b", "#ffd93d", "#c4b5fd", "#2ec4b6", "#ff9f1c", "#7bd389"];

  function accentFor(roomKey) {
    let sum = 0;
    for (let i = 0; i < roomKey.length; i++) sum += roomKey.charCodeAt(i);
    return ACCENT_COLORS[sum % ACCENT_COLORS.length];
  }

  function createBoardCard(item) {
    const card = document.createElement("article");
    card.className = "dash-card";
    const accent = accentFor(item.roomKey || "");

    card.innerHTML = `
      <div class="dash-card-accent" style="background:${accent}"></div>
      <div class="dash-card-body">
        <p class="dash-card-key">${item.roomKey || ""}</p>
        <h2 class="dash-card-title">${escapeHtml(item.title || "Untitled board")}</h2>
        <p class="dash-card-meta">${relativeTime(item.updatedAt)}</p>
      </div>
      <div class="dash-card-footer">
        <a class="dash-open-btn" href="./board.html?roomKey=${encodeURIComponent(item.roomKey)}">
          <i class="fa-solid fa-arrow-right"></i> Open
        </a>
        <button class="dash-delete-btn" data-room="${escapeHtml(item.roomKey)}" aria-label="Delete board" title="Delete board">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>`;

    card.querySelector(".dash-delete-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      deleteBoard(item.roomKey, card);
    });

    return card;
  }

  function escapeHtml(str) {
    return String(str).replace(
      /[&<>"']/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
    );
  }

  // ── Render boards ────────────────────────────────────────────────────────
  function renderBoards(items, append) {
    if (!append) boardsGrid.innerHTML = "";

    if (items.length === 0 && !append) {
      emptyState.hidden = false;
      if (loadMoreBtn) loadMoreBtn.hidden = true;
      return;
    }

    emptyState.hidden = true;
    items.forEach((item) => boardsGrid.appendChild(createBoardCard(item)));

    if (loadMoreBtn) loadMoreBtn.hidden = currentPage >= totalPages;
  }

  // ── Load boards (paginated) ──────────────────────────────────────────────
  async function loadBoards(page, append) {
    try {
      const data = await api(`/api/v1/boards?page=${page}&limit=${PAGE_LIMIT}`);
      totalPages = data.meta ? data.meta.pages : 1;
      const boards = data.boards || data;
      if (totalCount) totalCount.textContent = data.meta ? data.meta.total : boards.length;
      renderBoards(boards, append);
    } catch (error) {
      // Only redirect to auth on 401 Unauthorized, not on server errors
      if (error.status === 401) {
        localStorage.removeItem("slateboard.token");
        window.location.href = "./auth.html";
      } else {
        console.error("[dashboard] loadBoards error:", error);
      }
    }
  }

  // ── Load recent boards ───────────────────────────────────────────────────
  async function loadRecent() {
    try {
      const data = await api("/api/v1/boards/recent");
      const boards = data.boards || [];
      if (!recentGrid || boards.length === 0) {
        if (recentSection) recentSection.hidden = true;
        return;
      }
      recentGrid.innerHTML = "";
      boards.slice(0, 4).forEach((item) => recentGrid.appendChild(createBoardCard(item)));
    } catch (_) {
      if (recentSection) recentSection.hidden = true;
    }
  }

  // ── Delete board ─────────────────────────────────────────────────────────
  async function deleteBoard(roomKey, cardEl) {
    if (!confirm(`Delete board ${roomKey}? This cannot be undone.`)) return;
    try {
      await api(`/api/v1/boards/${roomKey}`, { method: "DELETE" });
      cardEl.remove();
      // Refresh grid stats
      await loadBoards(1, false);
    } catch (error) {
      alert("Delete failed: " + error.message);
    }
  }

  // ── New board ────────────────────────────────────────────────────────────
  if (newBoardBtn) {
    newBoardBtn.addEventListener("click", async () => {
      newBoardBtn.disabled = true;
      newBoardBtn.textContent = "Creating...";
      try {
        const board = await api("/api/v1/boards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "Untitled board" }),
        });
        window.location.href = "./board.html?roomKey=" + encodeURIComponent(board.roomKey);
      } catch (error) {
        newBoardBtn.disabled = false;
        newBoardBtn.textContent = "New board";
        alert("Failed: " + error.message);
      }
    });
  }

  // ── Logout ────────────────────────────────────────────────────────────────
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        await fetch("/api/v1/auth/logout", { method: "DELETE", credentials: "include" });
      } finally {
        window.location.href = "./auth.html";
      }
    });
  }

  // ── Load more ────────────────────────────────────────────────────────────
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", async () => {
      currentPage++;
      await loadBoards(currentPage, true);
    });
  }

  // ── Init ─────────────────────────────────────────────────────────────────
  async function init() {
    try {
      const auth = await api("/api/v1/auth/refresh", { method: "POST" });
      if (auth && auth.user) {
        currentUser = auth.user;
        if (userDisplay) userDisplay.textContent = auth.user.displayName || auth.user.email;
      }
    } catch (_) {
      window.location.href = "./auth.html";
      return;
    }

    await Promise.all([loadBoards(1, false), loadRecent()]);
  }

  init();
})();
