// agy-Sag — Theme-Adaptive Zero-:has() Stylesheet (UMD)
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.__agSgStyles = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  const STYLE_ID = 'ag-sg-core-css';

  // Zero :has(), pure host CSS variables for automatic Native & Obsidian Prism 4-theme integration
  const CORE_CSS = `
.ag-sg-banner,.ag-sg-recovery-bar,.ag-sg-draft-bar{position:relative;box-sizing:border-box;width:100%;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:nowrap;margin:0 0 10px 0;padding:6px 10px;border-radius:10px;border:1px solid var(--border,rgba(148,163,184,.24));background:color-mix(in srgb,var(--popover,var(--card,#ffffff)) 94%,transparent);backdrop-filter:blur(12px);color:var(--foreground,#0f172a);font:12px/1.35 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei UI",sans-serif;box-shadow:0 4px 16px -6px rgba(15,23,42,.12);z-index:30;transition:opacity 160ms ease,transform 160ms ease,border-color 160ms ease;}
.ag-sg-banner[hidden],.ag-sg-recovery-bar[hidden],.ag-sg-draft-bar[hidden]{display:none!important;}
.ag-sg-banner[data-severity="overflow"]{border-color:color-mix(in srgb,var(--error,#ef4444) 42%,var(--border,rgba(148,163,184,.24)));}
.ag-sg-banner[data-severity="countdown"]{border-color:color-mix(in srgb,var(--primary,#3186ff) 36%,var(--border,rgba(148,163,184,.24)));}
.ag-sg-banner[data-severity="stall"]{border-color:color-mix(in srgb,var(--warning,#f59e0b) 44%,var(--border,rgba(148,163,184,.24)));}
.ag-sg-left{display:flex;align-items:center;gap:7px;min-width:0;flex:1 1 auto;}
.ag-sg-dot,.ag-sg-recovery-dot,.ag-sg-draft-dot{width:6px;height:6px;border-radius:999px;flex:0 0 auto;background:var(--warning,#f59e0b);}
.ag-sg-banner[data-severity="overflow"] .ag-sg-dot{background:var(--error,#ef4444);}
.ag-sg-banner[data-severity="countdown"] .ag-sg-dot{background:var(--primary,#3186ff);}
.ag-sg-banner[data-severity="stall"] .ag-sg-dot{background:var(--warning,#f59e0b);}
.ag-sg-msg{font-weight:500;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.ag-sg-focus-tag{flex:0 0 auto;padding:1px 6px;border-radius:999px;border:1px solid color-mix(in srgb,var(--primary,#3186ff) 45%,transparent);background:color-mix(in srgb,var(--primary,#3186ff) 14%,transparent);color:var(--primary,#3186ff);font:600 10.5px/1.3 Inter,system-ui,-apple-system,sans-serif;white-space:nowrap;}
.ag-sg-focus-tag[hidden]{display:none!important;}
.ag-sg-actions{display:flex;align-items:center;gap:6px;flex-wrap:wrap;flex:0 0 auto;}
.ag-sg-btn{appearance:none;border:1px solid var(--border,rgba(148,163,184,.28));background:color-mix(in srgb,var(--secondary,rgba(148,163,184,.14)) 75%,transparent);color:var(--foreground,#eef1f7);border-radius:8px;padding:4px 9px;font:500 11.5px/1.3 Inter,system-ui,-apple-system,"Segoe UI",sans-serif;cursor:pointer;white-space:nowrap;transition:background 130ms ease,border-color 130ms ease,opacity 130ms ease;}
.ag-sg-btn:hover:not(:disabled){background:color-mix(in srgb,var(--foreground,#eef1f7) 10%,transparent);border-color:color-mix(in srgb,var(--foreground,#eef1f7) 26%,transparent);}
.ag-sg-btn:disabled{opacity:.48;cursor:not-allowed;}
.ag-sg-btn-primary{background:var(--primary,#3186ff);border-color:color-mix(in srgb,var(--primary,#3186ff) 80%,#fff);color:var(--primary-foreground,#ffffff);font-weight:600;}
.ag-sg-btn-primary:hover:not(:disabled){filter:brightness(1.08);background:var(--primary,#3186ff);}
.ag-sg-btn-icon{padding:4px 7px;min-width:26px;text-align:center;}
.ag-sg-toast{width:100%;font-size:11px;color:var(--muted-foreground,#94a3b8);padding-top:2px;}
.ag-sg-toast[hidden]{display:none!important;}
.ag-sg-toast[data-tone="warn"]{color:var(--warning,#f59e0b);}
.ag-sg-toast[data-tone="ok"]{color:var(--success,#34d399);}
.ag-sg-recovery-bar{z-index:29;}
.ag-sg-recovery-dot{background:var(--success,#10b981);}
.ag-sg-draft-bar{z-index:28;}
.ag-sg-draft-dot{background:var(--primary,#3186ff);}
.ag-sg-pill-wrap{position:relative;display:inline-flex;align-items:center;flex:0 0 auto;margin:0 4px;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei UI",sans-serif;}
.ag-sg-status-pill{appearance:none;display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 8px;border-radius:8px;border:1px solid transparent;background:color-mix(in srgb,var(--secondary,rgba(148,163,184,.14)) 72%,transparent);color:var(--muted-foreground,#64748b);font:500 11.5px/1 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei UI",sans-serif;font-variant-numeric:tabular-nums;cursor:pointer;white-space:nowrap;transition:background 140ms ease,color 140ms ease,border-color 140ms ease;}
.ag-sg-status-pill:hover,.ag-sg-status-pill[aria-expanded="true"]{background:color-mix(in srgb,var(--secondary,rgba(148,163,184,.2)) 100%,transparent);border-color:var(--border,rgba(148,163,184,.26));color:var(--foreground,#0f172a);}
.ag-sg-status-dot{width:6px;height:6px;border-radius:999px;flex:0 0 auto;background:var(--muted-foreground,#94a3b8);}
.ag-sg-status-pill[data-tone="ok"] .ag-sg-status-dot{background:var(--success,#10b981);}
.ag-sg-status-pill[data-tone="warm"] .ag-sg-status-dot{background:var(--primary,#3186ff);}
.ag-sg-status-pill[data-tone="warn"] .ag-sg-status-dot{background:var(--warning,#f59e0b);}
.ag-sg-status-pill[data-tone="danger"] .ag-sg-status-dot{background:var(--error,#ef4444);}
.ag-sg-status-pill[data-synergy="1"]{border-color:color-mix(in srgb,var(--primary,#3186ff) 32%,var(--border,rgba(148,163,184,.24)));}
.ag-sg-status-pill[data-synergy="1"] .ag-sg-status-dot{box-shadow:0 0 0 2px color-mix(in srgb,var(--primary,#3186ff) 30%,transparent);}
.ag-sg-status-card{position:absolute;right:0;bottom:calc(100% + 10px);width:min(360px,calc(100vw - 28px));overflow:hidden;border-radius:14px;border:1px solid color-mix(in srgb,var(--border,rgba(148,163,184,.28)) 80%,rgba(255,255,255,.16));background:color-mix(in srgb,var(--popover,var(--card,#ffffff)) 94%,transparent);backdrop-filter:blur(18px) saturate(1.35);-webkit-backdrop-filter:blur(18px) saturate(1.35);color:var(--foreground,#0f172a);box-shadow:inset 0 1px 0 rgba(255,255,255,.2),0 20px 46px -14px rgba(15,23,42,.32),0 4px 12px rgba(15,23,42,.1);font:12px/1.45 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei UI",sans-serif;z-index:9990;}
.ag-sg-status-card[data-portal="1"]{position:fixed;right:auto;bottom:auto;margin:0;z-index:9996;}
.ag-sg-status-card::before{content:"";position:absolute;top:0;left:0;right:0;height:1.5px;background:linear-gradient(90deg,transparent 4%,#4285f4 26%,#9b72cb 50%,#ea4335 72%,#fbbc04 88%,transparent 96%);opacity:.85;pointer-events:none;}
.ag-sg-status-card[hidden]{display:none!important;}
.ag-sg-card-link{appearance:none;border:0;padding:0;background:transparent;color:var(--warning,#d97706);font:600 11.5px/1.3 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei UI",sans-serif;font-variant-numeric:tabular-nums;cursor:pointer;}
.ag-sg-card-link:hover{text-decoration:underline;}
.ag-sg-card-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 14px 8px;border-bottom:1px solid var(--border,rgba(148,163,184,.2));}
.ag-sg-card-title{font-size:12.5px;font-weight:600;letter-spacing:-.01em;}
.ag-sg-card-meta{display:inline-flex;align-items:center;gap:6px;font-size:11px;color:var(--muted-foreground,#64748b);font-variant-numeric:tabular-nums;}
.ag-sag-meters{display:flex;flex-direction:column;gap:8px;padding:9px 14px 10px;border-top:1px solid var(--border,rgba(148,163,184,.14));}
.ag-sg-hr{display:grid;grid-template-columns:82px 1fr;gap:12px;align-items:stretch;padding:11px 14px;}
.ag-sg-vw{display:flex;flex-direction:column;align-items:center;justify-content:space-between;gap:5px;padding:6px 7px 7px;border-radius:11px;border:1px solid color-mix(in srgb,var(--border,rgba(148,163,184,.26)) 88%,transparent);background:color-mix(in srgb,var(--primary,#3186ff) 4%,var(--secondary,rgba(148,163,184,.12)));box-shadow:inset 0 1px 2px rgba(15,23,42,.08);}
.ag-sg-vh{width:100%;display:flex;align-items:baseline;justify-content:space-between;gap:4px;padding:0 1px;}
.ag-sg-vh span{font-size:9px;font-weight:600;letter-spacing:.05em;color:var(--muted-foreground,#64748b);}
.ag-sg-vh strong{font-size:11.5px;font-weight:700;font-variant-numeric:tabular-nums;color:var(--foreground,#0f172a);}
.ag-sg-vh strong[data-tone="warn"]{color:var(--warning,#d97706);}
.ag-sg-vh strong[data-tone="danger"]{color:var(--error,#dc2626);}
.ag-sg-vt{position:relative;width:44px;height:90px;border-radius:10px 10px 16px 16px;overflow:hidden;border:1px solid color-mix(in srgb,var(--border,rgba(148,163,184,.36)) 90%,rgba(255,255,255,.2));background:linear-gradient(180deg,color-mix(in srgb,var(--secondary,rgba(148,163,184,.14)) 55%,transparent),color-mix(in srgb,var(--secondary,rgba(148,163,184,.24)) 85%,transparent));box-shadow:inset 2.5px 0 5px rgba(255,255,255,.24),inset -2.5px 0 5px rgba(15,23,42,.12),0 3px 10px -4px rgba(15,23,42,.18);}
.ag-sg-vt::before{content:"";position:absolute;top:5px;bottom:9px;left:4.5px;width:3px;border-radius:999px;background:linear-gradient(180deg,rgba(255,255,255,.55),rgba(255,255,255,.06) 72%);z-index:4;pointer-events:none;}
.ag-sg-vt::after{content:"";position:absolute;top:24%;bottom:24%;right:4px;width:5px;background:repeating-linear-gradient(180deg,color-mix(in srgb,var(--muted-foreground,#64748b) 42%,transparent) 0 1px,transparent 1px 16px);z-index:4;pointer-events:none;}
.ag-sg-vf{position:absolute;left:0;right:0;bottom:0;min-height:10%;background:linear-gradient(180deg,#5cc6fc,#3186ff 55%,#1d4ed8);border-top:2px solid rgba(255,255,255,.82);box-shadow:0 -3px 12px color-mix(in srgb,#3186ff 46%,transparent);transition:height .3s ease;overflow:hidden;}
.ag-sg-vf[data-tone="warm"]{background:linear-gradient(180deg,#5cc6fc,#3186ff);}
.ag-sg-vf[data-tone="warn"]{background:linear-gradient(180deg,#fbbf24,#d97706);box-shadow:0 -3px 12px rgba(245,158,11,.46);}
.ag-sg-vf[data-tone="danger"]{background:linear-gradient(180deg,#fb7185,#dc2626);box-shadow:0 -3px 12px rgba(239,68,68,.52);}
.ag-sg-vf::after{content:"";position:absolute;inset:0;background:linear-gradient(125deg,transparent 16%,rgba(255,255,255,.36) 48%,transparent 82%);transform:translateY(100%);animation:ag-sg-vg 2.8s ease-in-out infinite;pointer-events:none;}
@keyframes ag-sg-vg{0%{transform:translateY(100%)}60%,100%{transform:translateY(-120%)}}
.ag-sg-vth{position:absolute;left:2px;right:2px;height:1.5px;background:rgba(251,191,36,.95);box-shadow:0 0 6px rgba(245,158,11,.72);z-index:3;pointer-events:none;}
.ag-sag-qsec{display:flex;flex-direction:column;justify-content:center;gap:6px;min-width:0;padding:0;}
.ag-sag-qrow{display:grid;grid-template-columns:46px 1fr auto;align-items:center;gap:6px;}
@media (prefers-reduced-motion:reduce){.ag-sg-vf::after{animation:none!important;display:none!important;}}
.ag-sag-qhead{display:flex;align-items:center;justify-content:space-between;gap:5px;flex-wrap:wrap;}
.ag-sag-qtitle{display:inline-flex;align-items:center;gap:5px;min-width:0;font-size:12px;font-weight:600;color:var(--foreground,#0f172a);white-space:nowrap;}
.ag-sag-qpace{display:inline-flex;align-items:center;gap:4px;padding:1px 6px;border-radius:999px;font-size:10px;font-weight:600;background:rgba(16,185,129,.12);color:#059669;white-space:nowrap;flex-shrink:0;}
.ag-sag-qpace::before{content:"";width:5px;height:5px;border-radius:999px;background:currentColor;box-shadow:0 0 6px currentColor;}
.ag-sag-qpace[data-tone="warn"]{background:rgba(245,158,11,.14);color:#d97706;}
.ag-sag-qpace[data-tone="danger"]{background:rgba(239,68,68,.14);color:#dc2626;}
.ag-sag-qtabs{display:inline-flex;align-items:center;gap:2px;}
.ag-sag-qtab{appearance:none;border:1px solid transparent;background:transparent;color:var(--muted-foreground,#64748b);border-radius:6px;padding:2px 5px;font-size:10px;font-weight:500;white-space:nowrap;cursor:pointer;}
.ag-sag-qtab[aria-pressed="true"]{border-color:var(--border,rgba(148,163,184,.3));background:color-mix(in srgb,var(--secondary,rgba(148,163,184,.16)) 85%,transparent);color:var(--foreground,#0f172a);}
.ag-sag-qrows{display:flex;flex-direction:column;gap:6px;}
.ag-sag-qlbl{font-size:11px;color:var(--muted-foreground,#64748b);white-space:nowrap;}
.ag-sag-qval{font-size:11px;font-weight:500;color:var(--foreground,#0f172a);font-variant-numeric:tabular-nums;white-space:nowrap;text-align:right;}
.ag-sag-qnote{font-size:11px;color:var(--muted-foreground,#64748b);line-height:1.4;}
.ag-sag-meter{display:flex;flex-direction:column;gap:5px;}
.ag-sag-meter-head{display:flex;align-items:baseline;justify-content:space-between;gap:10px;}
.ag-sag-meter-label{font-size:12px;font-weight:500;color:var(--foreground,#0f172a);white-space:nowrap;flex-shrink:0;}
.ag-sag-meter-val{display:inline-flex;align-items:baseline;gap:10px;font-variant-numeric:tabular-nums;min-width:0;}
.ag-sag-meter-sub{font-size:11px;color:var(--muted-foreground,#64748b);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.ag-sag-meter-pct{font-size:12.5px;font-weight:600;color:var(--foreground,#0f172a);white-space:nowrap;flex-shrink:0;}
.ag-sag-meter-pct[data-tone="warn"]{color:var(--warning,#d97706);}
.ag-sag-meter-pct[data-tone="danger"]{color:var(--error,#ef4444);}
.ag-sag-meter-track{position:relative;height:8px;margin-top:0;background:color-mix(in srgb,var(--secondary,rgba(148,163,184,.2)) 85%,transparent);box-shadow:inset 0 1px 2px rgba(15,23,42,.12);}
.ag-sag-meter-th{position:absolute;top:-1px;bottom:-1px;width:1.5px;background:color-mix(in srgb,var(--warning,#f59e0b) 88%,var(--foreground,#fff));box-shadow:0 0 4px color-mix(in srgb,var(--warning,#f59e0b) 45%,transparent);z-index:2;pointer-events:none;}
.ag-sag-quota-bar-fill.ag-sag-meter-subsegs{display:flex;background:transparent;}
.ag-sag-meter-seg{height:100%;display:block;box-shadow:inset 0 1px 0 rgba(255,255,255,.35);}
.ag-sag-meter-seg[data-kind="user"]{background:linear-gradient(90deg,#1d4ed8,#3186ff,#60a5fa);}
.ag-sag-meter-seg[data-kind="assistant"]{background:linear-gradient(90deg,#059669,#10b981,#34d399);}
.ag-sag-meter-seg[data-kind="code"]{background:linear-gradient(90deg,#d97706,#f59e0b,#fbbf24);}
.ag-sag-card-chips{display:flex;flex-wrap:wrap;gap:6px;padding:0 14px 10px;}
.ag-sag-card-chip{display:inline-flex;align-items:center;height:20px;padding:0 7px;border-radius:999px;background:color-mix(in srgb,var(--secondary,rgba(148,163,184,.14)) 75%,transparent);color:var(--muted-foreground,#64748b);font-size:11px;font-variant-numeric:tabular-nums;border:0;}
.ag-sag-card-chip-btn{cursor:pointer;color:var(--warning,#d97706);}
.ag-sag-card-details{border-top:1px solid var(--border,rgba(148,163,184,.18));}
.ag-sag-card-details-sum{list-style:none;display:flex;align-items:center;justify-content:space-between;cursor:pointer;padding:7px 14px;font-size:11px;color:var(--muted-foreground,#64748b);user-select:none;}
.ag-sag-card-details-sum::after{content:"▸";font-size:10px;opacity:.65;}
.ag-sag-card-details[open] .ag-sag-card-details-sum::after{content:"▾";}
.ag-sag-card-details-sum:hover{color:var(--foreground,#0f172a);}
.ag-sag-card-details-body{display:flex;flex-direction:column;gap:6px;padding:0 14px 10px;}
.ag-sag-telemetry-row{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:11px;color:var(--muted-foreground,#64748b);font-variant-numeric:tabular-nums;}
.ag-sg-card-foot{display:flex;flex-wrap:wrap;align-items:center;justify-content:flex-start;gap:6px;padding:9px 14px 11px;border-top:1px solid var(--border,rgba(148,163,184,.2));}
.ag-sg-card-foot .ag-sg-btn{flex:0 0 auto;padding:4px 9px;font-size:11.5px;line-height:1.3;}
.ag-sg-card-foot [data-ag-sg-card-act="open-settings"]{margin-left:auto;}
.ag-sg-set-section{margin-top:12px;display:flex;flex-direction:column;gap:6px;}
.ag-sg-set-subhead{display:flex;align-items:center;justify-content:space-between;gap:8px;}
.ag-sg-set-row-inner{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:10px 0;}
.ag-sg-set-text{display:flex;flex-direction:column;gap:2px;min-width:160px;}
.ag-sg-set-row-title{font-size:12.5px;font-weight:500;color:var(--foreground,#0f172a);}
.ag-sg-set-row-desc{font-size:11px;line-height:1.4;color:var(--muted-foreground,#64748b);}
.ag-sg-mod-guide{display:flex;flex-direction:column;gap:4px;margin-top:8px;padding:8px 10px;border-radius:8px;background:color-mix(in srgb,var(--secondary,rgba(148,163,184,.12)) 58%,transparent);border:1px solid color-mix(in srgb,var(--border,rgba(148,163,184,.2)) 65%,transparent);}
.ag-sg-mod-guide-item{display:flex;align-items:baseline;gap:6px;font-size:11px;line-height:1.45;color:var(--muted-foreground,#64748b);}
.ag-sg-mod-guide-dot{width:5px;height:5px;border-radius:999px;flex:0 0 auto;align-self:center;background:color-mix(in srgb,var(--muted-foreground,#94a3b8) 45%,transparent);}
.ag-sg-mod-guide-item[data-active="1"] .ag-sg-mod-guide-dot{background:var(--primary,#3186ff);}
.ag-sg-mod-guide-name{flex:0 0 auto;font-weight:600;color:var(--foreground,#0f172a);opacity:.72;}
.ag-sg-mod-guide-item[data-active="1"] .ag-sg-mod-guide-name{opacity:1;}
.ag-sg-mod-guide-desc{min-width:0;}
.ag-sg-set-input{margin:0 0 8px 0;box-sizing:border-box;}
.ag-sg-native-section{margin-top:18px;display:flex;flex-direction:column;gap:8px;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei UI",sans-serif;}
.ag-sg-native-heading{margin:0;font-size:13px;font-weight:600;color:var(--foreground,#0f172a);}
.ag-sg-native-card{border-radius:12px;border:1px solid var(--border,rgba(148,163,184,.24));background:var(--card,transparent);padding:0 14px;}
.ag-sg-native-card .ag-sg-set-row + .ag-sg-set-row{border-top:1px solid var(--border,rgba(148,163,184,.18));}
.ag-sg-popover{position:absolute;right:0;bottom:calc(100% + 8px);width:min(340px,calc(100vw - 24px));max-height:min(74vh,520px);overflow:auto;padding:12px 13px;border-radius:12px;border:1px solid var(--border,rgba(148,163,184,.26));background:var(--card,#141720);color:var(--foreground,#eef1f7);box-shadow:0 16px 38px rgba(0,0,0,.38);z-index:40;}
.ag-sg-popover[hidden]{display:none!important;}
.ag-sg-pop-title{display:flex;align-items:center;justify-content:space-between;font-size:12px;font-weight:600;margin:0 0 8px 0;}
.ag-sg-pop-row{margin-bottom:9px;}
.ag-sg-pop-lbl{display:block;font-size:11px;color:var(--muted-foreground,#94a3b8);margin-bottom:5px;}
.ag-sg-pop-input{width:100%;margin-top:6px;padding:5px 8px;border-radius:7px;border:1px solid var(--border,rgba(148,163,184,.28));background:var(--background,#0b0d13);color:var(--foreground,#eef1f7);font:11.5px/1.35 Inter,system-ui,-apple-system,sans-serif;outline:none;}
.ag-sg-pop-input:focus{border-color:color-mix(in srgb,var(--primary,#3186ff) 65%,transparent);}
.ag-sg-seg{display:flex;flex-wrap:wrap;gap:4px;}
.ag-sg-seg button{appearance:none;border:1px solid var(--border,rgba(148,163,184,.24));background:transparent;color:var(--foreground,#eef1f7);border-radius:7px;padding:3px 7px;font:500 11px/1.3 Inter,system-ui,-apple-system,"Segoe UI",sans-serif;cursor:pointer;}
.ag-sg-seg button[aria-pressed="true"]{background:color-mix(in srgb,var(--primary,#3186ff) 18%,transparent);border-color:color-mix(in srgb,var(--primary,#3186ff) 60%,transparent);color:var(--primary,#3186ff);font-weight:600;}
.ag-sg-pop-hint{margin:4px 0 0 0;font-size:10.5px;line-height:1.45;color:var(--muted-foreground,#94a3b8);}
.ag-sg-bm-star{position:relative;appearance:none;flex:0 0 auto;align-self:center;display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;padding:4px;margin:0;border-radius:6px;border:0;background:transparent;color:var(--muted-foreground,#64748b);font-size:13px;line-height:1;cursor:pointer;pointer-events:auto;transition:color 120ms ease,background 120ms ease,opacity 120ms ease;}
.ag-sg-bm-star svg{display:block;width:16px;height:16px;flex:0 0 auto;}
.ag-sg-bm-star:hover{color:var(--secondary-foreground,var(--foreground,#0f172a));}
.ag-sg-bm-star[data-starred="1"]{color:var(--warning,#f59e0b);}
.ag-sg-bm-star[data-starred="1"]:hover{color:var(--warning,#d97706);background:color-mix(in srgb,var(--warning,#f59e0b) 10%,transparent);}
.ag-sg-bm-star[data-tip]:hover::after{content:attr(data-tip);position:absolute;right:0;top:calc(100% + 6px);padding:4px 8px;border-radius:6px;background:var(--popover,var(--foreground,#0f172a));color:var(--popover-foreground,var(--background,#f8fafc));border:1px solid var(--border,rgba(148,163,184,.22));box-shadow:0 6px 18px -4px rgba(15,23,42,.22);font:500 11px/1.3 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei UI",sans-serif;white-space:nowrap;pointer-events:none;z-index:55;}
.ag-sg-bm-dock{position:sticky;top:6px;height:0;overflow:visible;display:flex;justify-content:flex-end;pointer-events:none;z-index:26;}
.ag-sg-bm-dock[hidden]{display:none!important;}
.ag-sg-bm-dock-inner{position:relative;pointer-events:auto;display:inline-flex;flex-direction:column;align-items:flex-end;}
.ag-sg-bm-chip{appearance:none;display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:999px;border:1px solid color-mix(in srgb,var(--warning,#f59e0b) 50%,var(--border,rgba(148,163,184,.28)));background:color-mix(in srgb,var(--card,#141720) 92%,var(--warning,#f59e0b) 8%);color:var(--warning,#f59e0b);font:600 11px/1.3 Inter,system-ui,-apple-system,sans-serif;font-variant-numeric:tabular-nums;cursor:pointer;box-shadow:0 6px 18px -6px rgba(0,0,0,.35);transition:transform 120ms ease,border-color 120ms ease,background 120ms ease;}
.ag-sg-bm-chip:hover{transform:translateY(-1px);border-color:color-mix(in srgb,var(--warning,#f59e0b) 72%,var(--border,rgba(148,163,184,.3)));}
.ag-sg-bm-drawer{position:absolute;top:28px;right:0;width:min(336px,calc(100vw - 28px));max-height:340px;display:flex;flex-direction:column;gap:6px;padding:10px;border-radius:12px;border:1px solid var(--border,rgba(148,163,184,.28));background:var(--card,#141720);color:var(--foreground,#eef1f7);box-shadow:0 16px 38px rgba(0,0,0,.42);font:12px/1.4 Inter,system-ui,-apple-system,sans-serif;z-index:35;}
.ag-sg-bm-drawer[hidden]{display:none!important;}
.ag-sg-bm-drawer-head{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:11.5px;font-weight:600;padding-bottom:4px;border-bottom:1px solid var(--border,rgba(148,163,184,.2));}
.ag-sg-bm-list{display:flex;flex-direction:column;gap:4px;overflow:auto;max-height:210px;}
.ag-sg-bm-item{display:flex;align-items:center;gap:6px;padding:5px 7px;border-radius:8px;border:1px solid var(--border,rgba(148,163,184,.18));background:color-mix(in srgb,var(--secondary,rgba(148,163,184,.12)) 65%,transparent);color:var(--foreground,#eef1f7);cursor:pointer;text-align:left;font:11.5px/1.35 Inter,system-ui,-apple-system,sans-serif;transition:border-color 120ms ease,background 120ms ease;}
.ag-sg-bm-item:hover{border-color:color-mix(in srgb,var(--warning,#f59e0b) 55%,transparent);background:color-mix(in srgb,var(--warning,#f59e0b) 10%,transparent);}
.ag-sg-bm-num{flex:0 0 auto;font-weight:600;font-variant-numeric:tabular-nums;color:var(--warning,#f59e0b);}
.ag-sg-bm-snippet{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.ag-sg-bm-unstar{appearance:none;border:0;background:transparent;color:var(--muted-foreground,#94a3b8);cursor:pointer;padding:0 4px;font-size:12px;line-height:1;}
.ag-sg-bm-unstar:hover{color:var(--error,#ef4444);}
.ag-sg-bm-foot{display:flex;align-items:center;justify-content:flex-end;gap:6px;padding-top:6px;border-top:1px solid var(--border,rgba(148,163,184,.2));}
[data-ag-sg-pulse="1"]{outline:2px solid color-mix(in srgb,var(--warning,#f59e0b) 80%,transparent)!important;outline-offset:2px!important;transition:outline-color 220ms ease!important;}
.ag-sg-vault-overlay{position:fixed;inset:0;background:rgba(2,6,23,.58);display:flex;align-items:center;justify-content:center;padding:18px;z-index:90;}
.ag-sg-vault-overlay[hidden]{display:none!important;}
.ag-sg-vault-modal{width:min(640px,100%);max-height:min(78vh,620px);display:flex;flex-direction:column;gap:10px;padding:14px 16px;border-radius:14px;border:1px solid var(--border,rgba(148,163,184,.28));background:var(--card,#141720);color:var(--foreground,#eef1f7);box-shadow:0 24px 60px rgba(0,0,0,.5);font:12px/1.45 Inter,system-ui,-apple-system,sans-serif;}
.ag-sg-vault-head{display:flex;align-items:center;justify-content:space-between;gap:8px;}
.ag-sg-vault-title{font-size:13.5px;font-weight:600;}
.ag-sg-vault-stats{font-size:11px;color:var(--muted-foreground,#94a3b8);}
.ag-sg-vault-search{width:100%;padding:7px 10px;border-radius:9px;border:1px solid var(--border,rgba(148,163,184,.28));background:var(--background,#0b0d13);color:var(--foreground,#eef1f7);font:12px/1.4 Inter,system-ui,-apple-system,sans-serif;outline:none;}
.ag-sg-vault-search:focus{border-color:color-mix(in srgb,var(--primary,#3186ff) 65%,transparent);}
.ag-sg-vault-body{flex:1 1 auto;overflow:auto;display:flex;flex-direction:column;gap:8px;min-height:120px;}
.ag-sg-vault-empty{padding:28px 12px;text-align:center;color:var(--muted-foreground,#94a3b8);font-size:12px;}
.ag-sg-vault-card{border:1px solid var(--border,rgba(148,163,184,.22));border-radius:10px;padding:9px 11px;background:color-mix(in srgb,var(--secondary,rgba(148,163,184,.1)) 55%,transparent);display:flex;flex-direction:column;gap:6px;}
.ag-sg-vault-card-head{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:11.5px;font-weight:600;}
.ag-sg-vault-cid{font-family:ui-monospace,SFMono-Regular,monospace;font-size:10.5px;color:var(--muted-foreground,#94a3b8);font-weight:400;}
.ag-sg-vault-turn{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;padding:5px 7px;border-radius:7px;background:var(--card,#141720);border:1px solid var(--border,rgba(148,163,184,.16));font-size:11.5px;}
.ag-sg-vault-turn-text{flex:1 1 auto;min-width:0;word-break:break-word;}
.ag-sg-vault-reply{margin-top:3px;font-size:11px;color:var(--muted-foreground,#94a3b8);}
.ag-sg-vault-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;padding-top:8px;border-top:1px solid var(--border,rgba(148,163,184,.2));}
.ag-sg-outline-bm-filter{margin-left:auto;font-size:10.5px;padding:2px 6px;}
.ag-sg-outline-bm-filter[aria-pressed="true"]{border-color:color-mix(in srgb,var(--warning,#f59e0b) 55%,transparent);color:var(--warning,#f59e0b);}
.ag-sg-outline-star{margin-left:auto;padding:0 4px;color:var(--muted-foreground,#94a3b8);cursor:pointer;}
.ag-sg-outline-star[data-starred="1"]{color:var(--warning,#f59e0b);}
.ag-sg-radar-bar{display:flex;align-items:center;gap:4px;padding:6px 8px;margin:0 0 6px 0;border-bottom:1px solid var(--border,rgba(148,163,184,.2));}
.ag-sg-radar-pill{appearance:none;flex:1 1 auto;border:1px solid var(--border,rgba(148,163,184,.22));background:transparent;color:var(--muted-foreground,#94a3b8);border-radius:999px;padding:3px 7px;font:500 11px/1.25 Inter,system-ui,-apple-system,sans-serif;font-variant-numeric:tabular-nums;cursor:pointer;white-space:nowrap;transition:background 130ms ease,border-color 130ms ease,color 130ms ease;}
.ag-sg-radar-pill[aria-pressed="true"]{background:color-mix(in srgb,var(--primary,#3186ff) 16%,transparent);border-color:color-mix(in srgb,var(--primary,#3186ff) 52%,transparent);color:var(--foreground,#eef1f7);font-weight:600;}
.ag-sg-radar-pill[data-has-alert="1"]{border-color:color-mix(in srgb,var(--warning,#f59e0b) 58%,transparent);color:var(--warning,#f59e0b);}
[data-ag-sg-radar-hidden="1"],[data-ag-sg-outline-hidden="1"]{display:none!important;}
@keyframes ag-sag-pulse{0%,100%{opacity:1;transform:scale(1);}
50%{opacity:.55;transform:scale(.88);}}
.ag-sag-suite-panel,.ag-sag-drawer,.ag-sg-pill-wrap,.ag-sag-pl-modal,.ag-sag-rnav-rail,.ag-sag-code-bar{--sag-accent:var(--sag-theme-accent,var(--primary,#38bdf8));--sag-success:#34d399;--sag-warning:#fbbf24;--sag-danger:#f87171;--sag-radius-card:12px;--sag-radius-item:9px;--sag-radius-btn:8px;--sag-radius-tab:7px;--sag-radius-badge:6px;--sag-radius-pill:999px;}
html:is([data-theme="light"],[data-ag-sag-theme-resolved="warm-paper"],[data-ag-cs-theme="crystal"]) :is(.ag-sag-suite-panel,.ag-sag-drawer,.ag-sg-pill-wrap,.ag-sag-pl-modal,.ag-sag-rnav-rail,.ag-sag-code-bar){--sag-accent:var(--sag-theme-accent,var(--primary,#0284c7));--sag-success:#059669;--sag-warning:#d97706;--sag-danger:#dc2626;}
.ag-sag-suite-panel{margin-top:12px;border-radius:var(--sag-radius-card,12px);border:1px solid var(--border,rgba(148,163,184,.24));background:color-mix(in srgb,var(--foreground,#eef1f7) 4%,var(--card,transparent));box-shadow:0 6px 22px -12px rgba(15,23,42,.22);overflow:hidden;display:flex;flex-direction:column;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei UI",sans-serif;}
.ag-sag-fold-head{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;width:100%;padding:10px 13px;border:0;border-bottom:1px solid color-mix(in srgb,var(--border,rgba(148,163,184,.22)) 75%,transparent);background:linear-gradient(135deg,color-mix(in srgb,var(--primary,#3186ff) 9%,var(--card,transparent)),color-mix(in srgb,var(--foreground,#eef1f7) 4%,var(--card,transparent)));color:var(--foreground,#eef1f7);cursor:pointer;text-align:left;transition:background 150ms ease;}
.ag-sag-fold-head:hover{background:linear-gradient(135deg,color-mix(in srgb,var(--primary,#3186ff) 13%,var(--card,transparent)),color-mix(in srgb,var(--foreground,#eef1f7) 6%,var(--card,transparent)));}
.ag-sag-fold-head[aria-expanded="false"]{border-bottom-color:transparent;}
.ag-sag-fold-left{display:flex;align-items:center;gap:7px;flex-wrap:wrap;min-width:0;}
.ag-sag-fold-right{display:flex;align-items:center;gap:7px;flex:0 0 auto;}
.ag-sag-brand-badge{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-weight:700;letter-spacing:-.015em;color:var(--foreground,#eef1f7);}
.ag-sag-live-dot{width:7px;height:7px;border-radius:999px;background:var(--success,#10b981);box-shadow:0 0 0 3px color-mix(in srgb,var(--success,#10b981) 20%,transparent);animation:ag-sag-pulse 2.6s ease-in-out infinite;flex:0 0 auto;}
.ag-sag-meta-pill{display:inline-flex;align-items:center;padding:2px 7px;border-radius:999px;border:1px solid color-mix(in srgb,var(--border,rgba(148,163,184,.26)) 85%,transparent);background:color-mix(in srgb,var(--foreground,#eef1f7) 5%,var(--card,transparent));color:var(--muted-foreground,#94a3b8);font-size:10.5px;font-weight:600;font-variant-numeric:tabular-nums;line-height:1.3;white-space:nowrap;}
.ag-sag-dual-pill{appearance:none;display:inline-flex;align-items:center;gap:5px;padding:2px 9px;border-radius:999px;border:1px solid color-mix(in srgb,var(--primary,#3186ff) 48%,transparent);background:linear-gradient(135deg,color-mix(in srgb,var(--primary,#3186ff) 20%,var(--card,transparent)),color-mix(in srgb,var(--success,#10b981) 16%,var(--card,transparent)));color:var(--primary,#3186ff);font:700 10.5px/1.35 Inter,system-ui,-apple-system,sans-serif;letter-spacing:.01em;cursor:pointer;white-space:nowrap;transition:filter 130ms ease,transform 130ms ease;}
.ag-sag-dual-pill:hover{filter:brightness(1.08);transform:translateY(-0.5px);}
.ag-sag-dual-dot{width:6px;height:6px;border-radius:999px;background:var(--primary,#3186ff);box-shadow:0 0 0 2px color-mix(in srgb,var(--primary,#3186ff) 28%,transparent);animation:ag-sag-pulse 2.2s ease-in-out infinite;}
.ag-sag-fold-chevron{font-size:10.5px;color:var(--muted-foreground,#94a3b8);padding:0 2px;user-select:none;}
.ag-sag-fold-body{padding:11px 13px 13px;display:flex;flex-direction:column;gap:10px;}
.ag-sag-fold-body[hidden]{display:none!important;}
.ag-sag-topdeck{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;padding:8px 10px;border-radius:10px;border:1px solid color-mix(in srgb,var(--border,rgba(148,163,184,.22)) 78%,transparent);background:color-mix(in srgb,var(--foreground,#eef1f7) 3%,var(--card,transparent));}
.ag-sag-subtabs{display:flex;align-items:center;gap:4px;flex-wrap:wrap;padding:3px;border-radius:10px;border:1px solid color-mix(in srgb,var(--border,rgba(148,163,184,.22)) 80%,transparent);background:color-mix(in srgb,var(--secondary,rgba(148,163,184,.12)) 60%,var(--card,transparent));}
.ag-sag-subtab{appearance:none;flex:1 1 auto;display:inline-flex;align-items:center;justify-content:center;gap:5px;border:1px solid transparent;background:transparent;color:var(--muted-foreground,#64748b);border-radius:7px;padding:5px 9px;font:500 11px/1.25 Inter,system-ui,-apple-system,sans-serif;cursor:pointer;white-space:nowrap;transition:background 140ms ease,color 140ms ease,border-color 140ms ease,box-shadow 140ms ease;}
.ag-sag-subtab:hover{color:var(--foreground,#0f172a);background:color-mix(in srgb,var(--foreground,#0f172a) 5%,transparent);}
.ag-sag-subtab[aria-pressed="true"]{background:color-mix(in srgb,var(--primary,#3186ff) 14%,var(--card,transparent));border-color:color-mix(in srgb,var(--primary,#3186ff) 46%,transparent);color:var(--foreground,#0f172a);font-weight:600;box-shadow:0 2px 6px -2px rgba(15,23,42,.18);}
.ag-sag-subtab-dot{width:6px;height:6px;border-radius:999px;background:var(--sag-success,#34d399);flex:0 0 auto;}
.ag-sag-search-wrap{display:flex;align-items:center;gap:5px;padding:6px 13px 0;}
.ag-sag-search-input{flex:1 1 auto;min-width:120px;padding:5px 9px;border-radius:var(--sag-radius-btn,8px);border:1px solid var(--border,rgba(148,163,184,.28));background:color-mix(in srgb,var(--background,#0f172a) 68%,var(--card,transparent));color:var(--foreground,#0f172a);font:500 11.5px/1.35 Inter,system-ui,-apple-system,sans-serif;box-sizing:border-box;}
.ag-sag-search-input:focus-visible{outline:2px solid var(--sag-accent,#38bdf8);outline-offset:1px;}
.ag-sag-switch{appearance:none;position:relative;width:40px;height:22px;padding:0;border-radius:999px;border:1px solid color-mix(in srgb,var(--border,rgba(148,163,184,.36)) 90%,transparent);background:color-mix(in srgb,var(--muted-foreground,#64748b) 28%,transparent);cursor:pointer;flex:0 0 auto;transition:background 150ms ease,border-color 150ms ease;}
.ag-sag-switch::after{content:'';position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:999px;background:#ffffff;box-shadow:0 1px 3px rgba(15,23,42,.28);transition:transform 150ms ease;}
.ag-sag-switch[aria-checked="true"]{background:var(--sag-accent,#38bdf8);border-color:var(--sag-accent,#38bdf8);}
.ag-sag-switch[aria-checked="true"]::after{transform:translateX(18px);}
.ag-sag-switch[data-risk="high"][aria-checked="true"]{background:var(--sag-warning,#fbbf24);border-color:var(--sag-warning,#fbbf24);}
.ag-sag-overview-group{display:flex;flex-direction:column;gap:6px;}
.ag-sag-group-title{font-size:10.5px;font-weight:700;letter-spacing:.03em;text-transform:uppercase;color:var(--muted-foreground,#94a3b8);padding:2px 2px 0;}
.ag-sag-mod-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:7px;}
.ag-sag-mod-card{display:flex;flex-direction:column;gap:6px;padding:8px 10px;border-radius:var(--sag-radius-item,9px);border:1px solid color-mix(in srgb,var(--border,rgba(148,163,184,.24)) 82%,transparent);background:color-mix(in srgb,var(--foreground,#eef1f7) 2%,var(--card,transparent));}
.ag-sag-mod-card[data-active="1"]{border-color:color-mix(in srgb,var(--sag-accent,#38bdf8) 42%,transparent);background:color-mix(in srgb,var(--sag-accent,#38bdf8) 6%,var(--card,transparent));}
.ag-sag-mod-card-head{display:flex;align-items:center;justify-content:space-between;gap:8px;}
.ag-sag-mod-card-title{font-size:11.5px;font-weight:600;color:var(--foreground,#eef1f7);}
.ag-sag-mod-card-desc{font-size:10.5px;line-height:1.4;color:var(--muted-foreground,#94a3b8);}
.ag-sag-mod-card-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;padding-top:2px;}
.ag-sag-mod-sub{display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;padding-top:5px;margin-top:2px;border-top:1px dashed color-mix(in srgb,var(--border,rgba(148,163,184,.24)) 70%,transparent);font-size:10.5px;color:var(--muted-foreground,#94a3b8);}
.ag-sag-link-btn{appearance:none;border:0;background:transparent;color:var(--sag-accent,#38bdf8);font:600 10.5px/1.3 Inter,system-ui,-apple-system,sans-serif;padding:2px 4px;border-radius:var(--sag-radius-badge,6px);cursor:pointer;}
.ag-sag-link-btn:hover{text-decoration:underline;}
.ag-sag-details{border-radius:var(--sag-radius-item,9px);border:1px solid color-mix(in srgb,var(--border,rgba(148,163,184,.22)) 78%,transparent);background:color-mix(in srgb,var(--foreground,#eef1f7) 2%,var(--card,transparent));padding:6px 9px;}
.ag-sag-details summary{cursor:pointer;font-size:11px;font-weight:600;color:var(--muted-foreground,#94a3b8);user-select:none;}
.ag-sag-details[open] summary{margin-bottom:8px;color:var(--foreground,#eef1f7);}
.ag-sag-details-body{display:flex;flex-direction:column;gap:7px;}
.ag-sag-drawer-backdrop{position:fixed;inset:0;background:rgba(8,12,22,.46);backdrop-filter:blur(4px);z-index:9998;display:flex;justify-content:flex-end;}
.ag-sag-drawer-backdrop[hidden]{display:none!important;}
.ag-sag-drawer{width:420px;max-width:96vw;height:100%;display:flex;flex-direction:column;background:var(--popover,var(--card,#111927));color:var(--foreground,#eef3fa);border-left:1px solid var(--border,rgba(148,163,184,.26));box-shadow:-12px 0 36px rgba(2,6,23,.45);font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei UI",sans-serif;}
.ag-sag-drawer-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:11px 14px;border-bottom:1px solid var(--border,rgba(148,163,184,.22));}
.ag-sag-drawer-body{flex:1 1 auto;overflow:auto;padding:10px 12px 16px;}
.ag-sag-drawer-body .ag-sag-suite-panel{margin-top:0;}
.ag-sag-hex-icon{width:15px;height:15px;flex:0 0 auto;display:inline-block;}
.ag-sag-pane{display:flex;flex-direction:column;gap:9px;}
.ag-sag-pane[hidden]{display:none!important;}
.ag-sag-suite-head{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;}
.ag-sag-suite-title{font-size:11.5px;font-weight:600;color:var(--foreground,#eef1f7);}
.ag-sag-suite-sub{font-size:10.5px;color:var(--muted-foreground,#94a3b8);}
.ag-sag-suite-row{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;padding:8px 10px;border-radius:10px;border:1px solid color-mix(in srgb,var(--border,rgba(148,163,184,.2)) 72%,transparent);background:color-mix(in srgb,var(--foreground,#eef1f7) 2.5%,var(--card,transparent));}
.ag-sag-suite-row-stack{flex-direction:column;align-items:stretch;}
.ag-sag-suite-label{display:flex;flex-direction:column;gap:2px;min-width:140px;flex:1 1 auto;}
.ag-sag-suite-label strong{font-size:11.5px;font-weight:600;color:var(--foreground,#eef1f7);}
.ag-sag-suite-label span{font-size:10.5px;line-height:1.4;color:var(--muted-foreground,#94a3b8);}
.ag-sag-select{appearance:none;border:1px solid var(--border,rgba(148,163,184,.28));background-color:var(--card,#ffffff);background-image:linear-gradient(45deg,transparent 50%,var(--muted-foreground,#64748b) 50%),linear-gradient(135deg,var(--muted-foreground,#64748b) 50%,transparent 50%);background-position:calc(100% - 14px) 50%,calc(100% - 9px) 50%;background-size:5px 5px,5px 5px;background-repeat:no-repeat;color:var(--foreground,#0f172a);border-radius:7px;padding:4px 24px 4px 9px;font:500 11.5px/1.3 Inter,system-ui,-apple-system,sans-serif;cursor:pointer;}
.ag-sag-ext-grid{display:flex;flex-wrap:wrap;gap:5px;align-items:center;}
.ag-sag-chip{appearance:none;border:1px solid var(--border,rgba(148,163,184,.26));background:color-mix(in srgb,var(--foreground,#0f172a) 2%,transparent);color:var(--muted-foreground,#64748b);border-radius:999px;padding:3px 9px;font:500 11px/1.3 Inter,system-ui,-apple-system,sans-serif;cursor:pointer;transition:background 120ms ease,border-color 120ms ease,color 120ms ease;}
.ag-sag-chip:hover{color:var(--foreground,#0f172a);border-color:color-mix(in srgb,var(--foreground,#0f172a) 28%,transparent);}
.ag-sag-chip[aria-pressed="true"]{background:color-mix(in srgb,var(--primary,#3186ff) 14%,var(--card,transparent));border-color:color-mix(in srgb,var(--primary,#3186ff) 56%,transparent);color:var(--primary,#2563eb);font-weight:600;}
.ag-sag-chip[data-risk="high"][aria-pressed="true"]{background:color-mix(in srgb,var(--warning,#f59e0b) 16%,transparent);border-color:color-mix(in srgb,var(--warning,#f59e0b) 55%,transparent);color:var(--warning,#f59e0b);}
.ag-sag-badge-note{font-size:10.5px;color:var(--muted-foreground,#94a3b8);font-variant-numeric:tabular-nums;}
.ag-sag-flow-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(195px,1fr));gap:6px;}
.ag-sag-flow-card{display:flex;flex-direction:column;gap:3px;padding:7px 9px;border-radius:8px;border:1px solid color-mix(in srgb,var(--border,rgba(148,163,184,.2)) 70%,transparent);background:color-mix(in srgb,var(--card,transparent) 75%,transparent);font-size:10.5px;color:var(--muted-foreground,#94a3b8);}
.ag-sag-flow-card strong{font-size:11px;color:var(--foreground,#eef1f7);}
.ag-sag-nov-banner{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;padding:9px 11px;border-radius:10px;border:1px solid color-mix(in srgb,var(--primary,#3186ff) 32%,var(--border,rgba(148,163,184,.24)));background:linear-gradient(135deg,color-mix(in srgb,var(--primary,#3186ff) 11%,var(--card,transparent)),color-mix(in srgb,var(--success,#10b981) 6%,var(--card,transparent)));}
.ag-sag-nov-meta{font-size:11px;color:var(--muted-foreground,#94a3b8);font-variant-numeric:tabular-nums;}
.ag-sag-nov-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(168px,1fr));gap:6px;width:100%;}
.ag-sag-nov-card{appearance:none;display:flex;flex-direction:column;align-items:flex-start;gap:4px;padding:8px 9px;border-radius:9px;border:1px solid color-mix(in srgb,var(--border,rgba(148,163,184,.24)) 82%,transparent);background:color-mix(in srgb,var(--foreground,#eef1f7) 2%,var(--card,transparent));color:var(--foreground,#eef1f7);text-align:left;cursor:pointer;transition:border-color 130ms ease,background 130ms ease,transform 120ms ease;}
.ag-sag-nov-card:hover{border-color:color-mix(in srgb,var(--primary,#3186ff) 48%,var(--border,rgba(148,163,184,.28)));transform:translateY(-1px);}
.ag-sag-nov-card[aria-pressed="true"]{border-color:color-mix(in srgb,var(--primary,#3186ff) 56%,transparent);background:color-mix(in srgb,var(--primary,#3186ff) 11%,var(--card,transparent));}
.ag-sag-nov-card[data-privacy="opt-in-network"][aria-pressed="true"]{border-color:color-mix(in srgb,var(--warning,#f59e0b) 58%,transparent);background:color-mix(in srgb,var(--warning,#f59e0b) 11%,var(--card,transparent));}
.ag-sag-nov-card-top{width:100%;display:flex;align-items:center;justify-content:space-between;gap:6px;}
.ag-sag-nov-card-name{font-size:11.5px;font-weight:600;color:var(--foreground,#eef1f7);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.ag-sag-nov-led{width:7px;height:7px;border-radius:999px;flex:0 0 auto;background:color-mix(in srgb,var(--muted-foreground,#94a3b8) 38%,transparent);}
.ag-sag-nov-card[aria-pressed="true"] .ag-sag-nov-led{background:var(--success,#10b981);box-shadow:0 0 0 2px color-mix(in srgb,var(--success,#10b981) 24%,transparent);}
.ag-sag-nov-card[data-privacy="opt-in-network"][aria-pressed="true"] .ag-sag-nov-led{background:var(--warning,#f59e0b);box-shadow:0 0 0 2px color-mix(in srgb,var(--warning,#f59e0b) 24%,transparent);}
.ag-sag-nov-card-tags{display:flex;align-items:center;gap:4px;flex-wrap:wrap;}
.ag-sag-nov-tag{display:inline-flex;align-items:center;padding:1px 5px;border-radius:999px;font-size:9.5px;font-weight:600;line-height:1.35;border:1px solid color-mix(in srgb,var(--border,rgba(148,163,184,.24)) 80%,transparent);color:var(--muted-foreground,#94a3b8);background:color-mix(in srgb,var(--secondary,rgba(148,163,184,.12)) 55%,transparent);}
.ag-sag-nov-tag[data-kind="network"]{border-color:color-mix(in srgb,var(--warning,#f59e0b) 50%,transparent);color:var(--warning,#f59e0b);background:color-mix(in srgb,var(--warning,#f59e0b) 12%,transparent);}
.ag-sag-synergy-box{display:flex;flex-direction:column;gap:6px;padding:9px 10px;border-radius:10px;border:1px solid color-mix(in srgb,var(--border,rgba(148,163,184,.22)) 78%,transparent);background:color-mix(in srgb,var(--foreground,#eef1f7) 2.5%,var(--card,transparent));}
.ag-sag-synergy-title{font-size:11.5px;font-weight:600;color:var(--foreground,#eef1f7);}
.ag-sag-synergy-list{display:flex;flex-direction:column;gap:6px;}
.ag-sag-synergy-item{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;padding:7px 9px;border-radius:8px;border:1px solid color-mix(in srgb,var(--border,rgba(148,163,184,.22)) 78%,transparent);border-left:3px solid var(--primary,#3186ff);background:color-mix(in srgb,var(--primary,#3186ff) 5%,var(--card,transparent));}
.ag-sag-synergy-item[data-status="active"]{border-left-color:var(--success,#10b981);background:color-mix(in srgb,var(--success,#10b981) 7%,var(--card,transparent));}
.ag-sag-synergy-item[data-status="recommend"],.ag-sag-synergy-item[data-status="warn"]{border-left-color:var(--warning,#f59e0b);background:color-mix(in srgb,var(--warning,#f59e0b) 8%,var(--card,transparent));}
.ag-sag-synergy-item[data-status="tip"]{border-left-color:var(--primary,#3186ff);background:color-mix(in srgb,var(--primary,#3186ff) 7%,var(--card,transparent));}
.ag-sag-synergy-item[data-status="connected"]{border-left-color:var(--primary,#3186ff);background:linear-gradient(90deg,color-mix(in srgb,var(--primary,#3186ff) 10%,var(--card,transparent)),color-mix(in srgb,var(--success,#10b981) 5%,var(--card,transparent)));}
.ag-sag-synergy-text{font-size:11px;line-height:1.4;color:var(--foreground,#eef1f7);flex:1 1 180px;}
.ag-sag-synergy-act{appearance:none;border:1px solid color-mix(in srgb,var(--primary,#3186ff) 52%,transparent);background:color-mix(in srgb,var(--primary,#3186ff) 16%,var(--card,transparent));color:var(--primary,#3186ff);border-radius:999px;padding:3px 10px;font:600 10.5px/1.35 Inter,system-ui,-apple-system,sans-serif;cursor:pointer;white-space:nowrap;transition:filter 120ms ease,background 120ms ease;}
.ag-sag-synergy-act:hover{filter:brightness(1.08);background:color-mix(in srgb,var(--primary,#3186ff) 24%,var(--card,transparent));}
.ag-sag-nov-promo{display:flex;flex-direction:column;gap:8px;padding:12px 13px;border-radius:11px;border:1px dashed color-mix(in srgb,var(--primary,#3186ff) 42%,var(--border,rgba(148,163,184,.28)));background:linear-gradient(135deg,color-mix(in srgb,var(--primary,#3186ff) 8%,var(--card,transparent)),color-mix(in srgb,var(--foreground,#eef1f7) 3%,var(--card,transparent)));}
.ag-sag-nov-promo-compact{margin-top:10px;padding:9px 11px;border-style:solid;border-color:color-mix(in srgb,var(--border,rgba(148,163,184,.26)) 90%,transparent);background:color-mix(in srgb,var(--secondary,rgba(148,163,184,.1)) 55%,transparent);gap:6px;}
.ag-sag-nov-promo-line{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;}
.ag-sag-nov-promo-title{font-size:12px;font-weight:700;color:var(--foreground,#eef1f7);}
.ag-sag-nov-promo-desc{font-size:11px;line-height:1.48;color:var(--muted-foreground,#94a3b8);}
.ag-sag-nov-cmd-row{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;padding:6px 9px;border-radius:8px;border:1px solid var(--border,rgba(148,163,184,.24));background:color-mix(in srgb,var(--background,#0b0d13) 72%,var(--card,transparent));}
.ag-sag-nov-cmd-code{font:11px/1.35 ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--foreground,#0f172a);word-break:break-all;}
.ag-sag-pack-ctrl{display:flex;flex-direction:column;gap:7px;width:100%;}
.ag-sag-pack-editor{display:flex;flex-direction:column;gap:6px;}
.ag-sag-pack-editor[hidden]{display:none!important;}
.ag-sag-pack-textarea{width:100%;min-height:88px;padding:7px 9px;border-radius:8px;border:1px solid var(--border,rgba(148,163,184,.28));background:color-mix(in srgb,var(--background,#f8fafc) 75%,var(--card,transparent));color:var(--foreground,#0f172a);font:11px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace;resize:vertical;box-sizing:border-box;}
.ag-sag-pack-textarea:focus-visible{outline:2px solid var(--primary,#3186ff);outline-offset:1px;}
.ag-sag-pack-actions{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;}
.ag-sag-pack-status{font-size:11px;line-height:1.4;color:var(--muted-foreground,#64748b);word-break:break-word;}
.ag-sag-pack-status[data-tone="ok"]{color:var(--success,#059669);}
.ag-sag-pack-status[data-tone="error"]{color:var(--error,#dc2626);}
.ag-sag-chip:disabled{opacity:.46;cursor:not-allowed;}
.ag-sg-btn:focus-visible,.ag-sg-status-pill:focus-visible,.ag-sg-seg button:focus-visible,.ag-sg-radar-pill:focus-visible,.ag-sg-bm-star:focus-visible,.ag-sg-bm-chip:focus-visible,.ag-sag-fold-head:focus-visible,.ag-sag-dual-pill:focus-visible,.ag-sag-subtab:focus-visible,.ag-sag-select:focus-visible,.ag-sag-chip:focus-visible,.ag-sag-nov-card:focus-visible,.ag-sag-synergy-act:focus-visible{outline:2px solid var(--primary,#3186ff);outline-offset:2px;}
.ag-sag-hud-segs{display:inline-flex;align-items:center;gap:6px;}
.ag-sag-hud-seg{display:inline-flex;align-items:center;gap:4px;font-variant-numeric:tabular-nums;}
.ag-sag-hud-seg + .ag-sag-hud-seg{padding-left:6px;border-left:1px solid var(--border,rgba(148,163,184,.26));}
.ag-sag-hud-seg[data-tone="ok"]{color:var(--sag-success,#34d399);}
.ag-sag-hud-seg[data-tone="warm"],.ag-sag-hud-seg[data-tone="accent"]{color:var(--sag-accent,#38bdf8);}
.ag-sag-hud-seg[data-tone="warn"]{color:var(--sag-warning,#fbbf24);}
.ag-sag-hud-seg[data-tone="danger"]{color:var(--sag-danger,#f87171);}
.ag-sag-hud-ring{width:12px;height:12px;border-radius:50%;flex:0 0 auto;background:conic-gradient(currentColor calc(var(--ag-sag-hud-p,0) * 1%),rgba(148,163,184,.28) 0);-webkit-mask:radial-gradient(circle,transparent 3.5px,#000 4px);mask:radial-gradient(circle,transparent 3.5px,#000 4px);}
.ag-sag-ctx-lens{display:flex;flex-direction:column;gap:5px;padding:7px 9px;border-radius:var(--sag-radius-item,9px);background:color-mix(in srgb,var(--secondary,rgba(148,163,184,.1)) 70%,transparent);border:1px solid var(--border,rgba(148,163,184,.2));}
.ag-sag-ctx-bar{display:flex;width:100%;height:6px;border-radius:999px;overflow:hidden;background:rgba(148,163,184,.2);}
.ag-sag-ctx-bar-seg{height:100%;display:block;}
.ag-sag-ctx-bar-seg[data-kind="user"]{background:var(--sag-accent,#38bdf8);}
.ag-sag-ctx-bar-seg[data-kind="assistant"]{background:var(--sag-success,#34d399);}
.ag-sag-ctx-bar-seg[data-kind="code"]{background:var(--sag-warning,#fbbf24);}
.ag-sag-ctx-legend{font-size:10.5px;color:var(--muted-foreground,#94a3b8);font-variant-numeric:tabular-nums;}
.ag-sag-ctx-top-turns{display:flex;flex-wrap:wrap;gap:4px;}
.ag-sag-ctx-turn-chip{appearance:none;border:1px solid var(--border,rgba(148,163,184,.26));background:transparent;color:var(--foreground,#eef1f7);border-radius:6px;padding:2px 6px;font-size:10.5px;font-variant-numeric:tabular-nums;cursor:pointer;}
.ag-sag-ctx-turn-chip:hover{border-color:var(--sag-accent,#38bdf8);color:var(--sag-accent,#38bdf8);}
.ag-sag-quota-bar{position:relative;width:100%;height:6px;border-radius:999px;background:color-mix(in srgb,var(--secondary,rgba(148,163,184,.22)) 85%,transparent);box-shadow:inset 0 1px 2px rgba(15,23,42,.12);overflow:hidden;margin-top:2px;}
.ag-sag-quota-bar-fill{position:relative;display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,#1d4ed8,#3186ff 62%,#5cc6fc);box-shadow:inset 0 1px 0 rgba(255,255,255,.35);transition:width 240ms cubic-bezier(.22,1,.36,1);overflow:hidden;}
.ag-sag-quota-bar-fill::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent 0%,rgba(255,255,255,.42) 50%,transparent 100%);transform:translateX(-100%);animation:ag-sag-flow-sheen 2.8s ease-in-out infinite;pointer-events:none;}
.ag-sag-quota-bar-fill[data-tone="warm"]{background:linear-gradient(90deg,#1d4ed8,#3186ff 62%,#5cc6fc);}
.ag-sag-quota-bar-fill[data-tone="warn"]{background:linear-gradient(90deg,#d97706,#f59e0b 65%,#fbbf24);}
.ag-sag-quota-bar-fill[data-tone="danger"]{background:linear-gradient(90deg,#dc2626,#ef4444 65%,#fb7185);}
@keyframes ag-sag-flow-sheen{0%{transform:translateX(-100%)}55%,100%{transform:translateX(120%)}}
@media (prefers-reduced-motion:reduce){.ag-sag-quota-bar-fill::after{animation:none!important;display:none!important;}}
.ag-sag-pl-trigger{appearance:none;display:inline-flex;align-items:center;gap:4px;height:24px;padding:0 8px;margin:0 4px;border-radius:8px;border:1px solid transparent;background:color-mix(in srgb,var(--secondary,rgba(148,163,184,.14)) 72%,transparent);color:var(--muted-foreground,#94a3b8);font:500 11.5px/1 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei UI",sans-serif;cursor:pointer;white-space:nowrap;transition:background 140ms ease,color 140ms ease,border-color 140ms ease;}
.ag-sag-pl-trigger:hover{background:color-mix(in srgb,var(--secondary,rgba(148,163,184,.22)) 100%,transparent);border-color:var(--border,rgba(148,163,184,.28));color:var(--foreground,#eef1f7);}
.ag-sag-pl-backdrop{position:fixed;inset:0;background:rgba(2,6,23,.56);backdrop-filter:blur(4px);display:flex;align-items:flex-start;justify-content:center;padding-top:min(10vh,76px);z-index:2147483000;}
.ag-sag-pl-backdrop[hidden]{display:none!important;}
.ag-sag-pl-modal{width:min(620px,calc(100vw - 28px));max-height:min(76vh,620px);display:flex;flex-direction:column;gap:10px;padding:14px 16px;border-radius:var(--sag-radius-card,12px);border:1px solid var(--border,rgba(148,163,184,.28));background:var(--popover,var(--card,#0f172a));color:var(--foreground,#eef1f7);box-shadow:0 24px 64px -12px rgba(2,6,23,.55);font:12.5px/1.45 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei UI",sans-serif;box-sizing:border-box;}
.ag-sag-pl-head,.ag-sag-pl-form-head{display:flex;align-items:center;justify-content:space-between;gap:8px;}
.ag-sag-pl-head-acts,.ag-sag-pl-tabs,.ag-sag-pl-form-foot{display:flex;align-items:center;gap:6px;flex-wrap:wrap;}
.ag-sag-pl-search .ag-sag-search-input,.ag-sag-pl-form .ag-sag-search-input{width:100%;box-sizing:border-box;}
.ag-sag-pl-form-foot{justify-content:flex-end;}
.ag-sag-pl-list{display:flex;flex-direction:column;gap:6px;overflow-y:auto;max-height:360px;padding-right:2px;}
.ag-sag-pl-item{display:flex;align-items:center;gap:8px;border-radius:var(--sag-radius-item,9px);border:1px solid var(--border,rgba(148,163,184,.2));background:color-mix(in srgb,var(--foreground,#eef1f7) 3%,transparent);padding:8px 10px;}
.ag-sag-pl-item[data-selected="1"]{border-color:var(--sag-accent,#38bdf8);background:color-mix(in srgb,var(--sag-accent,#38bdf8) 12%,transparent);}
.ag-sag-pl-item-main{flex:1 1 auto;min-width:0;appearance:none;border:0;background:transparent;color:inherit;text-align:left;padding:0;cursor:pointer;}
.ag-sag-pl-item-top{display:flex;align-items:center;gap:6px;flex-wrap:wrap;}
.ag-sag-pl-item-title{font-weight:600;font-size:12.5px;}
.ag-sag-pl-item-desc{font-size:11.5px;color:var(--muted-foreground,#94a3b8);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.ag-sag-pl-badge{display:inline-flex;align-items:center;height:18px;padding:0 6px;border-radius:var(--sag-radius-badge,6px);background:color-mix(in srgb,var(--secondary,rgba(148,163,184,.16)) 90%,transparent);color:var(--muted-foreground,#94a3b8);font-size:10.5px;font-weight:500;}
.ag-sag-pl-badge[data-source="nov"]{color:var(--sag-accent,#38bdf8);background:color-mix(in srgb,var(--sag-accent,#38bdf8) 14%,transparent);}
.ag-sag-pl-item-acts{display:flex;align-items:center;gap:4px;flex:0 0 auto;}
.ag-sag-pl-form{display:flex;flex-direction:column;gap:8px;}
.ag-sag-pl-field{display:flex;flex-direction:column;gap:4px;font-size:11.5px;color:var(--muted-foreground,#94a3b8);}
.ag-sag-pl-preview{margin:0;padding:9px 10px;border-radius:8px;border:1px solid var(--border,rgba(148,163,184,.22));background:color-mix(in srgb,var(--background,#020617) 65%,transparent);color:var(--foreground,#eef1f7);font:11.5px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap;max-height:160px;overflow-y:auto;}
.ag-sag-pl-foot{padding-top:4px;border-top:1px solid var(--border,rgba(148,163,184,.16));}
.ag-sag-code-bar{position:sticky;top:0;z-index:12;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:5px 10px;margin-bottom:-2px;border-radius:8px 8px 0 0;border:1px solid var(--border,rgba(148,163,184,.24));border-bottom:0;background:color-mix(in srgb,var(--card,#0f172a) 96%,var(--background,#0b0d13));color:var(--muted-foreground,#94a3b8);font:500 11px/1.2 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei UI",sans-serif;}
.ag-sag-code-meta{font-variant-numeric:tabular-nums;}
.ag-sag-code-acts{display:inline-flex;align-items:center;gap:6px;}
.ag-sag-code-btn{appearance:none;height:20px;padding:0 8px;border-radius:var(--sag-radius-badge,6px);border:1px solid var(--border,rgba(148,163,184,.26));background:color-mix(in srgb,var(--secondary,rgba(148,163,184,.16)) 85%,transparent);color:var(--foreground,#eef1f7);font:500 11px/18px inherit;cursor:pointer;}
.ag-sag-code-btn:hover{border-color:var(--sag-accent,#38bdf8);color:var(--sag-accent,#38bdf8);}
pre[data-ag-sag-code-folded="1"]{max-height:220px!important;overflow:hidden!important;position:relative;mask-image:linear-gradient(to bottom,#000 72%,transparent 100%);-webkit-mask-image:linear-gradient(to bottom,#000 72%,transparent 100%);}
.ag-sag-rnav-rail{position:fixed;right:12px;top:50%;transform:translateY(-50%);z-index:48;display:flex;flex-direction:column;align-items:center;gap:4px;padding:6px 4px;border-radius:var(--sag-radius-pill,999px);border:1px solid var(--border,rgba(148,163,184,.24));background:color-mix(in srgb,var(--popover,var(--card,#0f172a)) 84%,transparent);backdrop-filter:blur(8px);box-shadow:0 8px 24px -8px rgba(2,6,23,.4);}
.ag-sag-rnav-step{appearance:none;width:20px;height:20px;border:0;border-radius:999px;background:transparent;color:var(--muted-foreground,#94a3b8);font:600 11px/20px inherit;cursor:pointer;}
.ag-sag-rnav-step:hover{color:var(--sag-accent,#38bdf8);background:color-mix(in srgb,var(--sag-accent,#38bdf8) 14%,transparent);}
.ag-sag-rnav-dots{display:flex;flex-direction:column;align-items:center;gap:5px;padding:2px 0;max-height:220px;overflow-y:auto;}
.ag-sag-rnav-dot{appearance:none;width:7px;height:7px;padding:0;border:0;border-radius:999px;background:color-mix(in srgb,var(--muted-foreground,#94a3b8) 48%,transparent);cursor:pointer;transition:transform 120ms ease,background 120ms ease;}
.ag-sag-rnav-dot:hover,.ag-sag-rnav-dot[data-active="1"]{background:var(--sag-accent,#38bdf8);transform:scale(1.35);}
.ag-sag-rnav-dot[data-starred="1"]{background:var(--sag-warning,#fbbf24);}
pre[data-ag-sag-code-wrap="1"],pre[data-ag-sag-code-wrap="1"] code{white-space:pre-wrap!important;word-break:break-word!important;}
.ag-sag-rnav-outline{position:fixed;right:46px;top:50%;transform:translateY(-50%);width:290px;max-height:360px;z-index:50;display:flex;flex-direction:column;gap:6px;padding:8px;border-radius:var(--sag-radius-card,12px);border:1px solid var(--border,rgba(148,163,184,.28));background:color-mix(in srgb,var(--popover,var(--card,#0f172a)) 94%,transparent);backdrop-filter:blur(10px);box-shadow:0 14px 36px -10px rgba(2,6,23,.55);}
.ag-sag-rnav-outline-head{display:flex;align-items:center;gap:5px;}
.ag-sag-rnav-outline-list{display:flex;flex-direction:column;gap:3px;overflow-y:auto;max-height:280px;}
.ag-sag-rnav-outline-item{appearance:none;text-align:left;border:1px solid transparent;background:transparent;color:var(--foreground,#eef1f7);border-radius:7px;padding:5px 7px;font-size:11.5px;line-height:1.3;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.ag-sag-rnav-outline-item:hover,.ag-sag-rnav-outline-item[data-active="1"]{border-color:color-mix(in srgb,var(--sag-accent,#38bdf8) 45%,transparent);background:color-mix(in srgb,var(--sag-accent,#38bdf8) 12%,transparent);}
.ag-sag-mermaid-btn{margin-bottom:4px;}
.ag-sag-mermaid-modal{position:fixed;inset:0;z-index:90;display:flex;align-items:center;justify-content:center;background:rgba(2,6,23,.72);backdrop-filter:blur(4px);}
.ag-sag-mermaid-box{width:min(90vw,960px);max-height:86vh;display:flex;flex-direction:column;gap:8px;padding:12px;border-radius:var(--sag-radius-card,12px);border:1px solid var(--border,rgba(148,163,184,.32));background:var(--card,#0f172a);color:var(--foreground,#eef1f7);}
.ag-sag-mermaid-head{display:flex;align-items:center;justify-content:space-between;gap:8px;}
.ag-sag-mermaid-stage{flex:1;overflow:auto;padding:16px;border-radius:8px;background:color-mix(in srgb,var(--background,#020617) 72%,transparent);}
.ag-sag-mermaid-canvas{transform-origin:top left;transition:transform 120ms ease;}
.ag-sag-sel-pill{position:fixed;z-index:80;display:inline-flex;align-items:center;gap:4px;padding:4px 6px;border-radius:var(--sag-radius-pill,999px);border:1px solid var(--border,rgba(148,163,184,.3));background:color-mix(in srgb,var(--popover,var(--card,#0f172a)) 94%,transparent);box-shadow:0 8px 24px -8px rgba(2,6,23,.5);}
.ag-sag-ctx-menu{position:fixed;z-index:88;min-width:190px;display:flex;flex-direction:column;gap:2px;padding:5px;border-radius:var(--sag-radius-item,9px);border:1px solid var(--border,rgba(148,163,184,.3));background:color-mix(in srgb,var(--popover,var(--card,#0f172a)) 96%,transparent);box-shadow:0 14px 36px -10px rgba(2,6,23,.55);}
.ag-sag-ctx-item{appearance:none;text-align:left;border:0;background:transparent;color:var(--foreground,#eef1f7);border-radius:6px;padding:6px 9px;font-size:12px;cursor:pointer;}
.ag-sag-ctx-item:hover{background:color-mix(in srgb,var(--sag-accent,#38bdf8) 16%,transparent);color:var(--sag-accent,#38bdf8);}
.ag-sag-shortcuts-card{width:min(92vw,440px);display:flex;flex-direction:column;gap:10px;padding:14px 16px;border-radius:var(--sag-radius-card,12px);border:1px solid var(--border,rgba(148,163,184,.32));background:var(--card,#0f172a);color:var(--foreground,#eef1f7);}
.ag-sag-shortcuts-list{display:flex;flex-direction:column;gap:7px;}
.ag-sag-shortcuts-row{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:12px;}
.ag-sag-kbd{padding:2px 7px;border-radius:6px;border:1px solid var(--border,rgba(148,163,184,.3));background:color-mix(in srgb,var(--secondary,rgba(148,163,184,.16)) 90%,transparent);font:600 11px/1.3 var(--sag-font-mono,ui-monospace,monospace);white-space:nowrap;}
.ag-sag-settings-nav-item{appearance:none;width:100%;text-align:left;margin-top:6px;padding:7px 10px;border-radius:8px;border:1px solid color-mix(in srgb,var(--sag-accent,#38bdf8) 32%,transparent);background:color-mix(in srgb,var(--sag-accent,#38bdf8) 10%,transparent);color:var(--sag-accent,#38bdf8);font:600 12px/1.2 var(--sag-font-sans,Inter,sans-serif);cursor:pointer;}
.ag-sag-settings-nav-item:hover{background:color-mix(in srgb,var(--sag-accent,#38bdf8) 20%,transparent);}
.ag-sag-turn-rewind{appearance:none;display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;padding:0;border:0;border-radius:6px;background:transparent;color:var(--muted-foreground,#94a3b8);font:600 13px/1 inherit;cursor:pointer;}
.ag-sag-turn-rewind:hover{color:var(--sag-accent,#38bdf8);background:color-mix(in srgb,var(--sag-accent,#38bdf8) 12%,transparent);}
.ag-sag-theme-gallery{display:flex;flex-direction:column;gap:8px;width:100%;}
.ag-sag-theme-group-label{font:600 10.5px/1.2 var(--sag-font-sans,Inter,sans-serif);letter-spacing:.04em;text-transform:uppercase;color:var(--muted-foreground,#94a3b8);margin:2px 0 0 2px;}
.ag-sag-swatch-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(106px,1fr));gap:6px;width:100%;}
.ag-sag-swatch-card{appearance:none;display:flex;align-items:center;gap:6px;padding:6px 8px;border-radius:var(--sag-radius-btn,8px);border:1px solid var(--border,rgba(148,163,184,.24));background:color-mix(in srgb,var(--secondary,rgba(148,163,184,.12)) 78%,transparent);color:var(--foreground,#eef1f7);font:500 11.5px/1.2 var(--sag-font-sans,Inter,sans-serif);cursor:pointer;text-align:left;transition:border-color 130ms ease,background 130ms ease,transform 110ms ease;}
.ag-sag-swatch-card:hover{border-color:color-mix(in srgb,var(--sag-accent,#38bdf8) 55%,var(--border,rgba(148,163,184,.3)));background:color-mix(in srgb,var(--sag-accent,#38bdf8) 10%,var(--secondary,rgba(148,163,184,.14)));}
.ag-sag-swatch-card[aria-pressed="true"]{border-color:var(--sag-accent,#38bdf8);background:color-mix(in srgb,var(--sag-accent,#38bdf8) 16%,transparent);color:var(--foreground,#eef1f7);box-shadow:0 0 0 1px color-mix(in srgb,var(--sag-accent,#38bdf8) 38%,transparent);}
.ag-sag-swatch-dots{display:inline-flex;align-items:center;flex:0 0 auto;}
.ag-sag-swatch-dot{width:9px;height:9px;border-radius:999px;border:1px solid rgba(148,163,184,.45);display:inline-block;flex:0 0 auto;}
.ag-sag-swatch-dot + .ag-sag-swatch-dot{margin-left:-3px;}
.ag-sag-swatch-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.ag-sag-look-row{display:flex;flex-wrap:wrap;gap:6px;width:100%;}
.ag-sag-look-chip{appearance:none;display:inline-flex;align-items:center;gap:5px;padding:5px 9px;border-radius:999px;border:1px solid var(--border,rgba(148,163,184,.26));background:color-mix(in srgb,var(--secondary,rgba(148,163,184,.12)) 80%,transparent);color:var(--foreground,#eef1f7);font:500 11.5px/1.2 var(--sag-font-sans,Inter,sans-serif);cursor:pointer;transition:border-color 130ms ease,background 130ms ease;}
.ag-sag-look-chip:hover{border-color:var(--sag-accent,#38bdf8);background:color-mix(in srgb,var(--sag-accent,#38bdf8) 14%,transparent);}
.ag-sag-look-chip[aria-pressed="true"]{border-color:var(--sag-accent,#38bdf8);background:color-mix(in srgb,var(--sag-accent,#38bdf8) 20%,transparent);font-weight:600;}
.ag-sag-accent-dot{width:8px;height:8px;border-radius:999px;display:inline-block;margin-right:4px;vertical-align:middle;border:1px solid rgba(255,255,255,.35);}
.ag-sag-gallery-bar{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:2px;}
.ag-sag-pair-hint{font:500 11px/1.3 var(--sag-font-sans,Inter,sans-serif);color:var(--sag-accent,#38bdf8);padding:2px 8px;border-radius:999px;background:color-mix(in srgb,var(--sag-accent,#38bdf8) 12%,transparent);}
.ag-sag-subrow{display:flex;align-items:flex-start;gap:8px;width:100%;}
.ag-sag-subrow-label{flex:0 0 64px;padding-top:5px;font:600 11px/1.2 var(--sag-font-sans,Inter,sans-serif);color:var(--muted-foreground,#94a3b8);}
.ag-sag-ctx-toast{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:2147483050;padding:7px 13px;border-radius:999px;border:1px solid color-mix(in srgb,var(--warning,#f59e0b) 45%,var(--border,rgba(148,163,184,.28)));background:var(--popover,#181a20);color:var(--foreground,#eef1f7);font:500 12px/1.35 var(--sag-font-sans,Inter,sans-serif);box-shadow:0 10px 26px rgba(0,0,0,.38);pointer-events:none;}
.ag-sag-thought-bar{margin-left:6px;padding:1px 6px;border-radius:999px;border:1px solid color-mix(in srgb,var(--sag-accent,#38bdf8) 40%,var(--border,rgba(148,163,184,.28)));background:color-mix(in srgb,var(--sag-accent,#38bdf8) 10%,transparent);color:var(--sag-accent,#38bdf8);font:600 11px/1.3 var(--sag-font-sans,Inter,sans-serif);cursor:pointer;}
.ag-sag-thought-box{margin:8px 0 4px;padding:9px 11px;border-radius:var(--sag-radius-sm,8px);border:1px solid color-mix(in srgb,var(--sag-accent,#38bdf8) 28%,var(--border,rgba(148,163,184,.24)));background:color-mix(in srgb,var(--sag-accent,#38bdf8) 6%,var(--card,rgba(17,19,24,.88)));font:400 12.5px/1.55 var(--sag-font-sans,Inter,sans-serif);color:var(--foreground,#eef1f7);}
.ag-sag-thought-box-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:5px;font-size:11px;color:var(--muted-foreground,#94a3b8);}
.ag-sag-thought-actions{display:flex;gap:5px;}
.ag-sag-thought-btn{padding:1px 7px;border-radius:6px;border:1px solid var(--border,rgba(148,163,184,.26));background:transparent;color:inherit;font-size:11px;cursor:pointer;}
.ag-sag-thought-body p{margin:0 0 6px;}
.ag-sag-thought-body p:last-child{margin-bottom:0;}
.ag-sag-thought-body[data-tone="error"]{color:var(--destructive,#f87171);}
[data-ag-sag-thought-hide-src="1"] > :not([data-ag-sag-owned="1"]){display:none!important;}
`.trim();

  return { STYLE_ID, CORE_CSS };
});
