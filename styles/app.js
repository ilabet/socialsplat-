document.addEventListener("DOMContentLoaded", () => {
  const navLinks = document.querySelectorAll(".nav-links a");
  const pollButtons = document.querySelectorAll(".poll-option-btn");
  const inventoryItems = document.querySelectorAll(".inventory-item");
  const buyBtn = document.querySelector(".btn-action-primary");
  const connectBtn = document.querySelector(".btn-primary");
  const heroCard = document.querySelector(".hero-card");
  const joystick = document.querySelector(".roblox-joystick");
  const jumpBtn = document.querySelector(".roblox-jump-btn");
  const audio = document.querySelector(".custom-audio-element");

  const state = {
    theme: localStorage.getItem("hush-theme") || "#ff66a3",
    selectedPoll: localStorage.getItem("hush-poll") || "",
    selectedInventory: localStorage.getItem("hush-inventory") || "Mesh Body"
  };

  function toast(message) {
    let el = document.querySelector(".toast");
    if (!el) {
      el = document.createElement("div");
      el.className = "toast";
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(window.toastTimer);
    window.toastTimer = setTimeout(() => el.classList.remove("show"), 1800);
  }

  function setActiveNav(hash) {
    navLinks.forEach(link => link.classList.toggle("active", link.getAttribute("href") === hash));
  }

  navLinks.forEach(link => {
    link.addEventListener("click", e => {
      const href = link.getAttribute("href");
      if (href.startsWith("#")) {
        e.preventDefault();
        document.querySelector(href)?.scrollIntoView({ behavior: "smooth", block: "start" });
        setActiveNav(href);
        history.replaceState(null, "", href);
      }
    });
  });

  window.addEventListener("scroll", () => {
    const sections = ["#feed", "#profile"];
    let current = "#feed";
    sections.forEach(id => {
      const el = document.querySelector(id);
      if (el && el.getBoundingClientRect().top <= 120) current = id;
    });
    setActiveNav(current);
  });

  pollButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      pollButtons.forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      localStorage.setItem("hush-poll", btn.textContent.trim());
      toast(`Vote saved: ${btn.textContent.trim()}`);
    });
  });

  inventoryItems.forEach(item => {
    item.addEventListener("click", () => {
      inventoryItems.forEach(i => i.classList.remove("active"));
      item.classList.add("active");
      localStorage.setItem("hush-inventory", item.textContent.trim());
      toast(`Equipped: ${item.textContent.trim()}`);
    });
  });

  if (buyBtn) {
    buyBtn.addEventListener("click", () => {
      toast("Marketplace checkout flow would open here.");
    });
  }

  if (connectBtn) {
    connectBtn.addEventListener("click", async () => {
      toast("Connecting viewer...");
      connectBtn.disabled = true;
      connectBtn.textContent = "Connecting...";
      await new Promise(r => setTimeout(r, 1200));
      connectBtn.textContent = "Viewer Connected";
      toast("Viewer connected.");
    });
  }

  if (heroCard) {
    heroCard.addEventListener("mouseenter", () => {
      heroCard.style.transform = "translateY(-2px)";
    });
    heroCard.addEventListener("mouseleave", () => {
      heroCard.style.transform = "";
    });
  }

  if (joystick) {
    let dragging = false;
    let origin = { x: 0, y: 0 };

    joystick.addEventListener("pointerdown", e => {
      dragging = true;
      origin = { x: e.clientX, y: e.clientY };
      joystick.setPointerCapture(e.pointerId);
    });

    window.addEventListener("pointermove", e => {
      if (!dragging) return;
      const dx = Math.max(-18, Math.min(18, e.clientX - origin.x));
      const dy = Math.max(-18, Math.min(18, e.clientY - origin.y));
      joystick.style.transform = `translate(${dx}px, ${dy}px)`;
    });

    window.addEventListener("pointerup", () => {
      dragging = false;
      joystick.style.transform = "";
    });
  }

  if (jumpBtn) {
    jumpBtn.addEventListener("click", () => toast("Jump action triggered."));
  }

  if (audio) {
    audio.volume = 0.4;
  }

  const savedPoll = state.selectedPoll;
  if (savedPoll) {
    pollButtons.forEach(btn => {
      if (btn.textContent.trim() === savedPoll) btn.classList.add("selected");
    });
  }

  const savedInventory = state.selectedInventory;
  if (savedInventory) {
    inventoryItems.forEach(item => {
      if (item.textContent.trim() === savedInventory) item.classList.add("active");
    });
  }

  const style = document.documentElement.style;
  style.setProperty("--user-theme-color", state.theme);
});
