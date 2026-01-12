// ==================== DOCUMENT MANAGEMENT ====================
let uploadedDocuments = [];

function addDocumentItem(filename, date, size) {
  uploadedDocuments.push({
    filename,
    date: new Date(date),
    size,
    id: `doc-${Date.now()}`,
  });
  renderDocuments();
}

function renderDocuments() {
  const container = document.getElementById("documents-container");

  if (uploadedDocuments.length === 0) {
    container.innerHTML = '<p class="no-documents">No documents loaded yet</p>';
    return;
  }

  container.innerHTML = uploadedDocuments
    .map(
      (doc) => `
    <div class="document-item" onclick="viewDocument('${doc.id}')">
      <div class="document-item-header">
        <span class="document-item-name" title="${doc.filename}">
          <i class="fas fa-file"></i> ${doc.filename}
        </span>
        <div class="document-item-actions">
          <button class="doc-action-btn" onclick="event.stopPropagation(); deleteDocument('${
            doc.id
          }')" title="Delete">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
      <div class="document-item-meta">
        📅 ${doc.date.toLocaleDateString()} | 📊 ${doc.size}
      </div>
    </div>
  `
    )
    .join("");
}

function deleteDocument(docId) {
  uploadedDocuments = uploadedDocuments.filter((doc) => doc.id !== docId);
  renderDocuments();
  showToast("Document removed", "info");
}

function viewDocument(docId) {
  const doc = uploadedDocuments.find((d) => d.id === docId);
  if (!doc) return;

  document.getElementById("modal-doc-name").textContent = doc.filename;
  document.getElementById("modal-doc-date").textContent =
    doc.date.toLocaleDateString();
  document.getElementById("modal-doc-size").textContent = doc.size;

  const modal = document.getElementById("document-modal");
  modal.classList.add("show");
}

function closeDocumentModal() {
  const modal = document.getElementById("document-modal");
  modal.classList.remove("show");
}

// ==================== FILE UPLOAD WITH DRAG & DROP ====================
const dragDropArea = document.getElementById("drag-drop-area");
const fileInput = document.getElementById("file");

