// ---------- STATE ----------
let devices = [];
let prevStatus = new Map(); // id -> "Up"/"Down"
let statusFilter = "All";
let searchTerm = "";
let polling = null;
let selectedDevice = null;

// ---------- DOM ----------
const elGrid = document.getElementById("grid");
const elLoading = document.getElementById("loading");
const elTotal = document.getElementById("kpi-total");
const elUp = document.getElementById("kpi-up");
const elDown = document.getElementById("kpi-down");
const elError = document.getElementById("error-box");
const elErrorText = document.getElementById("error-text");
const elRetry = document.getElementById("btn-retry");
const elSearch = document.getElementById("search");
const elFilterBtns = [...document.querySelectorAll(".btn-filter")];
const elBtnRefresh = document.getElementById("btn-refresh");
const elToggleAuto = document.getElementById("toggle-auto");
const elToggleDark = document.getElementById("toggle-dark");
const elLastUpdated = document.getElementById("last-updated");

const toastEl = document.getElementById("toast");
const toast = new bootstrap.Toast(toastEl, { delay: 3500 });

const modalEl = document.getElementById("deviceModal");
const bsModal = new bootstrap.Modal(modalEl);
const elModalTitle = document.getElementById("modal-title");
const elModalBody = document.getElementById("modal-body");
const elModalPing = document.getElementById("modal-ping");

// ---------- CSRF ----------
function getCookie(name){
  const m = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
  return m ? m.pop() : '';
}

// ---------- UTILS ----------
const fmtMs = (ms) => (ms < 0 ? "Timeout" : `${ms}ms`);
const ago = (iso) => {
  try {
    const d = new Date(iso);
    const s = Math.floor((Date.now() - d.getTime()) / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    const d2 = Math.floor(h / 24);
    return `${d2}d`;
  } catch { return "-"; }
};

// Small SVG icon next to device name (uses Django-injected ICON_MAP; falls back to static path)
function icon(type){
  const m = window.ICON_MAP || {};
  const fallback = (name) => `/static/dashboard/icons/${name}`;
  const src =
    type === "Switch"   ? (m.Switch   || fallback("switch.svg"))   :
    type === "Firewall" ? (m.Firewall || fallback("firewall.svg")) :
                          (m.Router   || fallback("router.svg"));
  return `<img src="${src}" alt="${type}" class="devtype-icon" />`;
}

// simple helpers
function toggleLoading(on){ elLoading.classList.toggle("d-none", !on); }
function showError(msg){ elErrorText.textContent = msg; elError.classList.remove("d-none"); }
function hideError(){ elError.classList.add("d-none"); }
function showToast(msg){ document.getElementById("toast-msg").textContent = msg; toast.show(); }
function setLastUpdated(){ if (elLastUpdated) elLastUpdated.textContent = "Updated " + new Date().toLocaleTimeString(); }

// ---------- DATA ----------
async function loadDevices(spinner=false){
  try{
    if(spinner) toggleLoading(true);
    hideError();
    const res = await fetch("/devices", { cache: "no-store" });
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // alert on Up -> Down flip
    if (prevStatus.size > 0) {
      for (const d of data) {
        const prev = prevStatus.get(d.id);
        if (prev === "Up" && d.status === "Down") { showToast(`${d.name} is down!`); break; }
      }
    }
    prevStatus = new Map(data.map(d => [d.id, d.status]));
    devices = data;
    setLastUpdated();
    render();
  }catch(e){
    showError(`Failed to fetch device data. ${e.message}`);
  }finally{
    if(spinner) toggleLoading(false);
  }
}

// ---------- RENDER ----------
function render(){
  // KPIs
  const up = devices.filter(d=>d.status==="Up").length;
  const down = devices.filter(d=>d.status==="Down").length;
  elTotal.textContent = String(devices.length);
  elUp.textContent = String(up);
  elDown.textContent = String(down);

  // filter + sort
  const term = searchTerm.trim().toLowerCase();
  let list = devices.filter(d=>{
    const s = d.name.toLowerCase().includes(term) || d.ip_address.includes(term);
    const f = statusFilter==="All" || d.status===statusFilter;
    return s && f;
  });
  list.sort((a,b)=>{
    if (a.status !== b.status) return a.status === "Down" ? -1 : 1; // show Down first
    return a.name.localeCompare(b.name);
  });

  // no matches
  if(list.length===0){
    elGrid.innerHTML = `<div class="col-12">
      <div class="card shadow-sm rounded-4"><div class="card-body text-center text-secondary">No devices match your criteria.</div></div>
    </div>`;
    return;
  }

  // cards
  elGrid.innerHTML = list.map(d=>{
    const isDown = d.status === "Down";
    return `<div class="col-12 col-md-6 col-xl-4">
      <div class="card shadow-sm rounded-4 ${isDown?'card-border-down':'card-border-up'} device-card" data-id="${d.id}" role="button">
        <div class="card-body">
          <div class="d-flex justify-content-between">
            <div class="d-flex align-items-center gap-2">
              ${icon(d.type)}
              <h5 class="card-title mb-0">${d.name}</h5>
            </div>
            <span class="badge text-bg-secondary">${d.location || '-'}</span>
          </div>
          <div class="text-secondary small fst-monospace mt-1">${d.ip_address}</div>
          <div class="d-flex justify-content-between align-items-center mt-3">
            <div class="d-flex align-items-center gap-2">
              <span class="dot ${isDown?'dot-down':'dot-up'}"></span>
              <span class="${isDown?'text-danger':'text-success'} fw-semibold">${isDown?'Down':'Up'}</span>
              <span class="text-secondary small">for ${ago(d.status_changed_at)}</span>
            </div>
            <div class="text-secondary small">${fmtMs(d.latency)}</div>
          </div>
        </div>
      </div>
    </div>`;
  }).join("");

  // clicks -> modal
  document.querySelectorAll(".device-card").forEach(card=>{
    card.addEventListener("click", ()=>{
      const id = Number(card.getAttribute("data-id"));
      selectedDevice = devices.find(x=>x.id===id) || null;
      openModal();
    });
  });

  // brief glow on recent Up->Down
  list.forEach(d=>{
    const was = prevStatus.get(d.id);
    if (was==="Up" && d.status==="Down"){
      const c = document.querySelector(`.device-card[data-id="${d.id}"]`);
      if(c){ c.classList.add("border-danger","shadow"); setTimeout(()=>c.classList.remove("border-danger","shadow"), 1200); }
    }
  });
}

// ---------- MODAL & PING ----------
function openModal(){
  if(!selectedDevice) return;
  elModalTitle.textContent = selectedDevice.name;
  const isDown = selectedDevice.status === "Down";

  elModalBody.innerHTML = `
    <div class="row g-2">
      <div class="col-6"><div class="text-secondary small">IP</div><div class="fw-medium fst-monospace">${selectedDevice.ip_address}</div></div>
      <div class="col-6"><div class="text-secondary small">Location</div><div>${selectedDevice.location||'-'}</div></div>
      <div class="col-6"><div class="text-secondary small">Status</div><div>${selectedDevice.status}</div></div>
      <div class="col-6"><div class="text-secondary small">Latency</div><div>${fmtMs(selectedDevice.latency)}</div></div>
      <div class="col-6"><div class="text-secondary small">Last Checked</div><div>${new Date(selectedDevice.last_checked).toLocaleString()}</div></div>
      <div class="col-6"><div class="text-secondary small">Status Changed</div><div>${new Date(selectedDevice.status_changed_at).toLocaleString()}</div></div>
      <div class="col-12"><div class="text-secondary small">Type</div><div>${selectedDevice.type}</div></div>
    </div>
  `;

  // always enabled; clearer copy for down devices
  elModalPing.disabled = false;
  elModalPing.textContent = isDown ? "Ping (expect timeout)" : "Ping";
  elModalPing.title = isDown ? "Device is down — ping may time out" : "Send ping";

  bsModal.show();
}

async function pingSelected(){
  if (!selectedDevice) return;
  try{
    const res = await fetch(`/devices/${selectedDevice.id}/ping`, {
      method: "POST",
      headers: {
        "X-Requested-With": "fetch",
        "X-CSRFToken": getCookie("csrftoken")
      },
      credentials: "same-origin"
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    showToast(data.ok ? `Ping ${selectedDevice.name}: ${data.rtt_ms}ms` : `Ping ${selectedDevice.name}: timeout`);
    if (data.ok){
      // update latency in memory so the card shows the fresh number
      selectedDevice.latency = data.rtt_ms;
      const idx = devices.findIndex(d => d.id === selectedDevice.id);
      if (idx >= 0) devices[idx].latency = data.rtt_ms;
      render();
    }
  }catch(e){
    showToast(`Ping failed: ${e.message}`);
  }
}

// ---------- EVENTS ----------
elBtnRefresh.addEventListener("click", ()=>loadDevices(true));
elRetry.addEventListener("click", ()=>loadDevices(true));
elSearch.addEventListener("input", (e)=>{ searchTerm = e.target.value; render(); });

elFilterBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    statusFilter = btn.getAttribute("data-filter");
    elFilterBtns.forEach(b => {
      b.classList.remove("btn-primary");
      if (!b.classList.contains("btn-outline-primary")) b.classList.add("btn-outline-primary");
      b.setAttribute("aria-pressed", "false");
    });
    btn.classList.remove("btn-outline-primary");
    btn.classList.add("btn-primary");
    btn.setAttribute("aria-pressed", "true");
    render();
  });
});

