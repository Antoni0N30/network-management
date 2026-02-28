import { useState, useEffect } from "react";

/* ─────────────────────────────────────────────────────────────────────────────
   GLOBAL STYLES
───────────────────────────────────────────────────────────────────────────── */
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Geist+Mono:wght@300;400;500;600&family=Outfit:wght@400;500;600;700&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg:       #0B1220;
      --surface:  #111827;
      --surface2: #161F30;
      --border:   #1F2937;
      --border2:  #2D3748;
      --accent:   #00C2FF;
      --accent-d: #0099CC;
      --green:    #10B981;
      --red:      #EF4444;
      --amber:    #F59E0B;
      --text:     #E2E8F0;
      --muted:    #64748B;
      --dim:      #374151;
    }

    html, body, #root { height: 100%; }
    body {
      font-family: 'Outfit', sans-serif;
      background: var(--bg);
      color: var(--text);
      -webkit-font-smoothing: antialiased;
      overflow: hidden;
    }

    .mono { font-family: 'Geist Mono', monospace; }

    ::-webkit-scrollbar { width: 4px; height: 4px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 99px; }
    ::-webkit-scrollbar-thumb:hover { background: var(--accent); }

    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(10px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .page-enter { animation: fadeUp 0.3s ease forwards; }

    .stagger > * { opacity: 0; animation: fadeUp 0.35s ease forwards; }
    .stagger > *:nth-child(1) { animation-delay: 0ms; }
    .stagger > *:nth-child(2) { animation-delay: 55ms; }
    .stagger > *:nth-child(3) { animation-delay: 110ms; }
    .stagger > *:nth-child(4) { animation-delay: 165ms; }
    .stagger > *:nth-child(5) { animation-delay: 220ms; }
    .stagger > *:nth-child(6) { animation-delay: 275ms; }
    .stagger > *:nth-child(7) { animation-delay: 330ms; }

    @keyframes fillBar {
      from { width: 0; }
    }
    .bar-animated { animation: fillBar 1s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

    @keyframes pulseGreen {
      0%, 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.5); }
      50%       { box-shadow: 0 0 0 5px rgba(16,185,129,0); }
    }
    .pulse-green { animation: pulseGreen 2.5s ease-in-out infinite; }

    @keyframes pulseAmber {
      0%, 100% { box-shadow: 0 0 0 0 rgba(245,158,11,0.5); }
      50%       { box-shadow: 0 0 0 5px rgba(245,158,11,0); }
    }
    .pulse-amber { animation: pulseAmber 2s ease-in-out infinite; }

    .table-row { transition: background 0.1s ease; cursor: default; }
    .table-row:hover { background: rgba(0,194,255,0.03) !important; }
    .table-row:hover .row-actions { opacity: 1 !important; }

    .nav-btn { transition: all 0.14s ease; }
    .nav-btn:hover:not(.nav-active) {
      background: rgba(255,255,255,0.04) !important;
      color: var(--text) !important;
    }

    .kpi-card { transition: border-color 0.2s ease, transform 0.2s ease; }
    .kpi-card:hover { border-color: var(--border2) !important; transform: translateY(-1px); }

    .btn-base { transition: all 0.14s ease; cursor: pointer; border: none; outline: none; }
    .btn-base:active { transform: scale(0.97); }

    .input-field { transition: border-color 0.15s, box-shadow 0.15s; }
    .input-field:focus { outline: none; border-color: rgba(0,194,255,0.45) !important; box-shadow: 0 0 0 3px rgba(0,194,255,0.08); }

    [data-tip] { position: relative; }
    [data-tip]::after {
      content: attr(data-tip);
      position: absolute; bottom: calc(100% + 7px); left: 50%; transform: translateX(-50%);
      background: #1C2A40; border: 1px solid var(--border2);
      color: var(--text); font-size: 11px; padding: 4px 9px; border-radius: 5px;
      white-space: nowrap; pointer-events: none;
      opacity: 0; transition: opacity 0.15s;
      font-family: 'Outfit', sans-serif;
      z-index: 200;
    }
    [data-tip]:hover::after { opacity: 1; }

    .nav-active-bar {
      position: absolute; left: 0; top: 50%; transform: translateY(-50%);
      width: 3px; height: 58%; border-radius: 0 3px 3px 0;
      background: var(--accent);
      box-shadow: 0 0 10px rgba(0,194,255,0.5);
    }

    .dot-bg {
      background-image: radial-gradient(rgba(255,255,255,0.035) 1px, transparent 1px);
      background-size: 26px 26px;
    }

    .icon-btn { transition: all 0.14s ease; }
    .icon-btn:hover { transform: scale(1.08); }

    @keyframes notifBounce {
      0%   { transform: scale(0); }
      65%  { transform: scale(1.25); }
      100% { transform: scale(1); }
    }
    .notif-dot { animation: notifBounce 0.4s ease 0.6s both; }
  `}</style>
);

/* ─────────────────────────────────────────────────────────────────────────────
   ICONS
───────────────────────────────────────────────────────────────────────────── */
const P = ({ d }) => <path strokeLinecap="round" strokeLinejoin="round" d={d} />;

const iconDefs = {
  dashboard:  "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  devices:    "M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01",
  terminal:   "M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  discovery:  "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  backup:     "M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10",
  migration:  "M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4",
  monitoring: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  audit:      "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  settings:   "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  search:     "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  bell:       "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
  chevronR:   "M9 5l7 7-7 7",
  edit:       "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
  connect:    "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1",
  trash:      "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
  plus:       "M12 4v16m8-8H4",
  refresh:    "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15",
  download:   "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4",
  check:      "M5 13l4 4L19 7",
  alertTri:   "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
  xCircle:    "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z",
  info:       "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  arrowUp:    "M7 11l5-5m0 0l5 5m-5-5v12",
  arrowDown:  "M17 13l-5 5m0 0l-5-5m5 5V6",
};

const Icon = ({ name, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    {(iconDefs[name] || "").split(" M").map((seg, i) => (
      <path key={i} d={(i === 0 ? "" : "M") + seg} />
    ))}
  </svg>
);

/* ─────────────────────────────────────────────────────────────────────────────
   MOCK DATA
───────────────────────────────────────────────────────────────────────────── */
const NAV_ITEMS = [
  { id: "dashboard",  label: "Dashboard",      icon: "dashboard",  group: "Main" },
  { id: "devices",    label: "Devices",         icon: "devices",    group: "Main" },
  { id: "terminal",   label: "SSH Terminal",    icon: "terminal",   group: "Operations" },
  { id: "discovery",  label: "Discovery",       icon: "discovery",  group: "Operations" },
  { id: "backup",     label: "Backup & Config", icon: "backup",     group: "Operations" },
  { id: "migration",  label: "Migration",       icon: "migration",  group: "Operations" },
  { id: "monitoring", label: "Monitoring",      icon: "monitoring", group: "Operations" },
  { id: "audit",      label: "Audit Log",       icon: "audit",      group: "System" },
  { id: "settings",   label: "Settings",        icon: "settings",   group: "System" },
];

const DEVICES = [
  { id:1,  hostname:"core-sw-01",   ip:"10.0.1.1",   vendor:"Cisco",     model:"Catalyst 9300", status:"online",  backup:"Jan 15, 03:00", region:"DC-EAST" },
  { id:2,  hostname:"core-sw-02",   ip:"10.0.1.2",   vendor:"Cisco",     model:"Catalyst 9300", status:"online",  backup:"Jan 15, 03:05", region:"DC-EAST" },
  { id:3,  hostname:"dist-rtr-01",  ip:"10.0.2.1",   vendor:"Juniper",   model:"MX240",         status:"online",  backup:"Jan 15, 02:45", region:"DC-WEST" },
  { id:4,  hostname:"dist-rtr-02",  ip:"10.0.2.2",   vendor:"Juniper",   model:"MX240",         status:"offline", backup:"Jan 14, 03:00", region:"DC-WEST" },
  { id:5,  hostname:"access-sw-01", ip:"10.0.3.1",   vendor:"Aruba",     model:"CX 6300M",      status:"online",  backup:"Jan 15, 03:15", region:"FLOOR-1" },
  { id:6,  hostname:"access-sw-02", ip:"10.0.3.2",   vendor:"Aruba",     model:"CX 6300M",      status:"warning", backup:"Jan 15, 03:20", region:"FLOOR-1" },
  { id:7,  hostname:"fw-edge-01",   ip:"10.0.0.1",   vendor:"Palo Alto", model:"PA-5280",       status:"online",  backup:"Jan 15, 04:00", region:"EDGE" },
  { id:8,  hostname:"fw-edge-02",   ip:"10.0.0.2",   vendor:"Palo Alto", model:"PA-5280",       status:"offline", backup:"Jan 13, 03:00", region:"EDGE" },
  { id:9,  hostname:"spine-01",     ip:"10.0.10.1",  vendor:"Arista",    model:"7050TX-64",     status:"online",  backup:"Jan 15, 05:00", region:"DC-EAST" },
  { id:10, hostname:"spine-02",     ip:"10.0.10.2",  vendor:"Arista",    model:"7050TX-64",     status:"online",  backup:"Jan 15, 05:02", region:"DC-EAST" },
];

const ACTIVITY = [
  { id:1, event:"Backup completed successfully",  device:"core-sw-01",     ago:"2 min ago",  type:"success", user:"scheduler" },
  { id:2, event:"Configuration drift detected",   device:"dist-rtr-01",    ago:"14 min ago", type:"warning", user:"j.moretti" },
  { id:3, event:"Device became unreachable",      device:"fw-edge-02",     ago:"1 hr ago",   type:"error",   user:"system" },
  { id:4, event:"Discovery scan completed",       device:"10.0.3.0/24",    ago:"2 hrs ago",  type:"info",    user:"scheduler" },
  { id:5, event:"SSH session opened",             device:"access-sw-01",   ago:"3 hrs ago",  type:"info",    user:"a.bianchi" },
  { id:6, event:"Backup job failed — timeout",    device:"dist-rtr-02",    ago:"5 hrs ago",  type:"error",   user:"scheduler" },
  { id:7, event:"Firmware upgrade applied",       device:"spine-01",       ago:"6 hrs ago",  type:"success", user:"n.russo" },
];

const HEALTH = [
  { label: "CPU Utilization",      value: 34 },
  { label: "Memory Pressure",      value: 61 },
  { label: "Disk I/O",             value: 22 },
  { label: "Network Throughput",   value: 78 },
  { label: "API Response Time",    value: 12 },
];

const VENDOR_COLORS = {
  "Cisco":     "#00BCEB",
  "Juniper":   "#84AC1B",
  "Aruba":     "#FF8300",
  "Palo Alto": "#FA4616",
  "Arista":    "#0061A3",
};

/* ─────────────────────────────────────────────────────────────────────────────
   BASE COMPONENTS
───────────────────────────────────────────────────────────────────────────── */
const Card = ({ children, style = {}, className = "" }) => (
  <div className={className} style={{
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    ...style,
  }}>{children}</div>
);

const CardHeader = ({ title, subtitle, action, icon }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: 10,
    padding: "15px 18px",
    borderBottom: "1px solid var(--border)",
  }}>
    {icon && (
      <div style={{
        width: 30, height: 30, borderRadius: 7,
        background: "var(--surface2)", border: "1px solid var(--border)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "var(--accent)", flexShrink: 0,
      }}>
        <Icon name={icon} size={15} />
      </div>
    )}
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", lineHeight: 1.2 }}>{title}</div>
      {subtitle && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{subtitle}</div>}
    </div>
    {action && <div style={{ flexShrink: 0 }}>{action}</div>}
  </div>
);

const StatusBadge = ({ status }) => {
  const cfg = {
    online:  { bg:"rgba(16,185,129,0.1)",  border:"rgba(16,185,129,0.22)", text:"#10B981", dot:"#10B981", label:"Online",  cls:"pulse-green" },
    offline: { bg:"rgba(239,68,68,0.1)",   border:"rgba(239,68,68,0.22)",  text:"#EF4444", dot:"#EF4444", label:"Offline", cls:"" },
    warning: { bg:"rgba(245,158,11,0.1)",  border:"rgba(245,158,11,0.22)", text:"#F59E0B", dot:"#F59E0B", label:"Warning", cls:"pulse-amber" },
  };
  const c = cfg[status] || cfg.offline;
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", gap:6,
      padding:"3px 9px 3px 6px",
      background:c.bg, border:`1px solid ${c.border}`,
      borderRadius:99, fontSize:11, fontWeight:500, color:c.text,
    }}>
      <span className={c.cls} style={{
        width:6, height:6, borderRadius:"50%",
        background:c.dot, display:"inline-block", flexShrink:0,
      }} />
      {c.label}
    </span>
  );
};

const Pill = ({ children, color = "var(--muted)" }) => (
  <span className="mono" style={{
    display:"inline-block", padding:"2px 7px",
    fontSize:10, fontWeight:500, color,
    background:`${color}14`, border:`1px solid ${color}28`,
    borderRadius:4, letterSpacing:"0.02em",
  }}>{children}</span>
);

const IconBtn = ({ icon, tip, color = "var(--muted)", hoverColor, onClick }) => {
  const hc = hoverColor || color;
  return (
    <button className="icon-btn btn-base" data-tip={tip} onClick={onClick} style={{
      width:28, height:28, borderRadius:6,
      background:"transparent", border:"1px solid transparent",
      display:"flex", alignItems:"center", justifyContent:"center",
      color, cursor:"pointer",
    }}
      onMouseEnter={e => { e.currentTarget.style.background=`${hc}14`; e.currentTarget.style.borderColor=`${hc}28`; e.currentTarget.style.color=hc; }}
      onMouseLeave={e => { e.currentTarget.style.background="transparent"; e.currentTarget.style.borderColor="transparent"; e.currentTarget.style.color=color; }}
    >
      <Icon name={icon} size={14} />
    </button>
  );
};

const PrimaryBtn = ({ children, icon, onClick }) => (
  <button className="btn-base" onClick={onClick} style={{
    display:"inline-flex", alignItems:"center", gap:6,
    padding:"7px 15px",
    background:"var(--accent)", color:"#0B1220",
    border:"none", borderRadius:7,
    fontSize:13, fontWeight:600, cursor:"pointer",
    boxShadow:"0 0 18px rgba(0,194,255,0.18)",
  }}
    onMouseEnter={e => e.currentTarget.style.background="var(--accent-d)"}
    onMouseLeave={e => e.currentTarget.style.background="var(--accent)"}
  >
    {icon && <Icon name={icon} size={14} />}
    {children}
  </button>
);

const LiveClock = () => {
  const [t, setT] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setT(new Date()), 1000); return () => clearInterval(id); }, []);
  return <span className="mono" style={{ fontSize:12, color:"var(--muted)" }}>{t.toLocaleTimeString("en-GB")}</span>;
};

/* ─────────────────────────────────────────────────────────────────────────────
   SIDEBAR
───────────────────────────────────────────────────────────────────────────── */
const Sidebar = ({ activePage, setActivePage }) => {
  const groups = ["Main", "Operations", "System"];
  return (
    <aside style={{
      position:"fixed", left:0, top:0, bottom:0, width:228,
      background:"var(--surface)", borderRight:"1px solid var(--border)",
      display:"flex", flexDirection:"column", zIndex:40,
    }}>
      {/* Logo */}
      <div style={{ padding:"16px 16px 14px", borderBottom:"1px solid var(--border)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{
            width:34, height:34, borderRadius:8, flexShrink:0,
            background:"linear-gradient(135deg, var(--accent) 0%, #0066FF 100%)",
            display:"flex", alignItems:"center", justifyContent:"center",
            boxShadow:"0 4px 16px rgba(0,194,255,0.28)",
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="8" height="8" rx="1"/><rect x="14" y="2" width="8" height="8" rx="1"/>
              <rect x="2" y="14" width="8" height="8" rx="1"/>
              <path d="M14 18h8M18 14v8"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:"#fff", letterSpacing:"-0.02em", lineHeight:1 }}>NetCore</div>
            <div className="mono" style={{ fontSize:10, color:"var(--muted)", marginTop:2, letterSpacing:"0.04em" }}>ENTERPRISE v4.2</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex:1, overflowY:"auto", padding:"10px 10px 0" }}>
        {groups.map(group => {
          const items = NAV_ITEMS.filter(n => n.group === group);
          return (
            <div key={group} style={{ marginBottom:6 }}>
              <div style={{ fontSize:10, fontWeight:600, color:"var(--dim)", letterSpacing:"0.08em", textTransform:"uppercase", padding:"8px 8px 4px" }}>
                {group}
              </div>
              {items.map(({ id, label, icon }) => {
                const active = activePage === id;
                return (
                  <button key={id} onClick={() => setActivePage(id)}
                    className={`nav-btn ${active ? "nav-active" : ""}`}
                    style={{
                      width:"100%", display:"flex", alignItems:"center", gap:9,
                      padding:"8px 10px 8px 14px",
                      borderRadius:7, border:"none", cursor:"pointer",
                      textAlign:"left", fontFamily:"'Outfit',sans-serif",
                      fontSize:13, fontWeight: active ? 600 : 400,
                      color: active ? "var(--accent)" : "var(--muted)",
                      background: active ? "rgba(0,194,255,0.07)" : "transparent",
                      marginBottom:1, position:"relative",
                    }}
                  >
                    {active && <span className="nav-active-bar" />}
                    <span style={{ color: active ? "var(--accent)" : "inherit", opacity: active ? 1 : 0.75, flexShrink:0 }}>
                      <Icon name={icon} size={15} />
                    </span>
                    <span style={{ flex:1 }}>{label}</span>
                    {active && (
                      <span style={{ width:5, height:5, borderRadius:"50%", background:"var(--accent)", boxShadow:"0 0 8px var(--accent)", flexShrink:0 }} />
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding:"12px 16px", borderTop:"1px solid var(--border)", background:"rgba(0,0,0,0.12)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:7 }}>
          <span className="pulse-green" style={{ width:7, height:7, borderRadius:"50%", background:"var(--green)", display:"inline-block", flexShrink:0 }} />
          <span style={{ fontSize:11, fontWeight:500, color:"var(--green)" }}>All Systems Operational</span>
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontSize:11, color:"var(--muted)" }}>Uptime 99.98%</span>
          <LiveClock />
        </div>
      </div>
    </aside>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   TOPBAR
───────────────────────────────────────────────────────────────────────────── */
const Topbar = ({ activePage, currentUser, onLogout }) => {
  const label = NAV_ITEMS.find(n => n.id === activePage)?.label || "";
  const [search, setSearch] = useState("");

  return (
    <header style={{
      position:"fixed", top:0, left:228, right:0, height:56,
      background:"rgba(11,18,32,0.88)", backdropFilter:"blur(16px)",
      borderBottom:"1px solid var(--border)",
      display:"flex", alignItems:"center", gap:14, padding:"0 20px",
      zIndex:30,
    }}>
      {/* Breadcrumb */}
      <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:"var(--muted)", flexShrink:0 }}>
        <span>NetCore</span>
        <span style={{ color:"var(--dim)" }}><Icon name="chevronR" size={11} /></span>
        <span style={{ color:"var(--text)", fontWeight:600 }}>{label}</span>
      </div>

      {/* Search */}
      <div style={{ flex:1, maxWidth:380, marginLeft:6, position:"relative" }}>
        <span style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)", color:"var(--muted)", pointerEvents:"none" }}>
          <Icon name="search" size={14} />
        </span>
        <input className="input-field" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search devices, IPs, events…"
          style={{
            width:"100%", background:"var(--surface)", border:"1px solid var(--border)",
            borderRadius:7, padding:"7px 36px 7px 34px",
            fontSize:13, color:"var(--text)", fontFamily:"'Outfit',sans-serif",
          }}
        />
        <kbd className="mono" style={{
          position:"absolute", right:10, top:"50%", transform:"translateY(-50%)",
          fontSize:10, color:"var(--dim)", background:"var(--surface2)",
          border:"1px solid var(--border)", padding:"2px 5px", borderRadius:4,
        }}>⌘K</kbd>
      </div>

      {/* Right controls */}
      <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:6 }}>
        {/* Status pills */}
        <div style={{ display:"flex", alignItems:"center", gap:10, marginRight:8 }}>
          {[{l:"API",ok:true},{l:"DB",ok:true},{l:"NMS",ok:false}].map(s => (
            <div key={s.l} style={{ display:"flex", alignItems:"center", gap:5 }}>
              <span style={{ width:6, height:6, borderRadius:"50%", display:"inline-block",
                background: s.ok ? "var(--green)" : "var(--amber)",
                boxShadow: s.ok ? "0 0 6px rgba(16,185,129,0.6)" : "0 0 6px rgba(245,158,11,0.6)",
              }} />
              <span style={{ fontSize:11, color:"var(--muted)", fontWeight:500 }}>{s.l}</span>
            </div>
          ))}
        </div>

        <div style={{ width:1, height:22, background:"var(--border)", margin:"0 2px" }} />

        <IconBtn icon="refresh" tip="Refresh" hoverColor="var(--accent)" />

        <div style={{ position:"relative" }}>
          <IconBtn icon="bell" tip="Notifications" hoverColor="var(--accent)" />
          <span className="notif-dot" style={{ position:"absolute", top:4, right:4, width:7, height:7, borderRadius:"50%", background:"var(--red)", boxShadow:"0 0 6px rgba(239,68,68,0.6)" }} />
        </div>

        <div style={{ width:1, height:22, background:"var(--border)", margin:"0 2px" }} />

        {/* User */}
        <div style={{
          display:"flex", alignItems:"center", gap:8, padding:"5px 10px",
          background:"var(--surface2)", border:"1px solid var(--border)",
          borderRadius:8, cursor:"pointer",
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor="var(--border2)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor="var(--border)"; }}
        >
          <div style={{
            width:28, height:28, borderRadius:"50%", flexShrink:0,
            background:"linear-gradient(135deg, var(--accent) 0%, #0066FF 100%)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:11, fontWeight:700, color:"#fff",
          }}>{(currentUser?.username || "U").slice(0,2).toUpperCase()}</div>
          <div style={{ textAlign:"left" }}>
            <div style={{ fontSize:12, fontWeight:600, color:"var(--text)", lineHeight:1 }}>{currentUser?.username || "Unknown"}</div>
            <div className="mono" style={{ fontSize:10, color:"var(--muted)", marginTop:1 }}>{currentUser?.role || "viewer"}</div>
          </div>
          <button className="btn-base"
            onClick={onLogout}
            style={{ marginLeft:6, background:"transparent", border:"none", color:"var(--text)", cursor:"pointer", fontSize:11, fontFamily:"'Outfit',sans-serif", opacity:0.78 }}
            title="Logout"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   DASHBOARD PAGE
───────────────────────────────────────────────────────────────────────────── */
const HealthBar = ({ label, value }) => {
  const color = value > 80 ? "#EF4444" : value > 60 ? "#F59E0B" : "var(--accent)";
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
        <span style={{ fontSize:12, color:"var(--muted)" }}>{label}</span>
        <span className="mono" style={{ fontSize:12, fontWeight:600, color }}>{value}%</span>
      </div>
      <div style={{ height:5, background:"var(--surface2)", borderRadius:99, overflow:"hidden", border:"1px solid var(--border)" }}>
        <div className="bar-animated" style={{
          height:"100%", borderRadius:99, width:`${value}%`,
          background:`linear-gradient(90deg, ${color}99, ${color})`,
          boxShadow:`0 0 8px ${color}55`,
        }} />
      </div>
    </div>
  );
};

const ACT_CFG = {
  success: { icon:"check",    color:"#10B981", bg:"rgba(16,185,129,0.1)",  border:"rgba(16,185,129,0.2)"  },
  warning: { icon:"alertTri", color:"#F59E0B", bg:"rgba(245,158,11,0.1)",  border:"rgba(245,158,11,0.2)"  },
  error:   { icon:"xCircle",  color:"#EF4444", bg:"rgba(239,68,68,0.1)",   border:"rgba(239,68,68,0.2)"   },
  info:    { icon:"info",     color:"#00C2FF", bg:"rgba(0,194,255,0.1)",   border:"rgba(0,194,255,0.2)"   },
};

const DashboardPage = () => {
  const kpis = [
    { label:"Devices Online",  value:"142", sub:"+3 from yesterday",  color:"#10B981", icon:"devices",  glow:"0 0 22px rgba(16,185,129,0.1)" },
    { label:"Devices Offline", value:"7",   sub:"2 alerts active",    color:"#EF4444", icon:"xCircle",  glow:"0 0 22px rgba(239,68,68,0.1)" },
    { label:"Running Jobs",    value:"6",   sub:"4 backup · 2 scan",  color:"#00C2FF", icon:"refresh",  glow:"0 0 22px rgba(0,194,255,0.1)" },
    { label:"Last Backup",     value:"2m",  sub:"core-sw-01 · OK",    color:"#F59E0B", icon:"download", glow:"0 0 22px rgba(245,158,11,0.1)" },
  ];

  return (
    <div className="page-enter" style={{ display:"flex", flexDirection:"column", gap:18 }}>

      {/* KPIs */}
      <div className="stagger" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14 }}>
        {kpis.map(k => (
          <Card key={k.label} className="kpi-card" style={{ padding:"18px 20px", position:"relative", overflow:"hidden", boxShadow:k.glow }}>
            <div style={{ position:"absolute", top:-16, right:-16, width:70, height:70, borderRadius:"50%", background:`radial-gradient(circle, ${k.color}1A 0%, transparent 70%)`, pointerEvents:"none" }} />
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <div>
                <div style={{ fontSize:11, fontWeight:500, color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:10 }}>{k.label}</div>
                <div style={{ fontSize:34, fontWeight:700, color:k.color, lineHeight:1, letterSpacing:"-0.02em" }}>{k.value}</div>
                <div style={{ fontSize:11, color:"var(--muted)", marginTop:7 }}>{k.sub}</div>
              </div>
              <div style={{ width:38, height:38, borderRadius:9, background:`${k.color}14`, border:`1px solid ${k.color}28`, display:"flex", alignItems:"center", justifyContent:"center", color:k.color }}>
                <Icon name={k.icon} size={17} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Health + Activity */}
      <div className="stagger" style={{ display:"grid", gridTemplateColumns:"1fr 1.55fr", gap:14 }}>

        <Card>
          <CardHeader title="System Health" subtitle="Live platform metrics" icon="monitoring"
            action={<Pill color="var(--green)">Nominal</Pill>} />
          <div style={{ padding:"16px 18px", display:"flex", flexDirection:"column", gap:16 }}>
            {HEALTH.map(h => <HealthBar key={h.label} {...h} />)}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", borderTop:"1px solid var(--border)", padding:"12px 18px" }}>
            {[{l:"Uptime",v:"99.98%"},{l:"Latency",v:"1.2ms"},{l:"PPS",v:"84.2K"}].map(s => (
              <div key={s.l} style={{ textAlign:"center" }}>
                <div className="mono" style={{ fontSize:14, fontWeight:600, color:"var(--text)" }}>{s.v}</div>
                <div style={{ fontSize:10, color:"var(--muted)", marginTop:3, textTransform:"uppercase", letterSpacing:"0.06em" }}>{s.l}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card style={{ display:"flex", flexDirection:"column" }}>
          <CardHeader title="Recent Activity" subtitle="System-wide event log" icon="audit"
            action={<button style={{ fontSize:12, color:"var(--accent)", background:"none", border:"none", cursor:"pointer", fontFamily:"'Outfit',sans-serif", fontWeight:500 }}>View all →</button>} />
          <div style={{ flex:1, overflowY:"auto" }}>
            {ACTIVITY.map((a, i) => {
              const ic = ACT_CFG[a.type];
              return (
                <div key={a.id} style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"11px 18px", borderBottom: i < ACTIVITY.length-1 ? "1px solid var(--border)" : "none", transition:"background 0.1s", cursor:"default" }}
                  onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,0.02)"}
                  onMouseLeave={e => e.currentTarget.style.background="transparent"}
                >
                  <div style={{ width:28, height:28, borderRadius:7, flexShrink:0, marginTop:1, background:ic.bg, border:`1px solid ${ic.border}`, display:"flex", alignItems:"center", justifyContent:"center", color:ic.color }}>
                    <Icon name={ic.icon} size={13} />
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, color:"var(--text)", fontWeight:500, marginBottom:3 }}>{a.event}</div>
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <span className="mono" style={{ fontSize:11, color:"var(--accent)" }}>{a.device}</span>
                      <span style={{ fontSize:11, color:"var(--dim)" }}>·</span>
                      <span style={{ fontSize:11, color:"var(--muted)" }}>by {a.user}</span>
                    </div>
                  </div>
                  <span style={{ fontSize:11, color:"var(--muted)", whiteSpace:"nowrap", marginTop:2 }}>{a.ago}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Device Snapshot */}
      <div className="stagger">
        <Card>
          <CardHeader title="Device Snapshot" subtitle="Quick status overview" icon="devices"
            action={<Pill color="var(--accent)">142 total</Pill>} />
          <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)" }}>
            {DEVICES.slice(0,5).map((d,i) => (
              <div key={d.id} style={{ padding:"14px 16px", borderRight: i<4 ? "1px solid var(--border)" : "none", transition:"background 0.1s", cursor:"default" }}
                onMouseEnter={e => e.currentTarget.style.background="rgba(0,194,255,0.025)"}
                onMouseLeave={e => e.currentTarget.style.background="transparent"}
              >
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:7 }}>
                  <Pill color="var(--muted)">{d.vendor}</Pill>
                  <StatusBadge status={d.status} />
                </div>
                <div style={{ fontSize:13, fontWeight:600, color:"var(--text)", marginBottom:2 }}>{d.hostname}</div>
                <div className="mono" style={{ fontSize:11, color:"var(--accent)" }}>{d.ip}</div>
                <div style={{ fontSize:11, color:"var(--muted)", marginTop:6 }}>
                  <span style={{ color:"var(--dim)" }}>Backup: </span>{d.backup}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   DEVICES PAGE
───────────────────────────────────────────────────────────────────────────── */
const DevicesPage = ({ onOpenService, appendLog }) => {
  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("hostname");
  const [sortDir, setSortDir] = useState("asc");
  const [selected, setSelected] = useState(new Set());
  const [deletedIds, setDeletedIds] = useState(new Set());
  const visibleDevices = DEVICES.filter(d => !deletedIds.has(d.id));

  const counts = {
    All: visibleDevices.length,
    Online:  visibleDevices.filter(d => d.status === "online").length,
    Offline: visibleDevices.filter(d => d.status === "offline").length,
    Warning: visibleDevices.filter(d => d.status === "warning").length,
  };

  const filtered = visibleDevices
    .filter(d => statusFilter === "All" || d.status === statusFilter.toLowerCase())
    .filter(d => !search || [d.hostname, d.ip, d.vendor, d.model, d.region].some(v => v.toLowerCase().includes(search.toLowerCase())))
    .sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      return a[sortKey] > b[sortKey] ? dir : -dir;
    });

  const toggleSort = key => { if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc"); else { setSortKey(key); setSortDir("asc"); } };
  const allSel = filtered.length > 0 && filtered.every(d => selected.has(d.id));
  const toggleAll = () => setSelected(allSel ? new Set() : new Set(filtered.map(d => d.id)));

  const ColH = ({ label, col }) => (
    <th onClick={() => col && toggleSort(col)} style={{
      padding:"10px 14px", textAlign:"left", fontSize:11, fontWeight:600,
      color:"var(--muted)", letterSpacing:"0.05em", textTransform:"uppercase",
      cursor:col?"pointer":"default", userSelect:"none", whiteSpace:"nowrap",
    }}>
      <span style={{ display:"inline-flex", alignItems:"center", gap:4 }}>
        {label}
        {col && <span style={{ opacity: sortKey===col ? 0.9 : 0.3 }}><Icon name={sortDir==="asc"||sortKey!==col?"arrowUp":"arrowDown"} size={11} /></span>}
      </span>
    </th>
  );

  return (
    <div className="page-enter" style={{ display:"flex", flexDirection:"column", gap:16 }}>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:14, flexWrap:"wrap" }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:700, color:"#fff", letterSpacing:"-0.02em", lineHeight:1.2 }}>Device Inventory</h1>
          <p style={{ fontSize:12, color:"var(--muted)", marginTop:3 }}>
            {visibleDevices.length} devices · {counts.Online} reachable · {counts.Offline} offline
          </p>
        </div>
        <div style={{ marginLeft:"auto", display:"flex", gap:8, alignItems:"center" }}>
          {selected.size > 0 && (
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <span style={{ fontSize:12, color:"var(--muted)" }}>{selected.size} selected</span>
              <button className="btn-base" onClick={() => {
                setDeletedIds(prev => new Set([...prev, ...selected]));
                appendLog?.("warning", `Deleted ${selected.size} device(s) from current view`);
                setSelected(new Set());
              }} style={{ padding:"6px 12px", background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.22)", borderRadius:7, color:"#EF4444", fontSize:12, fontFamily:"'Outfit',sans-serif", fontWeight:500 }}>
                Delete Selected
              </button>
            </div>
          )}
          <button className="btn-base" style={{ padding:"7px 13px", background:"var(--surface2)", border:"1px solid var(--border)", borderRadius:7, color:"var(--text)", fontSize:13, fontFamily:"'Outfit',sans-serif", display:"flex", alignItems:"center", gap:6 }}
            onMouseEnter={e => e.currentTarget.style.borderColor="var(--border2)"}
            onMouseLeave={e => e.currentTarget.style.borderColor="var(--border)"}
          >
            <Icon name="download" size={14} /> Export
          </button>
          <PrimaryBtn icon="plus">Add Device</PrimaryBtn>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
        <div style={{ display:"flex", background:"var(--surface)", border:"1px solid var(--border)", borderRadius:8, padding:3, gap:2 }}>
          {["All","Online","Offline","Warning"].map(f => (
            <button key={f} onClick={() => setStatusFilter(f)} className="btn-base" style={{
              padding:"5px 12px", borderRadius:6, border:"none", cursor:"pointer",
              fontSize:12, fontWeight: statusFilter===f ? 600 : 400, fontFamily:"'Outfit',sans-serif",
              background: statusFilter===f ? "var(--surface2)" : "transparent",
              color: statusFilter===f ? "var(--text)" : "var(--muted)",
              boxShadow: statusFilter===f ? "0 1px 4px rgba(0,0,0,0.3)" : "none",
              transition:"all 0.14s",
            }}>
              {f} <span className="mono" style={{ fontSize:10, color: statusFilter===f ? "var(--accent)" : "var(--dim)", marginLeft:3 }}>{counts[f]}</span>
            </button>
          ))}
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:7, background:"var(--surface)", border:"1px solid var(--border)", borderRadius:8, padding:"6px 12px", marginLeft:"auto", minWidth:220 }}>
          <Icon name="search" size={13} />
          <input className="input-field" value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter devices…"
            style={{ background:"none", border:"none", outline:"none", fontSize:12, color:"var(--text)", fontFamily:"'Outfit',sans-serif", width:"100%" }} />
          {search && <button className="btn-base" onClick={() => setSearch("")} style={{ background:"none", border:"none", color:"var(--muted)", cursor:"pointer", padding:0 }}>✕</button>}
        </div>
      </div>

      {/* Table */}
      <Card style={{ overflow:"hidden" }}>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ borderBottom:"1px solid var(--border)", background:"rgba(0,0,0,0.15)" }}>
                <th style={{ padding:"10px 14px", width:42 }}>
                  <input type="checkbox" checked={allSel} onChange={toggleAll} style={{ cursor:"pointer", accentColor:"var(--accent)" }} />
                </th>
                <ColH label="Hostname" col="hostname" />
                <ColH label="IP Address" col="ip" />
                <ColH label="Vendor & Model" col="vendor" />
                <ColH label="Region" col="region" />
                <ColH label="Status" col="status" />
                <ColH label="Last Backup" col="backup" />
                <th style={{ padding:"10px 14px", textAlign:"right", fontSize:11, color:"var(--muted)", letterSpacing:"0.05em", textTransform:"uppercase" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d,i) => {
                const isSel = selected.has(d.id);
                return (
                  <tr key={d.id} className="table-row" style={{ borderBottom: i<filtered.length-1 ? "1px solid var(--border)" : "none", background: isSel ? "rgba(0,194,255,0.04)" : "transparent" }}>
                    <td style={{ padding:"12px 14px" }}>
                      <input type="checkbox" checked={isSel} onChange={() => setSelected(s => { const n=new Set(s); n.has(d.id)?n.delete(d.id):n.add(d.id); return n; })}
                        style={{ cursor:"pointer", accentColor:"var(--accent)" }} />
                    </td>
                    <td style={{ padding:"12px 14px" }}>
                      <div style={{ fontSize:13, fontWeight:600, color:"var(--text)" }}>{d.hostname}</div>
                      <div className="mono" style={{ fontSize:10, color:"var(--muted)", marginTop:2 }}>{d.model}</div>
                    </td>
                    <td style={{ padding:"12px 14px" }}>
                      <span className="mono" style={{ fontSize:12, color:"var(--accent)" }}>{d.ip}</span>
                    </td>
                    <td style={{ padding:"12px 14px" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                        <div style={{ width:7, height:7, borderRadius:"50%", background:VENDOR_COLORS[d.vendor]||"var(--muted)", flexShrink:0 }} />
                        <span style={{ fontSize:13, color:"var(--text)" }}>{d.vendor}</span>
                      </div>
                    </td>
                    <td style={{ padding:"12px 14px" }}>
                      <Pill color="var(--muted)">{d.region}</Pill>
                    </td>
                    <td style={{ padding:"12px 14px" }}>
                      <StatusBadge status={d.status} />
                    </td>
                    <td style={{ padding:"12px 14px" }}>
                      <span className="mono" style={{ fontSize:11, color:"var(--muted)" }}>{d.backup}</span>
                    </td>
                    <td style={{ padding:"12px 14px" }}>
                      <div className="row-actions" style={{ display:"flex", justifyContent:"flex-end", gap:2, opacity:0 }}>
                        <IconBtn icon="connect"  tip="SSH Connect" color="var(--muted)" hoverColor="var(--accent)" onClick={() => {
                          appendLog?.("info", `Open SSH service for ${d.ip}`);
                          onOpenService?.("terminal", { targetIp: d.ip, hostname: d.hostname });
                        }} />
                        <IconBtn icon="download" tip="Backup Now"  color="var(--muted)" hoverColor="#10B981" onClick={() => {
                          appendLog?.("info", `Open Backup service for ${d.ip}`);
                          onOpenService?.("backup", { network: `${d.ip}/32` });
                        }} />
                        <IconBtn icon="edit"     tip="Edit Device" color="var(--muted)" hoverColor="#F59E0B" onClick={() => {
                          appendLog?.("info", `Open Settings from device ${d.hostname}`);
                          onOpenService?.("settings", { fromDevice: d.hostname });
                        }} />
                        <IconBtn icon="trash"    tip="Delete"      color="var(--muted)" hoverColor="#EF4444" onClick={() => {
                          setDeletedIds(prev => new Set([...prev, d.id]));
                          appendLog?.("warning", `Deleted ${d.hostname} from current view`);
                        }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div style={{ padding:"48px 20px", textAlign:"center" }}>
              <div style={{ color:"var(--muted)", fontSize:13 }}>No devices match your filters.</div>
              <button className="btn-base" onClick={() => { setSearch(""); setStatusFilter("All"); }}
                style={{ marginTop:10, fontSize:12, color:"var(--accent)", background:"none", border:"none", cursor:"pointer", fontFamily:"'Outfit',sans-serif" }}>
                Clear filters
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:"10px 16px", borderTop:"1px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"space-between", background:"rgba(0,0,0,0.1)" }}>
          <span style={{ fontSize:12, color:"var(--muted)" }}>
            Showing <b style={{ color:"var(--text)" }}>{filtered.length}</b> of <b style={{ color:"var(--text)" }}>{visibleDevices.length}</b> devices
          </span>
          <div style={{ display:"flex", gap:4 }}>
            {["←","1","2","3","→"].map((p,i) => (
              <button key={i} className="btn-base" style={{
                width:28, height:28, borderRadius:6, cursor:"pointer",
                background: p==="1" ? "rgba(0,194,255,0.1)" : "transparent",
                border:`1px solid ${p==="1" ? "rgba(0,194,255,0.3)" : "var(--border)"}`,
                color: p==="1" ? "var(--accent)" : "var(--muted)", fontSize:12,
              }}>{p}</button>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   PLACEHOLDER
───────────────────────────────────────────────────────────────────────────── */
const ServiceWorkbenchPage = ({ pageId, settings, setSettings, appendLog, serviceContext }) => {
  const [network, setNetwork] = useState("10.0.1.0/24");
  const [sito, setSito] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [terminalTarget, setTerminalTarget] = useState("");
  const [result, setResult] = useState("");
  const [health, setHealth] = useState({ ssh: "unknown", backup: "unknown", discovery: "unknown" });

  const callJson = async (url, options = {}) => {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        ...(settings.apiToken ? { Authorization: `Bearer ${settings.apiToken}` } : {}),
      },
    });
    let data = null;
    try { data = await response.json(); } catch {}
    if (!response.ok) throw new Error(data?.error || `HTTP ${response.status}`);
    return data;
  };

  const runDiscovery = async () => {
    try {
      setResult("Discovery in corso...");
      const data = await callJson(`${settings.discoveryBase}/api/discover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ network, sync: true })
      });
      appendLog("success", `Discovery completata su ${network}`);
      setResult(JSON.stringify(data, null, 2));
    } catch (e) {
      appendLog("error", `Discovery fallita: ${e.message}`);
      setResult(`Errore: ${e.message}`);
    }
  };

  const runBackupFlow = async () => {
    try {
      setResult("Backup workflow in corso...");
      const data = await callJson(`${settings.backupBase}/api/backup/discover-and-backup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subnet: network || undefined,
          sito: sito || undefined,
          username: username || undefined,
          password: password || undefined,
        })
      });
      appendLog("success", `Backup/discovery completato su ${network || sito}`);
      setResult(JSON.stringify(data, null, 2));
    } catch (e) {
      appendLog("error", `Backup flow fallito: ${e.message}`);
      setResult(`Errore: ${e.message}`);
    }
  };

  const checkMonitoring = async () => {
    const state = { ssh: "down", backup: "down", discovery: "down" };
    const authHeaders = settings.apiToken ? { Authorization: `Bearer ${settings.apiToken}` } : {};
    try { const r = await fetch(`${settings.sshBackendBase}/health`, { headers: authHeaders }); if (r.ok) state.ssh = "up"; } catch {}
    try { const r = await fetch(`${settings.backupBase}/api/health`, { headers: authHeaders }); if (r.ok) state.backup = "up"; } catch {}
    try { const r = await fetch(`${settings.discoveryBase}/api/health`, { headers: authHeaders }); if (r.ok) state.discovery = "up"; } catch {}
    setHealth(state);
    appendLog("info", `Health check: SSH ${state.ssh}, Backup ${state.backup}, Discovery ${state.discovery}`);
    setResult(JSON.stringify(state, null, 2));
  };

  useEffect(() => {
    if (pageId === "monitoring") checkMonitoring();
  }, [pageId]);

  useEffect(() => {
    if (!serviceContext) return;
    if (serviceContext.network) setNetwork(serviceContext.network);
    if (serviceContext.sito) setSito(serviceContext.sito);
    if (serviceContext.username) setUsername(serviceContext.username);
    if (serviceContext.password) setPassword(serviceContext.password);
    if (serviceContext.targetIp) setTerminalTarget(serviceContext.targetIp);
    if (serviceContext.targetIp || serviceContext.hostname) {
      const target = serviceContext.targetIp || serviceContext.hostname;
      setResult(`Selected target: ${target}\nWS Endpoint: ${settings.sshBackendBase}/ws`);
    }
  }, [serviceContext, settings.sshBackendBase]);

  const cardStyle = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: 16 };

  if (pageId === "terminal") {
    return (
      <div className="page-enter" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={cardStyle}>
          <h2 style={{ fontSize: 18, color: "#fff", marginBottom: 8 }}>SSH Terminal Service</h2>
          <p style={{ fontSize: 13, color: "#fff", opacity: 0.85, marginBottom: 10 }}>Servizio integrato nella dashboard unica.</p>
          <div style={{ marginBottom: 10 }}>
            <input value={terminalTarget} onChange={e => setTerminalTarget(e.target.value)} placeholder="IP/hostname target"
              style={{ width:"100%", maxWidth: 520, background: "var(--surface2)", border: "1px solid var(--border2)", borderRadius: 8, padding: "10px 12px", color: "#fff" }} />
          </div>
          <div className="mono" style={{ fontSize: 12, color: "#7CFC8A" }}>
            WS Endpoint: {settings.sshBackendBase}/ws
          </div>
        </div>
        <pre className="mono" style={{ ...cardStyle, background: "#060b14", color: "#7CFC8A", minHeight: 220 }}>{result || "Terminal service ready"}</pre>
      </div>
    );
  }

  if (pageId === "discovery") {
    return (
      <div className="page-enter" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={cardStyle}>
          <h2 style={{ fontSize: 18, color: "#fff", marginBottom: 8 }}>Network Discovery</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, maxWidth: 520 }}>
            <input value={network} onChange={e => setNetwork(e.target.value)} placeholder="10.0.1.0/24" style={{ background: "var(--surface2)", border: "1px solid var(--border2)", borderRadius: 8, padding: "10px 12px", color: "#fff" }} />
            <PrimaryBtn icon="discovery" onClick={runDiscovery}>Run Discovery</PrimaryBtn>
          </div>
        </div>
        <pre className="mono" style={{ ...cardStyle, background: "#060b14", color: "#7CFC8A", minHeight: 260, overflow: "auto" }}>{result || "Nessun risultato."}</pre>
      </div>
    );
  }

  if (pageId === "backup") {
    return (
      <div className="page-enter" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={cardStyle}>
          <h2 style={{ fontSize: 18, color: "#fff", marginBottom: 8 }}>Backup & Config</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <input value={network} onChange={e => setNetwork(e.target.value)} placeholder="Subnet CIDR" style={{ background: "var(--surface2)", border: "1px solid var(--border2)", borderRadius: 8, padding: "10px 12px", color: "#fff" }} />
            <input value={sito} onChange={e => setSito(e.target.value)} placeholder="Sito (optional)" style={{ background: "var(--surface2)", border: "1px solid var(--border2)", borderRadius: 8, padding: "10px 12px", color: "#fff" }} />
            <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Username (optional)" style={{ background: "var(--surface2)", border: "1px solid var(--border2)", borderRadius: 8, padding: "10px 12px", color: "#fff" }} />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password (optional)" style={{ background: "var(--surface2)", border: "1px solid var(--border2)", borderRadius: 8, padding: "10px 12px", color: "#fff" }} />
          </div>
          <div style={{ marginTop: 10 }}><PrimaryBtn icon="backup" onClick={runBackupFlow}>Run Backup Workflow</PrimaryBtn></div>
        </div>
        <pre className="mono" style={{ ...cardStyle, background: "#060b14", color: "#7CFC8A", minHeight: 260, overflow: "auto" }}>{result || "Nessun risultato backup."}</pre>
      </div>
    );
  }

  if (pageId === "monitoring") {
    return (
      <div className="page-enter" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
          {[{ label: "SSH Backend", v: health.ssh }, { label: "Backup API", v: health.backup }, { label: "Discovery API", v: health.discovery }].map(x => (
            <Card key={x.label} style={{ padding: 14 }}>
              <div style={{ fontSize: 12, color: "#fff", opacity: 0.8 }}>{x.label}</div>
              <div style={{ marginTop: 6, fontSize: 22, fontWeight: 700, color: x.v === "up" ? "#10B981" : "#EF4444" }}>{x.v.toUpperCase()}</div>
            </Card>
          ))}
        </div>
        <div style={cardStyle}><PrimaryBtn icon="refresh" onClick={checkMonitoring}>Refresh Monitoring</PrimaryBtn></div>
      </div>
    );
  }

  if (pageId === "settings") {
    return (
      <div className="page-enter" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={cardStyle}>
          <h2 style={{ fontSize: 18, color: "#fff", marginBottom: 8 }}>Platform Settings</h2>
          <div style={{ display: "grid", gap: 8 }}>
            <input value={settings.sshBackendBase} onChange={e => setSettings(s => ({ ...s, sshBackendBase: e.target.value }))} placeholder="SSH backend base URL" style={{ background: "var(--surface2)", border: "1px solid var(--border2)", borderRadius: 8, padding: "10px 12px", color: "#fff" }} />
            <input value={settings.backupBase} onChange={e => setSettings(s => ({ ...s, backupBase: e.target.value }))} placeholder="Backup API base URL" style={{ background: "var(--surface2)", border: "1px solid var(--border2)", borderRadius: 8, padding: "10px 12px", color: "#fff" }} />
            <input value={settings.discoveryBase} onChange={e => setSettings(s => ({ ...s, discoveryBase: e.target.value }))} placeholder="Discovery API base URL" style={{ background: "var(--surface2)", border: "1px solid var(--border2)", borderRadius: 8, padding: "10px 12px", color: "#fff" }} />
            <input value={settings.apiToken} onChange={e => setSettings(s => ({ ...s, apiToken: e.target.value }))} placeholder="API Bearer Token" style={{ background: "var(--surface2)", border: "1px solid var(--border2)", borderRadius: 8, padding: "10px 12px", color: "#fff" }} />
          </div>
          <div style={{ marginTop: 10 }}>
            <PrimaryBtn icon="settings" onClick={() => {
              localStorage.setItem("nms_ssh_backend_base", settings.sshBackendBase);
              localStorage.setItem("nms_backup_base", settings.backupBase);
              localStorage.setItem("nms_discovery_base", settings.discoveryBase);
              localStorage.setItem("nms_api_token", settings.apiToken);
              appendLog("success", "Settings salvate");
            }}>Save Settings</PrimaryBtn>
          </div>
        </div>
      </div>
    );
  }

  const item = NAV_ITEMS.find(n => n.id === pageId);
  return (
    <div className="page-enter" style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"60vh" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ width:56, height:56, borderRadius:14, background:"var(--surface)", border:"1px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"center", color:"var(--muted)", margin:"0 auto 16px" }}>
          <Icon name={item?.icon||"settings"} size={24} />
        </div>
        <h2 style={{ fontSize:16, fontWeight:600, color:"#fff", marginBottom:6 }}>{item?.label}</h2>
        <p style={{ fontSize:13, color:"#fff", opacity:0.8, marginBottom:20 }}>Modulo integrato nella dashboard unica.</p>
        <Pill color="var(--accent)">Integrated</Pill>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   APP
───────────────────────────────────────────────────────────────────────────── */
const SETUP_KEY = "nms_setup_v1";
const SESSION_KEY = "nms_session_v1";

const hashPassword = async (value) => {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
};

const SetupWizard = ({ onDone }) => {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sshBackendBase, setSshBackendBase] = useState("http://localhost:3000");
  const [backupBase, setBackupBase] = useState("http://localhost:5003");
  const [discoveryBase, setDiscoveryBase] = useState("http://localhost:5004");
  const [adminToken, setAdminToken] = useState("admin-token");
  const [operatorToken, setOperatorToken] = useState("operator-token");
  const [viewerToken, setViewerToken] = useState("viewer-token");

  const submit = async () => {
    setError("");
    if (!username.trim()) return setError("Username obbligatorio");
    if (password.length < 8) return setError("Password minimo 8 caratteri");
    if (password !== confirm) return setError("Password non coincidono");
    setBusy(true);
    try {
      const response = await fetch(`${backupBase}/api/auth/bootstrap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password, role: "admin" }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || `Bootstrap failed (${response.status})`);

      const payload = {
        createdAt: new Date().toISOString(),
        endpoints: { sshBackendBase, backupBase, discoveryBase },
        tokens: { admin: adminToken, operator: operatorToken, viewer: viewerToken },
      };
      localStorage.setItem(SETUP_KEY, JSON.stringify(payload));
      localStorage.setItem("nms_ssh_backend_base", sshBackendBase);
      localStorage.setItem("nms_backup_base", backupBase);
      localStorage.setItem("nms_discovery_base", discoveryBase);
      localStorage.setItem("nms_api_token", adminToken);
      onDone(payload);
    } catch (e) {
      setError(`Errore setup: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"var(--bg)", padding:20 }}>
      <Card style={{ width:"100%", maxWidth:720, padding:24 }}>
        <h1 style={{ color:"#fff", fontSize:24, fontWeight:700, marginBottom:8 }}>Prima Configurazione Iniziale</h1>
        <p style={{ color:"#fff", opacity:0.8, fontSize:13, marginBottom:16 }}>Configura admin, endpoint e token per attivare la console enterprise.</p>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Admin username" style={{ background:"var(--surface2)", border:"1px solid var(--border2)", color:"#fff", borderRadius:8, padding:"10px 12px" }} />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Admin password" style={{ background:"var(--surface2)", border:"1px solid var(--border2)", color:"#fff", borderRadius:8, padding:"10px 12px" }} />
          <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Conferma password" style={{ background:"var(--surface2)", border:"1px solid var(--border2)", color:"#fff", borderRadius:8, padding:"10px 12px" }} />
          <div />
          <input value={sshBackendBase} onChange={e => setSshBackendBase(e.target.value)} placeholder="SSH backend URL" style={{ background:"var(--surface2)", border:"1px solid var(--border2)", color:"#fff", borderRadius:8, padding:"10px 12px" }} />
          <input value={backupBase} onChange={e => setBackupBase(e.target.value)} placeholder="Backup API URL" style={{ background:"var(--surface2)", border:"1px solid var(--border2)", color:"#fff", borderRadius:8, padding:"10px 12px" }} />
          <input value={discoveryBase} onChange={e => setDiscoveryBase(e.target.value)} placeholder="Discovery API URL" style={{ background:"var(--surface2)", border:"1px solid var(--border2)", color:"#fff", borderRadius:8, padding:"10px 12px" }} />
          <div />
          <input value={adminToken} onChange={e => setAdminToken(e.target.value)} placeholder="Admin token" style={{ background:"var(--surface2)", border:"1px solid var(--border2)", color:"#fff", borderRadius:8, padding:"10px 12px" }} />
          <input value={operatorToken} onChange={e => setOperatorToken(e.target.value)} placeholder="Operator token" style={{ background:"var(--surface2)", border:"1px solid var(--border2)", color:"#fff", borderRadius:8, padding:"10px 12px" }} />
          <input value={viewerToken} onChange={e => setViewerToken(e.target.value)} placeholder="Viewer token" style={{ background:"var(--surface2)", border:"1px solid var(--border2)", color:"#fff", borderRadius:8, padding:"10px 12px" }} />
        </div>
        {error && <div style={{ color:"#EF4444", marginTop:10, fontSize:12 }}>{error}</div>}
        <div style={{ marginTop:14 }}><PrimaryBtn icon="check" onClick={submit}>{busy ? "Configuring..." : "Complete Setup"}</PrimaryBtn></div>
      </Card>
    </div>
  );
};

const LoginView = ({ setup, onLogin }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError("");
    setBusy(true);
    try {
      const backupBase = setup?.endpoints?.backupBase || "http://localhost:5003";
      let session = null;
      try {
        const response = await fetch(`${backupBase}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: username.trim(), password }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data?.success) throw new Error(data?.error || "Login failed");
        const role = data?.user?.role || "viewer";
        const serviceToken = (setup.tokens || {})[role] || (setup.tokens || {}).admin || "admin-token";
        session = {
          username: data?.user?.username || username.trim(),
          role,
          accessToken: data?.access_token || "",
          refreshToken: data?.refresh_token || "",
          serviceToken,
          loginAt: Date.now(),
        };
      } catch {
        const found = (setup.users || []).find(u => u.username === username.trim());
        if (!found) throw new Error("Utente non trovato");
        const hash = await hashPassword(password);
        if (hash !== found.passwordHash) throw new Error("Password errata");
        session = {
          username: found.username,
          role: found.role,
          accessToken: "",
          refreshToken: "",
          serviceToken: (setup.tokens || {})[found.role] || (setup.tokens || {}).admin || "admin-token",
          loginAt: Date.now(),
        };
      }
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      localStorage.setItem("nms_api_token", session.accessToken || session.serviceToken);
      onLogin(session);
    } catch (e) {
      setError(e.message || "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"var(--bg)", padding:20 }}>
      <Card style={{ width:"100%", maxWidth:440, padding:24 }}>
        <h1 style={{ color:"#fff", fontSize:24, fontWeight:700, marginBottom:8 }}>Enterprise Login</h1>
        <p style={{ color:"#fff", opacity:0.8, fontSize:13, marginBottom:16 }}>Accedi con il tuo account configurato.</p>
        <div style={{ display:"grid", gap:10 }}>
          <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" style={{ background:"var(--surface2)", border:"1px solid var(--border2)", color:"#fff", borderRadius:8, padding:"10px 12px" }} />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" style={{ background:"var(--surface2)", border:"1px solid var(--border2)", color:"#fff", borderRadius:8, padding:"10px 12px" }} />
        </div>
        {error && <div style={{ color:"#EF4444", marginTop:10, fontSize:12 }}>{error}</div>}
        <div style={{ marginTop:14 }}><PrimaryBtn icon="check" onClick={submit}>{busy ? "Signing in..." : "Login"}</PrimaryBtn></div>
      </Card>
    </div>
  );
};

