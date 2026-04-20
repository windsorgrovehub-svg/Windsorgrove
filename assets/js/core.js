const API_URL = '/api';




let state = {
  user: null,
  hotels: [],
  transactions: [],
  chat: [],
  adminAlert: false,
  adminNotifications: []
};

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const fmt = n => Number(n).toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 });

const saveState = () => {
    if (state.token) {
        if (state.user && state.user.email === 'admin@windorgrove.com') {
            localStorage.setItem("wgh-admin-token", state.token);
        } else {
            localStorage.setItem("wgh-token", state.token);
        }
    }
};

const loadState = async () => {
    const isAdmin = window.location.pathname.includes('admin.html');
    const token = localStorage.getItem(isAdmin ? "wgh-admin-token" : "wgh-token");
    if (token) {
        state.token = token;
        try {
            const res = await fetch(`${API_URL}/user/profile?_t=${Date.now()}`, {
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache'
                }
            });
            if (res.ok) {
                const data = await res.json();
                state.user = data.user;
                state.transactions = data.transactions;
            } else {
                localStorage.removeItem(isAdmin ? "wgh-admin-token" : "wgh-token");
                state.token = null;
            }
        } catch (e) { console.error("Sync error", e); }
    }
    // Always fetch chats (either for user or guest)
    await api.fetchChats();
    // Fetch notifications if logged in
    if (state.token) {
        await api.fetchNotifications();
    }
};

const toast = msg => {
  const t = document.createElement("div");
  t.className = "toast"; t.textContent = msg;
  $("#toasts").appendChild(t);
  setTimeout(() => t.remove(), 2600);
};

const getOrSetGuestId = () => {
    let gid = localStorage.getItem("wgh-guest-id");
    if (!gid) {
        gid = 'gst_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem("wgh-guest-id", gid);
    }
    return gid;
};

