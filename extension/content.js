// 1. Communication with FocusForge Web App
const isFocusForgeApp = window.location.hostname === "localhost" || 
                       window.location.hostname === "127.0.0.1" ||
                       window.location.hostname.includes("vercel.app") ||
                       window.location.href.includes("focus-forge") ||
                       window.location.href.includes("code-kada");

if (isFocusForgeApp) {
  // Listen for state changes from the app via postMessage
  window.addEventListener("message", (event) => {
    // Only accept messages from the window itself
    if (event.source !== window) return;

    if (event.data && event.data.type === "FOCUSFORGE_TIMER_STATE") {
      console.log("[FocusForge] Received State Update:", event.data);
      chrome.runtime.sendMessage({ 
        type: "SET_FOCUS_MODE", 
        active: event.data.active,
        domains: event.data.domains
      });
    }

    if (event.data && event.data.type === "FOCUSFORGE_TIMER_FINISHED") {
      chrome.runtime.sendMessage({ type: "TIMER_FINISHED" });
    }
  });
}

// 2. Global Blur Enforcement Logic
function updateBlur(active, domains = []) {
  const currentHostname = window.location.hostname.toLowerCase();
  
  // NEVER BLUR THESE DOMAINS - ABSOLUTE WHITELIST
  const WHITELIST = [
    "localhost", 
    "127.0.0.1", 
    "google.com", 
    "gmail.com", 
    "mail.google.com",
    "googleusercontent.com", 
    "googleapis.com", 
    "focusforge", 
    "supabase.co"
  ];
  
  const isWhitelisted = WHITELIST.some(w => currentHostname.includes(w));
  
  if (isWhitelisted) {
    console.log(`[FocusForge] Whitelist match: ${currentHostname}. Forcing unblur.`);
    document.documentElement.classList.remove("focusforge-distraction");
    const overlay = document.getElementById("focusforge-shield-overlay");
    if (overlay) overlay.remove();
    return;
  }

  const distractionList = (domains || []).filter(d => d && d.length > 3);
  
  console.log(`[FocusForge] Active: ${active}, Domains:`, distractionList);

  if (!active || distractionList.length === 0) {
    document.documentElement.classList.remove("focusforge-distraction");
    const overlay = document.getElementById("focusforge-shield-overlay");
    if (overlay) overlay.remove();
    return;
  }

  const isDistraction = distractionList.some(d => {
    const blocked = d.toLowerCase().trim().replace(/^(https?:\/\/)?(www\.)?/, "");
    const host = currentHostname.replace(/^www\./, "");
    return host === blocked || host.endsWith("." + blocked) || blocked.endsWith("." + host);
  });

  if (active && isDistraction) {
    document.documentElement.classList.add("focusforge-distraction");
    
    if (!document.getElementById("focusforge-shield-overlay")) {
      const overlay = document.createElement("div");
      overlay.id = "focusforge-shield-overlay";
      
      const siteName = window.location.hostname.split('.')[1]?.toUpperCase() || "DISTRACTION";
      
      overlay.innerHTML = `
        <div style="text-align: center; color: white; font-family: 'Inter', sans-serif; padding: 40px; background: rgba(15, 23, 42, 0.9); border-radius: 32px; border: 1px solid rgba(255,255,255,0.1); backdrop-filter: blur(20px); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
          <div style="font-size: 64px; margin-bottom: 24px;">🛡️</div>
          <h1 style="font-size: 32px; font-weight: 900; margin-bottom: 12px; letter-spacing: -0.02em;">FOCUSFORGE SHIELD</h1>
          <p style="font-size: 18px; color: #94a3b8; margin-bottom: 32px;">${siteName} is currently restricted to protect your productivity.</p>
          <div style="font-[10px]; font-weight: 900; text-transform: uppercase; letter-spacing: 0.2em; color: #3b82f6;">Teacher Managed Policy</div>
        </div>
      `;
      document.body.appendChild(overlay);
    }
  } else {
    document.documentElement.classList.remove("focusforge-distraction");
    const overlay = document.getElementById("focusforge-shield-overlay");
    if (overlay) overlay.remove();
  }
}

// Listen for messages from background.js
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "FOCUS_STATE_CHANGED") {
    updateBlur(message.active, message.domains);
  } else if (message.type === "PLAY_NOTIFICATION") {
    // Play sound even on other tabs
    const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
    audio.play().catch(() => {});
  }
});