export default function App() {
  const [setupConfig, setSetupConfig] = useState(() => {
    try {
      const raw = localStorage.getItem(SETUP_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [session, setSession] = useState(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [activePage, setActivePage] = useState("dashboard");
  const [runtimeLogs, setRuntimeLogs] = useState([]);
  const [serviceContext, setServiceContext] = useState({});
  const [settings, setSettings] = useState({
    sshBackendBase: localStorage.getItem("nms_ssh_backend_base") || "http://localhost:3000",
    backupBase: localStorage.getItem("nms_backup_base") || "http://localhost:5003",
    discoveryBase: localStorage.getItem("nms_discovery_base") || "http://localhost:5004",
    apiToken: localStorage.getItem("nms_api_token") || "",
  });

  const appendLog = (type, message) => {
    setRuntimeLogs(prev => [{ id: Date.now() + Math.random(), type, message, at: new Date().toLocaleTimeString("it-IT") }, ...prev].slice(0, 80));
  };

  useEffect(() => {
    if (!setupConfig?.endpoints) return;
    setSettings(prev => ({
      ...prev,
      sshBackendBase: localStorage.getItem("nms_ssh_backend_base") || setupConfig.endpoints.sshBackendBase || prev.sshBackendBase,
      backupBase: localStorage.getItem("nms_backup_base") || setupConfig.endpoints.backupBase || prev.backupBase,
      discoveryBase: localStorage.getItem("nms_discovery_base") || setupConfig.endpoints.discoveryBase || prev.discoveryBase,
    }));
  }, [setupConfig]);

  useEffect(() => {
    if (!session) return;
    setSettings(prev => ({ ...prev, apiToken: session.accessToken || session.serviceToken || prev.apiToken }));
  }, [session]);

  const openService = (pageId, context = {}) => {
    setServiceContext(context);
    setActivePage(pageId);
  };

  const renderPage = () => {
    switch (activePage) {
      case "dashboard": return <DashboardPage />;
      case "devices":   return <DevicesPage onOpenService={openService} appendLog={appendLog} />;
      default:          return <ServiceWorkbenchPage pageId={activePage} settings={settings} setSettings={setSettings} appendLog={appendLog} serviceContext={serviceContext} />;
    }
  };

  const handleSetupDone = (setupPayload) => {
    setSetupConfig(setupPayload);
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
  };

  const handleLogin = (sessionPayload) => {
    setSession(sessionPayload);
    setActivePage("dashboard");
  };

  const handleLogout = async () => {
    try {
      const backupBase = setupConfig?.endpoints?.backupBase || "http://localhost:5003";
      if (session?.accessToken) {
        await fetch(`${backupBase}/api/auth/logout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.accessToken}`,
          },
          body: JSON.stringify({ refresh_token: session?.refreshToken || "" }),
        });
      }
    } catch {}
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem("nms_api_token");
    setSession(null);
    setActivePage("dashboard");
  };

  if (!setupConfig) {
    return (
      <>
        <GlobalStyles />
        <SetupWizard onDone={handleSetupDone} />
      </>
    );
  }

  if (!session) {
    return (
      <>
        <GlobalStyles />
        <LoginView setup={setupConfig} onLogin={handleLogin} />
      </>
    );
  }

  return (
    <>
      <GlobalStyles />
      <div className="dot-bg" style={{ display:"flex", height:"100vh", overflow:"hidden" }}>
        <Sidebar activePage={activePage} setActivePage={setActivePage} />
        <div style={{ marginLeft:228, flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
          <Topbar activePage={activePage} currentUser={session} onLogout={handleLogout} />
          <main style={{ marginTop:56, flex:1, overflowY:"auto", padding:"22px 24px" }}>
            {renderPage()}
            <div style={{ marginTop:16 }}>
              <Card>
                <CardHeader title="Runtime Service Log" subtitle="Unified in-dashboard actions" icon="audit" />
                <div style={{ maxHeight:140, overflowY:"auto", padding:"8px 14px" }}>
                  {runtimeLogs.length === 0 && <div style={{ fontSize:12, color:"#fff", opacity:0.7 }}>No runtime actions yet.</div>}
                  {runtimeLogs.map(log => (
                    <div key={log.id} className="mono" style={{ fontSize:11, color:"#fff", padding:"4px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                      [{log.at}] {log.type.toUpperCase()} - {log.message}
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