// --- API ACTIONS ---
const api = {
    async login(email, password) {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (res.ok) {
            state.token = data.token;
            state.user = data.user;
            saveState();
            return true;
        }
        throw new Error(data.error);
    },
    async signup(name, email, phone_number, password, invite_code) {
        const res = await fetch(`${API_URL}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, phone_number, password, invite_code })
        });
        const data = await res.json();
        if (res.ok) {
            state.token = data.token;
            state.user = data.user;
            saveState();
            return true;
        }
        throw new Error(data.error);
    },
    async submitRating(hotelId, ratings, review, comments) {
        const res = await fetch(`${API_URL}/missions/rate`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.token}`
            },
            body: JSON.stringify({ hotelId, ratings, review, comments })
        });
        const data = await res.json();
        
        // Commission is now PENDING until all missions are completed
        if (data.success) {
            if (!state.transactions) state.transactions = [];
            if (data.transaction) state.transactions.unshift(data.transaction);
            
            // Only update balance locally if ALL missions are done (bulk credit happened)
            if (data.all_completed && data.total_credited) {
                if (!state.user.balance) state.user.balance = 0;
                if (!state.user.commission_total) state.user.commission_total = 0;
                state.user.balance = parseFloat(Number(state.user.balance) + Number(data.total_credited)).toFixed(2);
                state.user.commission_total = parseFloat(Number(state.user.commission_total) + Number(data.total_credited)).toFixed(2);
            }
            
            saveState();
        }
        
        return data;
    },
    async sendMessage(text) {
        const isFirst = state.chat.length === 0;
        const payload = { text, isFirst };
        if (!state.token) payload.guest_id = getOrSetGuestId();

        const headers = { 'Content-Type': 'application/json' };
        if (state.token) headers['Authorization'] = `Bearer ${state.token}`;

        const res = await fetch(`${API_URL}/chats`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload)
        });
        const msg = await res.json();
        state.chat.push(msg);
        return msg;
    },
    async fetchChats() {
        const headers = {};
        let url = `${API_URL}/chats`;
        if (state.token) {
            headers['Authorization'] = `Bearer ${state.token}`;
        } else {
            url += `?guest_id=${getOrSetGuestId()}`;
        }

        const res = await fetch(url, { headers });
        if (res.ok) {
            state.chat = await res.json();
        }
    },
    async fetchNotifications() {
        const res = await fetch(`${API_URL}/notifications`, {
            headers: { 'Authorization': `Bearer ${state.token}` }
        });
        if (res.ok) {
            state.adminNotifications = await res.json();
        }
    },
    async readNotifications(id = null) {
        const res = await fetch(`${API_URL}/notifications/read`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.token}` },
            body: JSON.stringify(id ? { id } : {})
        });
        if (res.ok) {
            if (id) {
                state.adminNotifications = state.adminNotifications.filter(n => n.id !== id);
            } else {
                state.adminNotifications = [];
            }
        }
    }
};

// Common Layout Helpers
function renderFooter() {
  const foot = $("footer .foot-inner");
  if (foot) {
    foot.innerHTML = `© 2026 Windsor Grove Hub • All rights reserved &nbsp;|&nbsp; <a href="privacy.html" style="color:var(--text-dim);font-weight:500">Privacy Policy</a> &nbsp;|&nbsp; <a href="terms.html" style="color:var(--text-dim);font-weight:500">Terms &amp; Conditions</a>`;
  }
}


function initLoader() {
  window.addEventListener('load', () => {
    setTimeout(() => {
      const loader = document.getElementById('loader');
      if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => loader.style.display = 'none', 800);
      }
    }, 1200);
  });
}

// Lead capture state
const chatState = { 
  leadCaptured: false, 
  awaitingLead: false,
  unreadCount: 0
};

window.playNotificationSound = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const playTone = (freq, time, dur) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.5, time + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, time + dur);
      osc.start(time);
      osc.stop(time + dur);
    };
    // AT&T style dual-tone notification
    playTone(523.25, ctx.currentTime, 0.4); 
    playTone(880.00, ctx.currentTime + 0.15, 0.6); 
  } catch(e) {}
};

function initChatWidget() {
  if ($("#chat-widget")) return;
  
  const widget = document.createElement("div");
  widget.id = "chat-widget";
  widget.className = "chat-widget";
  widget.innerHTML = `
    <div class="chat-panel" id="chat-panel">
      <div style="background:var(--text);padding:14px 20px;display:flex;justify-content:space-between;align-items:center;border-top-left-radius:18px;border-top-right-radius:18px">
        <div style="display:flex;align-items:center;gap:12px">
          <div style="width:36px;height:36px;border-radius:50%;background:var(--accent1);display:grid;place-items:center;font-size:16px">🏨</div>
          <div style="line-height:1.2">
            <div style="font-weight:700;color:#fff;font-size:14px">Concierge Maya</div>
            <div style="font-size:10px;color:rgba(255,255,255,0.55);display:flex;align-items:center;gap:5px"><span style="width:6px;height:6px;background:#10b981;border-radius:50%;display:inline-block"></span> Online now</div>
          </div>
        </div>
        <div style="display:flex;gap:6px">
          <!-- Minimize -->
          <button onclick="toggleChat()" style="background:rgba(255,255,255,0.1);border:none;width:28px;height:28px;border-radius:6px;display:grid;place-items:center;color:#fff;cursor:pointer;font-size:18px" title="Minimize Chat">−</button>
          <!-- Close -->
          <button onclick="confirmEndChat()" style="background:rgba(239,68,68,0.15);border:none;width:28px;height:28px;border-radius:6px;display:grid;place-items:center;color:#ef4444;cursor:pointer;font-size:18px" title="End Session">×</button>
        </div>
      </div>
      
      <!-- Overlay for End Chat Confirmation -->
      <div id="end-chat-overlay" style="display:none;position:absolute;inset:0;background:rgba(255,255,255,0.95);backdrop-filter:blur(4px);z-index:20;flex-direction:column;justify-content:center;align-items:center;padding:30px;text-align:center;border-radius:18px">
        <div style="width:48px;height:48px;background:rgba(239,68,68,0.1);color:#ef4444;border-radius:50%;display:grid;place-items:center;margin-bottom:16px;font-size:20px">⚠️</div>
        <h3 style="font-size:17px;color:var(--text);margin-bottom:8px">End Chat Session?</h3>
        <p style="font-size:13px;color:var(--text-dim);margin-bottom:24px;line-height:1.5">This will close your connection to Concierge Maya and clear your current working session.</p>
        <div style="display:flex;gap:10px;width:100%">
          <button class="btn btn-outline" style="flex:1;justify-content:center;padding:12px" onclick="cancelEndChat()">Back</button>
          <button class="btn btn-primary" style="flex:1;justify-content:center;background:#ef4444;border-color:#ef4444;padding:12px" onclick="executeEndChat()">End Chat</button>
        </div>
      </div>

      <div class="chat-log" id="widget-log" style="flex:1;background:#fafaf8;overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:10px;scroll-behavior:smooth"></div>
      <div id="widget-input-area" style="padding:14px;border-top:1px solid var(--border);display:flex;gap:8px;background:#fff">
        <input type="text" id="widget-input" class="input" style="border:1px solid var(--border);background:#f8fafc;font-size:13px" placeholder="Type your message...">
        <button class="btn btn-primary" style="padding:10px 14px;flex-shrink:0" onclick="sendWidgetMsg()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
        </button>
      </div>
    </div>
    <div class="chat-bubble" onclick="toggleChat()" id="chat-bubble-btn" style="position:relative">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
      <div id="chat-badge" class="chat-badge">0</div>
    </div>
  `;
  document.body.appendChild(widget);

  // Restore panel open state
  if (sessionStorage.getItem("wgh-chat-open") === "true") {
    $("#chat-panel").classList.add("show");
  }

  // Skip lead form if user is logged in — we already know who they are
  if (state.user) {
    chatState.leadCaptured = true;
    chatState.leadName = state.user.name;
  } else if (state.chat && state.chat.length > 0 && state.chat.some(m => m.sender === 'you')) {
    // Restore lead capture state if guest has already sent a message this session
    chatState.leadCaptured = true;
  }

  const input = $("#widget-input");
  if (input) input.onkeypress = (e) => { if(e.key === 'Enter') sendWidgetMsg(); };

  // Sync logic for active panel
  setInterval(async () => {
    if ($("#chat-panel")) {
      const isOpen = $("#chat-panel").classList.contains("show");
      const oldLen = state.chat ? state.chat.length : 0;
      await api.fetchChats(); 
      if (state.chat.length > oldLen) {
        if (isOpen) {
          if (!chatState.leadCaptured && state.chat.some(m => m.sender === 'you')) chatState.leadCaptured = true;
          renderWidgetMessages();
        } else {
          // Unread badges if closed
          const newMsgs = state.chat.slice(oldLen);
          const fromAgent = newMsgs.filter(m => m.sender === 'agent');
          if (fromAgent.length > 0) {
            chatState.unreadCount += fromAgent.length;
            const badge = $("#chat-badge");
            if (badge) {
               badge.textContent = chatState.unreadCount;
               badge.classList.add("show");
            }
            playNotificationSound();
          }
        }
      }
    }
  }, 3500);

  // Show welcome message if no history
  setTimeout(() => {
    if (!state.chat || state.chat.length === 0) {
      renderDefaultWelcome();
    } else {
      renderWidgetMessages();
    }
  }, 300);
}

function renderDefaultWelcome() {
  const log = $("#widget-log");
  if (log) {
    log.innerHTML = `
      <div class="msg agent" style="background:#f1f5f9;border-radius:18px;border-bottom-left-radius:4px;padding:14px 18px;max-width:85%">
        <div style="font-size:12px;font-weight:700;color:var(--accent1);margin-bottom:5px;text-transform:uppercase;letter-spacing:0.05em">✦ CONCIERGE MAYA</div>
        Welcome to <strong>Windsor Grove Hub</strong>! 👋<br><br>I'm your personal concierge. Whether you'd like to explore our expert programme, learn about hotel missions, or need help getting started — I'm here.<br><br>How can I assist you today?
        <time style="font-size:9px;opacity:0.4;display:block;margin-top:8px">${new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</time>
      </div>`;
    log.scrollTop = log.scrollHeight;
  }
}

window.toggleChat = () => {
  const panel = $("#chat-panel");
  panel.classList.toggle("show");
  sessionStorage.setItem("wgh-chat-open", panel.classList.contains("show"));
  
  // Reset unread count when opening
  chatState.unreadCount = 0;
  const badge = $("#chat-badge");
  if (badge) {
    badge.classList.remove("show");
    badge.textContent = "0";
  }
};

window.confirmEndChat = () => {
  document.getElementById("end-chat-overlay").style.display = "flex";
};

window.cancelEndChat = () => {
  document.getElementById("end-chat-overlay").style.display = "none";
};

window.executeEndChat = () => {
  // Regenerate guest ID to sever backend connection for guest
  localStorage.removeItem("wgh-guest-id");
  getOrSetGuestId();
  
  // Clear local state
  state.chat = [];
  chatState.leadCaptured = false;
  chatState.awaitingLead = false;
  
  // Reset UI
  document.getElementById("end-chat-overlay").style.display = "none";
  const panel = $("#chat-panel");
  panel.classList.remove("show");
  sessionStorage.setItem("wgh-chat-open", "false");
  
  // Restore default welcome for next time they open
  renderDefaultWelcome();
  
  // Reset input area
  const inputArea = $("#widget-input-area");
  if (inputArea) inputArea.style.display = 'flex';
  const input = $("#widget-input");
  if (input) { input.value = ""; input.placeholder = "Type your message..."; }
};

window.renderWidgetMessages = () => {
  const log = $("#widget-log");
  if (!log || chatState.awaitingLead) return;
  log.innerHTML = `
    <div class="msg agent" style="background:#f1f5f9;border-radius:18px;border-bottom-left-radius:4px;padding:14px 18px;max-width:85%">
      <div style="font-size:12px;font-weight:700;color:var(--accent1);margin-bottom:5px;text-transform:uppercase;letter-spacing:0.05em">✦ CONCIERGE MAYA</div>
      Welcome to <strong>Windsor Grove Hub</strong>! 👋<br><br>I'm your personal concierge. How can I assist you today?
      <time style="font-size:9px;opacity:0.4;display:block;margin-top:8px">${new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</time>
    </div>
  ` + state.chat.map(m => `
    <div class="msg ${m.sender === 'you' ? 'you' : 'agent'}" style="${m.sender==='you'?'align-self:flex-end;background:var(--text);color:#fff':'align-self:flex-start;background:#f1f5f9;color:var(--text)'};border-radius:18px;${m.sender==='you'?'border-bottom-right-radius:4px':'border-bottom-left-radius:4px'};padding:12px 16px;max-width:85%">
      ${m.sender === 'agent' ? '<div style="font-size:12px;font-weight:700;color:var(--accent1);margin-bottom:4px;text-transform:uppercase;letter-spacing:0.05em">✦ CONCIERGE MAYA</div>' : ''}
      ${m.text}
      <time style="font-size:9px;opacity:0.4;display:block;margin-top:6px">${new Date(m.timestamp || m.ts).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</time>
    </div>
  `).join("");
  log.scrollTop = log.scrollHeight;
};

function showLeadCaptureForm(firstMessage) {
  chatState.awaitingLead = true;
  const log = $("#widget-log");
  const inputArea = $("#widget-input-area");
  if (!log) return;

  // Add user message bubble first
  log.innerHTML += `
    <div class="msg you" style="align-self:flex-end;background:var(--text);color:#fff;border-radius:18px;border-bottom-right-radius:4px;padding:12px 16px;max-width:85%">
      ${firstMessage}
      <time style="font-size:9px;opacity:0.4;display:block;margin-top:6px">${new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</time>
    </div>`;

  // Show typing indicator
  const typingId = 'typing-' + Date.now();
  log.innerHTML += `<div id="${typingId}" style="align-self:flex-start;background:#f1f5f9;border-radius:18px;border-bottom-left-radius:4px;padding:12px 18px;font-size:18px;letter-spacing:4px">●●●</div>`;
  log.scrollTop = log.scrollHeight;

  setTimeout(() => {
    const typing = document.getElementById(typingId);
    if (typing) typing.remove();

    log.innerHTML += `
      <div class="msg agent" style="align-self:flex-start;background:#f1f5f9;color:var(--text);border-radius:18px;border-bottom-left-radius:4px;padding:14px 18px;max-width:90%;width:90%">
        <div style="font-size:12px;font-weight:700;color:var(--accent1);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.05em">✦ CONCIERGE MAYA</div>
        Thank you for reaching out! To connect you with the right expert, please share a few quick details:
        <form id="lead-form" style="margin-top:14px;display:grid;gap:10px" onsubmit="submitLeadForm(event)">
          <input type="text" id="lead-name" placeholder="Full Name *" required style="width:100%;padding:10px 14px;border-radius:10px;border:1px solid #dde1e7;background:#fff;font-family:inherit;font-size:13px;box-sizing:border-box">
          <input type="tel" id="lead-phone" placeholder="Phone Number *" required style="width:100%;padding:10px 14px;border-radius:10px;border:1px solid #dde1e7;background:#fff;font-family:inherit;font-size:13px;box-sizing:border-box">
          <input type="email" id="lead-email" placeholder="Email Address *" required style="width:100%;padding:10px 14px;border-radius:10px;border:1px solid #dde1e7;background:#fff;font-family:inherit;font-size:13px;box-sizing:border-box">
          <button type="submit" style="padding:12px;background:var(--text);color:#fff;border:none;border-radius:12px;font-weight:700;font-size:13px;cursor:pointer;letter-spacing:0.03em">Connect Me with an Expert →</button>
        </form>
        <time style="font-size:9px;opacity:0.4;display:block;margin-top:12px">${new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</time>
      </div>`;
    log.scrollTop = log.scrollHeight;
    if (inputArea) inputArea.style.display = 'none';
  }, 1200);
}

window.submitLeadForm = async (e) => {
  e.preventDefault();
  const name = document.getElementById('lead-name').value.trim();
  const phone = document.getElementById('lead-phone').value.trim();
  const email = document.getElementById('lead-email').value.trim();
  if (!name || !phone || !email) return;

  const btn = e.target.querySelector('button');
  btn.textContent = 'Connecting...';
  btn.disabled = true;

  const gid = getOrSetGuestId();
  const summaryMsg = `📋 *Lead Contact*\nName: ${name}\nPhone: ${phone}\nEmail: ${email}`;
  const firstMsg = `Hi, my name is ${name}. Phone: ${phone}, Email: ${email}`;

  try {
    // Send first message with full lead data (include guest_name for admin display)
    await fetch(`${API_URL}/chats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: firstMsg, isFirst: true, guest_id: gid, guest_name: name })
    });
  } catch(err) { /* offline fallback */ }

  chatState.leadCaptured = true;
  chatState.awaitingLead = false;
  chatState.leadName = name;

  // Persist guest name so every future page load shows it in the admin
  localStorage.setItem('wgh-guest-name', name);

  const form = document.getElementById('lead-form');
  if (form) form.closest('.msg').innerHTML = `
    <div style="font-size:12px;font-weight:700;color:var(--accent1);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.05em">✦ CONCIERGE MAYA</div>
    Details submitted — connecting you now.
    <time style="font-size:9px;opacity:0.4;display:block;margin-top:6px">${new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</time>`;

  const log = $("#widget-log");
  if (log) {
    const confirmId = 'confirm-' + Date.now();
    log.innerHTML += `<div id="${confirmId}" style="align-self:flex-start;background:#f1f5f9;border-radius:18px;border-bottom-left-radius:4px;padding:12px 18px;font-size:18px;letter-spacing:4px">●●●</div>`;
    log.scrollTop = log.scrollHeight;

    setTimeout(async () => {
      document.getElementById(confirmId)?.remove();
      const autoReply = `Thank you, ${name}! 🙏\n\nYour enquiry has been received. A Windsor Grove concierge specialist will be in touch within the next few minutes.\n\nIn the meantime, feel free to explore <a href="how-it-works.html" style="color:var(--accent1);font-weight:700">How it Works</a> or <a href="signup.html" style="color:var(--accent1);font-weight:700">create your free account</a> to get started.`;

      try {
        await fetch(`${API_URL}/chats`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: autoReply, guest_id: gid, sender: 'agent' })
        });
      } catch(err) { /* offline */ }

      if (log) {
        log.innerHTML += `
          <div style="align-self:flex-start;background:linear-gradient(135deg,#f8f4ee,#fffbf5);border:1px solid rgba(184,134,63,0.2);border-radius:18px;border-bottom-left-radius:4px;padding:16px 18px;max-width:90%;line-height:1.6">
            <div style="font-size:12px;font-weight:700;color:var(--accent1);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.05em">✦ CONCIERGE MAYA</div>
            ${autoReply}
            <time style="font-size:9px;opacity:0.4;display:block;margin-top:8px">${new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</time>
          </div>`;
        log.scrollTop = log.scrollHeight;
      }
      
      const isPanelOpen = $("#chat-panel").classList.contains("show");
      if (!isPanelOpen) {
         chatState.unreadCount += 1;
         const badge = $("#chat-badge");
         if (badge) { badge.textContent = chatState.unreadCount; badge.classList.add("show"); }
         playNotificationSound();
      }

      const inputArea = $("#widget-input-area");
      if (inputArea) {
        inputArea.style.display = 'flex';
        $("#widget-input").placeholder = 'Continue chatting...';
      }
    }, 2000);
  }
};

