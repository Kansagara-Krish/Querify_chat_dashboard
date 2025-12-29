// ==================== FILE UPLOAD ====================
function triggerFileUpload() {
  document.getElementById("file").click();
}

document.getElementById("file").addEventListener("change", function (e) {
  const file = e.target.files[0];
  if (file) {
    const fileName = file.name;
    document.getElementById("filename-display").textContent = fileName;
    uploadFile(file);
  }
});

function uploadFile(file) {
  const formData = new FormData();
  formData.append("file", file);

  fetch("/upload", { method: "POST", body: formData })
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then((data) => {
      const chat = document.getElementById("chat");
      chat.innerHTML += `<div class="msg bot"><b>System:</b> ✓ "${data.filename}" uploaded successfully.</div>`;
      if (data.initial_reply) {
        chat.innerHTML += `<div class="msg bot"><b>AI:</b> ${data.initial_reply}</div>`;
      }
      chat.scrollTop = chat.scrollHeight;
    })
    .catch((err) => {
      document.getElementById(
        "chat"
      ).innerHTML += `<div class="msg bot error"><b>Error:</b> ${err.message}</div>`;
      document.getElementById("filename-display").textContent = "";
    });
}

// ==================== SEND MESSAGE ====================
async function sendMsg() {
  const input = document.getElementById("msg");
  const msg = input.value;
  if (!msg.trim()) return;
  const chat = document.getElementById("chat");

  // show user's message immediately
  chat.innerHTML += `<div class="msg user"><b>You:</b> ${escapeHtml(
    msg
  )}</div>`;
  chat.scrollTop = chat.scrollHeight;

  // show typing indicator while waiting for AI
  const typingId = showTyping();

  // retry logic: silent retries when server gives no response or transient errors
  const maxRetries = 3;
  let attempt = 0;
  let lastError = null;

  while (attempt < maxRetries) {
    try {
      attempt += 1;
      const res = await fetch("/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errMsg = body.error || body.detail || `HTTP ${res.status}`;
        throw new Error(errMsg);
      }

      if (!body.response) {
        // treat missing response as transient and retry
        const errMsg = body.error || "No response from server";
        throw new Error(errMsg);
      }

      // success
      removeTyping(typingId);
      chat.innerHTML += `<div class="msg bot"><b>AI:</b> ${body.response}</div>`;
      chat.scrollTop = chat.scrollHeight;
      input.value = "";
      return;
    } catch (err) {
      lastError = err;
      // if it's the last attempt, break and show error
      if (attempt >= maxRetries) break;
      // small backoff before retrying
      await new Promise((r) => setTimeout(r, 500 * attempt));
    }
  }

  // all retries failed — show error
  removeTyping(typingId);
  document.getElementById(
    "chat"
  ).innerHTML += `<div class="msg bot error"><b>Error:</b> ${escapeHtml(
    lastError ? lastError.message : "Unknown error"
  )}</div>`;
}

// ==================== PROFILE MODAL ====================
function openProfileModal() {
  const modal = document.getElementById("profile-modal");
  modal.classList.add("show");
  loadProfileData();
}

function closeProfileModal() {
  const modal = document.getElementById("profile-modal");
  modal.classList.remove("show");
}

function loadProfileData() {
  const profile = JSON.parse(localStorage.getItem("userProfile") || "{}");
  document.getElementById("profile-name").value = profile.name || "";
  document.getElementById("profile-email").value = profile.email || "";
  document.getElementById("profile-phone").value = profile.phone || "";
  document.getElementById("profile-bio").value = profile.bio || "";
}

function saveProfile(event) {
  event.preventDefault();
  const profile = {
    name: document.getElementById("profile-name").value,
    email: document.getElementById("profile-email").value,
    phone: document.getElementById("profile-phone").value,
    bio: document.getElementById("profile-bio").value,
  };
  localStorage.setItem("userProfile", JSON.stringify(profile));
  updateProfileButtonStyle();
  alert("Profile saved successfully!");
  closeProfileModal();
}

// Close modal when clicking outside
window.addEventListener("click", function (event) {
  const modal = document.getElementById("profile-modal");
  if (event.target == modal) {
    modal.classList.remove("show");
  }
});

// ==================== SEND BUTTON STATE ====================
document.getElementById("msg").addEventListener("input", function () {
  const sendBtn = document.getElementById("send-btn");
  if (this.value.trim()) {
    sendBtn.classList.add("active");
  } else {
    sendBtn.classList.remove("active");
  }
});

/* ============================
   ENTER KEY SEND SUPPORT
   ============================ */
document.getElementById("msg").addEventListener("keydown", function (e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMsg();
  }
});

// ------------------ Typing Indicator Helpers ------------------
function showTyping() {
  const chat = document.getElementById("chat");
  const id = `typing-${Date.now()}`;
  const el = document.createElement("div");
  el.className = "msg bot typing";
  el.id = id;
  el.innerHTML = `<div class="typing-dots"><span></span><span></span><span></span></div>`;
  chat.appendChild(el);
  chat.scrollTop = chat.scrollHeight;
  return id;
}

function removeTyping(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

// simple HTML escape to avoid injection when echoing user input
function escapeHtml(unsafe) {
  return unsafe
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ==================== PROFILE BUTTON STYLING ====================
function updateProfileButtonStyle() {
  const profile = JSON.parse(localStorage.getItem("userProfile") || "{}");
  const profileBtn = document.getElementById("profile-btn");

  if (profile.name || profile.email) {
    profileBtn.classList.add("active");
  } else {
    profileBtn.classList.remove("active");
  }
}

// Initialize profile button style on page load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", updateProfileButtonStyle);
} else {
  updateProfileButtonStyle();
}