elToggleAuto.addEventListener("change", (e)=>{
  if (polling){ clearInterval(polling); polling=null; }
  if (e.target.checked){ polling = setInterval(()=>loadDevices(false), 15000); }
});

elToggleDark.addEventListener("change",(e)=>{
  document.documentElement.setAttribute("data-bs-theme", e.target.checked ? "dark" : "light");
});

elModalPing.addEventListener("click", pingSelected);

// ---------- INIT ----------
(function init(){
  // small style for icons and round corners fallback (kept here to stay self-contained)
  const style = document.createElement("style");
  style.innerHTML = `
    .devtype-icon{width:18px;height:18px;vertical-align:-2px;opacity:.9}
    .rounded-4{border-radius:1rem !important}
    .card-border-up{border-left:4px solid #198754;border-radius:1rem}
    .card-border-down{border-left:4px solid #dc3545;border-radius:1rem}
  `;
  document.head.appendChild(style);

  const btnAll = elFilterBtns.find(b => b.getAttribute("data-filter") === "All");
  if (btnAll) {
    elFilterBtns.forEach(b => {
      b.classList.remove("btn-primary");
      if (!b.classList.contains("btn-outline-primary")) b.classList.add("btn-outline-primary");
      b.setAttribute("aria-pressed", "false");
    });
    btnAll.classList.remove("btn-outline-primary");
    btnAll.classList.add("btn-primary");
    btnAll.setAttribute("aria-pressed", "true");
  }
  loadDevices(true);
})();
