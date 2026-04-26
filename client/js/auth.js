(function () {
  "use strict";

  async function send(path, payload) {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "Request failed.");
    return data;
  }

  function showFeedback(el, message, isSuccess) {
    if (!el) return;
    el.textContent = message;
    el.dataset.kind = isSuccess ? "success" : "error";
    el.hidden = false;
    el.classList.add("visible");
    if (isSuccess) setTimeout(() => el.classList.remove("visible"), 4000);
  }

  // ── Login form ─────────────────────────────────────────────────────────
  const loginForm = document.getElementById("login-form");
  const loginFeedback = document.getElementById("login-feedback");

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = loginForm.querySelector(".auth-submit-btn");
      btn.classList.add("loading");
      try {
        await send("/api/v1/auth/login", {
          email: document.getElementById("login-email").value,
          password: document.getElementById("login-password").value,
        });
        window.location.href = "./dashboard.html";
      } catch (error) {
        showFeedback(loginFeedback, error.message, false);
      } finally {
        btn.classList.remove("loading");
      }
    });
  }

  // ── Register form ──────────────────────────────────────────────────────
  const registerForm = document.getElementById("register-form");
  const registerFeedback = document.getElementById("register-feedback");

  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = registerForm.querySelector(".auth-submit-btn");
      btn.classList.add("loading");
      try {
        await send("/api/v1/auth/register", {
          displayName: document.getElementById("register-name").value,
          email: document.getElementById("register-email").value,
          password: document.getElementById("register-password").value,
        });
        window.location.href = "./dashboard.html";
      } catch (error) {
        showFeedback(registerFeedback, error.message, false);
      } finally {
        btn.classList.remove("loading");
      }
    });
  }

  // ── Forgot password ────────────────────────────────────────────────────
  const forgotForm = document.getElementById("forgot-form");
  const forgotFeedback = document.getElementById("forgot-feedback");

  if (forgotForm) {
    forgotForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = forgotForm.querySelector(".auth-submit-btn");
      btn.classList.add("loading");
      try {
        const data = await send("/api/v1/auth/forgot-password", {
          email: document.getElementById("forgot-email").value,
        });
        showFeedback(
          forgotFeedback,
          data.message || "Check your console for the reset link.",
          true
        );
      } catch (error) {
        showFeedback(forgotFeedback, error.message, false);
      } finally {
        btn.classList.remove("loading");
      }
    });
  }

  // ── Tab switching ──────────────────────────────────────────────────────
  const tabs = document.querySelectorAll(".auth-tab-btn");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.tab;
      tabs.forEach((t) => t.classList.toggle("is-active", t.dataset.tab === target));
      document.querySelectorAll(".auth-form-panel").forEach((panel) => {
        panel.classList.toggle("is-active", panel.id === target + "-form");
      });
    });
  });

  // Activate login tab by default
  const loginTab = document.querySelector('[data-tab="login"]');
  if (loginTab) loginTab.click();
})();