window.sendWidgetMsg = async () => {
  const input = $("#widget-input");
  const text = input.value.trim();
  if (!text) return;
  input.value = "";

  if (!chatState.leadCaptured) {
    showLeadCaptureForm(text);
    return;
  }

  // Subsequent messages — send normally as guest/user
  try {
    await api.sendMessage(text);
  } catch(e) { /* offline */ }
  renderWidgetMessages();

  setTimeout(async () => {
    try { await api.fetchChats(); } catch(e) {}
    renderWidgetMessages();
  }, 2500);
};

// Global initialization
document.addEventListener('DOMContentLoaded', async () => {
  const securePages = ['dashboard.html', 'profile.html', 'support.html', 'account.html', 'tasks.html', 'withdrawal.html', 'deposit.html'];
  const currentPage = location.pathname.split('/').pop() || 'index.html';
  
  if (!securePages.includes(currentPage)) {
    // Log out if on an unauthenticated page
    const savedToken = localStorage.getItem("wgh-token");
    if (savedToken) {
      localStorage.removeItem("wgh-token");
    }
    state.user = null;
    state.token = null;
  }

  renderFooter();
  initLoader();
  try { await loadState(); } catch(e) { console.warn('API offline, guest mode only.'); }
  initChatWidget();
  
  // Brand click navigation
  const brand = $("#brand");
  if (brand) brand.onclick = () => window.location.href = "index.html";
  
  // Login/Signup buttons in header
  const loginBtn = $("#btn-login"); if (loginBtn) loginBtn.onclick = () => window.location.href = "login.html";
  const createBtn = $("#btn-create"); if (createBtn) createBtn.onclick = () => window.location.href = "signup.html";
  
  // Hide login/signup if authenticated
  if (state.user) {
      if (loginBtn) loginBtn.style.display = 'none';
      if (createBtn) {
          const actionGroup = createBtn.parentElement;
          if(actionGroup){
             const initial = state.user.name.charAt(0).toUpperCase();
             const notifs = state.adminNotifications || [];
             const hasNotifs = notifs.length > 0;
             
             let notifsHTML = '';
             if (hasNotifs) {
                const notifNav = {
                  commission_earned: 'account.html',
                  withdrawal_pending: 'withdrawal.html',
                  withdrawal_approved: 'withdrawal.html',
                  withdrawal_rejected: 'withdrawal.html',
                  deposit_pending: 'deposit.html',
                  deposit_approved: 'deposit.html',
                  deposit_rejected: 'deposit.html',
                };
                const notifLabel = {
                  commission_earned: '✦ Commission Earned',
                  withdrawal_pending: '📤 Withdrawal Submitted',
                  withdrawal_approved: '✅ Withdrawal Approved',
                  withdrawal_rejected: '❌ Withdrawal Rejected',
                  deposit_pending: '📥 Deposit Submitted',
                  deposit_approved: '✅ Deposit Approved',
                  deposit_rejected: '❌ Deposit Rejected',
                };
                notifsHTML = notifs.map(n => {
                  const dest = notifNav[n.type] || null;
                  return `
                    <div class="notif-item" id="notif-${n.id}"
                      style="cursor:${dest ? 'pointer' : 'default'}; transition: opacity 0.2s"
                      onclick="markNotifRead(${n.id}, event)${dest ? `;window.location.href='${dest}'` : ''}">
                      <div class="notif-title">${notifLabel[n.type] || n.type.replace(/_/g,' ')}</div>
                      <div class="notif-body">${n.preview}</div>
                      ${dest ? `<div style="font-size:10px;color:var(--accent1);font-weight:700;margin-top:4px">Tap to view →</div>` : ''}
                    </div>
                  `;
                }).join('');
             } else {
                notifsHTML = `<div class="notif-empty">No new notifications</div>`;
             }

             actionGroup.innerHTML = `
               <div style="display:flex; align-items:center; gap:20px;">
                 <!-- Notification Icon -->
                 <div class="nav-notif" id="notif-bell">
                   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                   <div class="notif-dot" id="notif-badge" style="display: ${hasNotifs ? 'block' : 'none'}"></div>
                   <div class="notif-dropdown" id="notif-dropdown">
                      <div style="padding: 12px 16px; border-bottom: 1px solid var(--border); display:flex; justify-content:space-between; align-items:center">
                         <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase; font-weight: 700; letter-spacing: 0.1em">Notifications</div>
                         ${hasNotifs ? `<button onclick="clearAllNotifs(event)" style="background:none; border:none; color:var(--accent1); font-size:11px; font-weight:700; cursor:pointer">CLEAR</button>` : ''}
                      </div>
                      <div id="notifs-list" style="max-height: 300px; overflow-y: auto; padding-top: 8px;">
                         ${notifsHTML}
                      </div>
                   </div>
                 </div>

                 <!-- Avatar Dropdown -->
                 <div class="avatar-wrap" id="user-avatar-wrap">
                   <div class="avatar-header">${initial}</div>
                   <div class="dropdown-menu">
                      <div style="padding: 12px 16px">
                         <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase; font-weight: 700; letter-spacing: 0.1em">Signed in as</div>
                         <div style="font-weight: 700; font-size: 14px; margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text)">${state.user.name}</div>
                      </div>
                      <div class="dropdown-divider"></div>
                      <a href="dashboard.html" class="dropdown-item">Dashboard</a>
                      <a href="account.html" class="dropdown-item">Account Ledger</a>
                      <a href="profile.html" class="dropdown-item">Profile Settings</a>
                      <div class="dropdown-divider"></div>
                      <a href="#" class="dropdown-item" onclick="localStorage.removeItem('wgh-token'); window.location.href='index.html'" style="color: #ef4444">Sign Out</a>
                   </div>
                 </div>
               </div>
             `;
             
             const avatarWrap = document.getElementById('user-avatar-wrap');
             const notifBell = document.getElementById('notif-bell');
             
             if(avatarWrap) {
                avatarWrap.onclick = (e) => {
                   e.stopPropagation();
                   if(notifBell && notifBell.classList.contains('open')) notifBell.classList.remove('open');
                   avatarWrap.classList.toggle('open');
                }
             }

             if(notifBell) {
                notifBell.onclick = async (e) => {
                   e.stopPropagation();
                   if(avatarWrap && avatarWrap.classList.contains('open')) avatarWrap.classList.remove('open');
                   notifBell.classList.toggle('open');
                }
             }

             document.addEventListener('click', (e) => {
                if (avatarWrap && !avatarWrap.contains(e.target)) avatarWrap.classList.remove('open');
                if (notifBell && !notifBell.contains(e.target)) notifBell.classList.remove('open');
             });
          }
      }
  }
});