// Prevent default drag behaviors
["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
  dragDropArea.addEventListener(eventName, preventDefaults, false);
  document.body.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

// Highlight drop area when item is dragged over it
["dragenter", "dragover"].forEach((eventName) => {
  dragDropArea.addEventListener(eventName, highlight, false);
});

["dragleave", "drop"].forEach((eventName) => {
  dragDropArea.addEventListener(eventName, unhighlight, false);
});

function highlight(e) {
  dragDropArea.classList.add("drag-over");
}

function unhighlight(e) {
  dragDropArea.classList.remove("drag-over");
}

// Handle dropped files
dragDropArea.addEventListener("drop", handleDrop, false);

function handleDrop(e) {
  const dt = e.dataTransfer;
  const files = dt.files;
  handleFiles(files);
}

function handleFiles(files) {
  if (files.length > 0) {
    const file = files[0];
    fileInput.files = files;
    uploadFile(file);
  }
}

function triggerFileUpload() {
  fileInput.click();
}

fileInput.addEventListener("change", function (e) {
  const file = e.target.files[0];
  if (file) {
    uploadFile(file);
  }
});

function uploadFile(file) {
  // Check file size (max 50MB for demo)
  const maxSize = 50 * 1024 * 1024;
  if (file.size > maxSize) {
    showToast("File size exceeds 50MB limit", "error");
    return;
  }

  const formData = new FormData();
  formData.append("file", file);

  // Show upload progress
  const progressDiv = document.getElementById("upload-progress");
  const progressFill = document.getElementById("progress-fill");
  progressDiv.style.display = "block";
  progressFill.style.width = "0%";

  // Simulate progress
  let progress = 0;
  const progressInterval = setInterval(() => {
    progress += Math.random() * 40;
    if (progress > 90) progress = 90;
    progressFill.style.width = progress + "%";
  }, 200);

  fetch("/upload", { method: "POST", body: formData })
    .then((res) => {
      clearInterval(progressInterval);
      progressFill.style.width = "100%";

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then((data) => {
      setTimeout(() => {
        progressDiv.style.display = "none";
      }, 500);

      // Add document to list
      const fileSize = (file.size / (1024 * 1024)).toFixed(2) + " MB";
      addDocumentItem(data.filename, new Date(), fileSize);

      // Clear welcome message and add system message
      const chat = document.getElementById("chat");
      const welcomeMsg = chat.querySelector(".chat-welcome");
      if (welcomeMsg) {
        welcomeMsg.style.display = "none";
      }

      // Add success message
      addChatMessage(
        "System",
        "✓ " + data.filename + " uploaded successfully.",
        "bot"
      );

      if (data.initial_reply) {
        addChatMessage("AI", data.initial_reply, "bot");
      }

      showToast("File uploaded successfully!", "success");
      fileInput.value = "";
    })
    .catch((err) => {
      clearInterval(progressInterval);
      progressDiv.style.display = "none";
      addChatMessage("Error", err.message, "bot", true);
      showToast("Upload failed: " + err.message, "error");
      fileInput.value = "";
    });
}

// ==================== MARKDOWN TO HTML CONVERSION ====================
function markdownToHtml(text) {
  // Escape HTML special characters first (except for formatting we'll add)
  let html = text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  // Convert markdown headers to HTML
  html = html.replace(/^### (.*?)$/gm, "<h4>$1</h4>");
  html = html.replace(/^## (.*?)$/gm, "<h3>$1</h3>");
  html = html.replace(/^# (.*?)$/gm, "<h2>$1</h2>");

  // Convert markdown bold (**text**) to strong
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

  // Convert markdown italic (*text*) to em
  html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");

  // Convert markdown italic (_text_) to em
  html = html.replace(/_(.*?)_/g, "<em>$1</em>");

  // Convert markdown code (backticks) to code tags
  html = html.replace(/`(.*?)`/g, "<code>$1</code>");

  // Convert markdown numbered lists to ordered lists
  html = html.replace(/^(\d+)\.\s+(.*?)$/gm, "<li>$2</li>");

  // Wrap consecutive list items in ol tags
  html = html.replace(/(<li>.*?<\/li>)/s, (match) => {
    if (!match.includes("<ol>")) {
      return "<ol>" + match + "</ol>";
    }
    return match;
  });

  // Clean up multiple ol tags
  html = html.replace(/<\/ol>\s*<ol>/g, "");

  // Convert markdown bullet points (*) to unordered lists
  html = html.replace(/^\* (.*?)$/gm, "<li>$1</li>");
  html = html.replace(/^- (.*?)$/gm, "<li>$1</li>");
  html = html.replace(/^\+ (.*?)$/gm, "<li>$1</li>");

  // Wrap consecutive list items in ul tags (if not already in ol)
  let inList = false;
  const lines = html.split("\n");
  const processedLines = lines.map((line) => {
    if (line.includes("<li>") && !line.includes("<ol>")) {
      if (!inList) {
        inList = true;
        return "<ul>" + line;
      }
      return line;
    } else if (inList && !line.includes("<li>")) {
      inList = false;
      return "</ul>" + line;
    }
    return line;
  });
  html = processedLines.join("\n");
  if (inList) {
    html += "</ul>";
  }

  // Clean up multiple ul tags
  html = html.replace(/<\/ul>\s*<ul>/g, "");

  // Convert line breaks to paragraphs
  html = html.replace(/\n\n+/g, "</p><p>");
  if (
    !html.includes("<p>") &&
    !html.includes("<h") &&
    !html.includes("<ul") &&
    !html.includes("<ol")
  ) {
    html = "<p>" + html + "</p>";
  }
  html = html.replace(/^([^<].)/gm, "<p>$1");
  html = html.replace(/([^>])$/gm, "$1</p>");

  // Clean up empty paragraphs
  html = html.replace(/<p><\/p>/g, "");
  html = html.replace(/<p>\s*<(h|u|o)/g, "<$1");
  html = html.replace(/<\/(h|u|o)[^>]*>\s*<\/p>/g, "</$1>");

  return html;
}

// ==================== CHAT FUNCTIONALITY ====================
function addChatMessage(sender, text, type, isError = false) {
  const chat = document.getElementById("chat");
  const msgDiv = document.createElement("div");
  msgDiv.className = `msg ${type}`;

  const bubble = document.createElement("div");
  bubble.className = `msg-bubble${isError ? " msg-error" : ""}`;

  if (type === "bot" || type === "system") {
    const senderLabel = `<strong class="msg-sender">${sender}</strong>`;
    const content = markdownToHtml(text);
    bubble.innerHTML = senderLabel + content;
  } else {
    bubble.innerHTML = escapeHtml(text);
  }

  msgDiv.appendChild(bubble);
  chat.appendChild(msgDiv);
  chat.scrollTop = chat.scrollHeight;
}

async function sendMsg() {
  const input = document.getElementById("msg");
  const msg = input.value.trim();

  if (!msg) return;

  // Check character limit
  if (msg.length > 500) {
    showToast("Message exceeds 500 character limit", "error");
    return;
  }

  const chat = document.getElementById("chat");

  // Hide welcome message if visible
  const welcomeMsg = chat.querySelector(".chat-welcome");
  if (welcomeMsg) {
    welcomeMsg.style.display = "none";
  }

  // Add user message
  addChatMessage("You", msg, "user");
  input.value = "";
  updateCharCount();

  // Show typing indicator
  const typingId = showTyping();

  // Retry logic with exponential backoff
  const maxRetries = 3;
  let attempt = 0;
  let lastError = null;

  while (attempt < maxRetries) {
    try {
      attempt++;
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
        throw new Error(body.error || "No response from server");
      }

      // Success
      removeTyping(typingId);
      addChatMessage("AI", body.response, "bot");
      return;
    } catch (err) {
      lastError = err;
      if (attempt >= maxRetries) break;

      // Exponential backoff
      await new Promise((r) => setTimeout(r, 500 * attempt));
    }
  }

  // All retries failed
  removeTyping(typingId);
  addChatMessage(
    "Error",
    lastError ? lastError.message : "Unknown error",
    "bot",
    true
  );
  showToast(
    "Failed to get response: " +
      (lastError ? lastError.message : "Unknown error"),
    "error"
  );
}

function showTyping() {
  const chat = document.getElementById("chat");
  const id = `typing-${Date.now()}`;
  const msgDiv = document.createElement("div");
  msgDiv.className = "msg bot typing";
  msgDiv.id = id;

  const bubble = document.createElement("div");
  bubble.className = "msg-bubble";

  const dots = document.createElement("div");
  dots.className = "typing-dots";
  dots.innerHTML = "<span></span><span></span><span></span>";

  bubble.appendChild(dots);
  msgDiv.appendChild(bubble);
  chat.appendChild(msgDiv);
  chat.scrollTop = chat.scrollHeight;

  return id;
}

function removeTyping(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function clearChat() {
  if (uploadedDocuments.length === 0) {
    showToast("No documents loaded", "info");
    return;
  }

  if (confirm("Clear all messages? This cannot be undone.")) {
    const chat = document.getElementById("chat");
    chat.innerHTML = `
      <div class="chat-welcome">
        <div class="welcome-icon">
          <i class="fas fa-comments"></i>
        </div>
        <h2 class="welcome-title">Chat Cleared</h2>
        <p class="welcome-text">Ready for a fresh conversation</p>
      </div>
    `;
    showToast("Chat cleared", "success");
  }
}

// ==================== CHARACTER COUNT ====================
document.getElementById("msg").addEventListener("input", updateCharCount);

function updateCharCount() {
  const input = document.getElementById("msg");
  const count = input.value.length;
  const max = 500;

  document.getElementById("char-count").textContent = count;

  const container = document.querySelector(".message-input-container");
  if (count > max * 0.8) {
    container.classList.add("near-limit");
  } else {
    container.classList.remove("near-limit");
  }
}

// ==================== SEND BUTTON STATE ====================
document.getElementById("msg").addEventListener("input", function () {
  const sendBtn = document.getElementById("send-btn");
  sendBtn.disabled = !this.value.trim();
});

// Enter key to send (Shift+Enter for new line)
document.getElementById("msg").addEventListener("keydown", function (e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMsg();
  }
});

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
  updateProfileDisplay();
  showToast("Profile saved successfully!", "success");
  closeProfileModal();
}

function updateProfileDisplay() {
  const profile = JSON.parse(localStorage.getItem("userProfile") || "{}");
  const nameDisplay = document.getElementById("user-name-display");

  if (profile.name) {
    nameDisplay.textContent = profile.name.split(" ")[0];
    document.getElementById("user-avatar").textContent = profile.name
      .charAt(0)
      .toUpperCase();
  } else {
    nameDisplay.textContent = "Profile";
    document.getElementById("user-avatar").innerHTML =
      '<i class="fas fa-user"></i>';
  }
}

// Close modal when clicking outside
window.addEventListener("click", function (event) {
  const profileModal = document.getElementById("profile-modal");
  const documentModal = document.getElementById("document-modal");

  if (event.target === profileModal) {
    closeProfileModal();
  }
  if (event.target === documentModal) {
    closeDocumentModal();
  }
});

// ==================== SIDEBAR TOGGLE (MOBILE) ====================
function toggleSidebar() {
  const sidebar = document.querySelector(".sidebar");
  sidebar.classList.toggle("open");
}

// Close sidebar when clicking outside
document.addEventListener("click", function (e) {
  const sidebar = document.querySelector(".sidebar");
  const sidebarToggle = document.querySelector(".sidebar-toggle-mobile");

  if (!sidebar.contains(e.target) && !sidebarToggle.contains(e.target)) {
    sidebar.classList.remove("open");
  }
});

// ==================== TOAST NOTIFICATIONS ====================
function showToast(message, type = "info") {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = `toast show ${type}`;

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

// ==================== VOICE INPUT (PLACEHOLDER) ====================
function toggleVoiceInput() {
  showToast("Voice input coming soon!", "info");
}

// ==================== HTML ESCAPE ====================
function escapeHtml(unsafe) {
  return unsafe
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ==================== INITIALIZATION ====================
document.addEventListener("DOMContentLoaded", function () {
  updateProfileDisplay();
  document.getElementById("send-btn").disabled = true;
  renderDocuments();

  // Add welcome animation
  const chat = document.getElementById("chat");
  chat.style.animation = "fadeInUp 0.8s ease-out";
});