// Explicit manual control for notification interactions
window.markNotifRead = async (id, e) => {
    if (e) e.stopPropagation(); // keep tray open
    await api.readNotifications(id);
    const el = document.getElementById('notif-'+id);
    if(el) {
        el.style.opacity = '0';
        setTimeout(() => el.style.display = 'none', 200);
    }
    
    // Auto-update empty state if list drops to 0
    const badge = document.getElementById('notif-badge');
    if (state.adminNotifications.length === 0) {
        if(badge) badge.style.display = 'none';
        const drop = document.getElementById('notifs-list');
        if (drop) {
           setTimeout(() => drop.innerHTML = `<div class="notif-empty">No new notifications</div>`, 200);
        }
    }
};

window.clearAllNotifs = async (e) => {
    if (e) e.stopPropagation(); // keep tray open to see it clear
    await api.readNotifications();
    
    const drop = document.getElementById('notifs-list');
    if (drop) drop.innerHTML = `<div class="notif-empty">No new notifications</div>`;
    
    const badge = document.getElementById('notif-badge');
    if(badge) badge.style.display = 'none';
    
    // Hide clear button
    const clearBtn = e.target;
    if(clearBtn) clearBtn.style.display = 'none';
};

// --- Global Mobile Navigation ---

// --- Mission Tab Toast ---
// Show a toast when the user clicks the Missions tab to inform them about the completion requirement
document.addEventListener('click', (e) => {
  const link = e.target.closest('a[href="tasks.html"]');
  if (link && state.user) {
    // Don't prevent navigation, just show toast on arrival (store flag)
    sessionStorage.setItem('wgh-mission-toast', 'true');
  }
});

// Check if we should show the mission toast on page load (for tasks.html)
if (location.pathname.endsWith('tasks.html') && sessionStorage.getItem('wgh-mission-toast')) {
  sessionStorage.removeItem('wgh-mission-toast');
  setTimeout(() => {
    toast('🎯 Start Mission — Complete all tasks to unlock your commission!');
  }, 1500);
}
