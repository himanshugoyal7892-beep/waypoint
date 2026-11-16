// Styles live inside the shadow root, so host-page CSS can't reach them and they can't leak out.
// Colours, corners and font come from CSS variables set by ui/theme.ts (project's tip theme).
export const Z_INDEX = 2147483000;

export const STYLES = `
:host { all: initial; }
* { box-sizing: border-box; }
.highlight {
  position: fixed; z-index: ${Z_INDEX}; pointer-events: none; border-radius: var(--wp-hl-radius, 8px);
  box-shadow: 0 0 0 4px var(--wp-primary, #3b4fd8), 0 0 0 100vmax var(--wp-backdrop, rgba(15,23,42,.55));
}
.tooltip {
  position: fixed; top: 0; left: 0; z-index: ${Z_INDEX + 1}; width: max-content; max-width: min(360px, calc(100vw - 24px));
  background: var(--wp-bg, #fff); color: var(--wp-fg, #0f172a); border-radius: var(--wp-radius, 14px); padding: 16px 16px 12px;
  box-shadow: 0 12px 32px rgba(15,23,42,.25), 0 2px 6px rgba(15,23,42,.12);
  font: 14px/1.5 var(--wp-font, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif);
  text-align: left; pointer-events: auto; outline: none;
}
.arrow { position: absolute; width: 12px; height: 12px; background: var(--wp-bg, #fff); transform: rotate(45deg); }
.header { display: flex; align-items: flex-start; gap: 12px; }
.title { flex: 1; margin: 0; font-size: 16px; font-weight: 600; line-height: 1.35; font-family: inherit; color: inherit; }
.close {
  all: unset; cursor: pointer; width: 28px; height: 28px; margin: -4px -6px 0 0; border-radius: var(--wp-btn-radius, 8px);
  display: inline-flex; align-items: center; justify-content: center; color: var(--wp-muted, #64748b); font-size: 20px; line-height: 1;
}
.close:hover { background: var(--wp-hover, #f1f5f9); }
.body { margin: 6px 0 0; white-space: pre-wrap; color: var(--wp-body, #334155); }
.footer { display: flex; align-items: center; gap: 8px; margin-top: 14px; }
.counter { flex: 1; display: flex; align-items: center; gap: 4px; font-size: 12px; color: var(--wp-muted, #64748b); }
.dot { width: 6px; height: 6px; border-radius: 3px; background: var(--wp-track, #e2e8f0); }
.dot.on { width: 16px; background: var(--wp-primary-btn, var(--wp-primary, #3b4fd8)); }
.dot.done { background: var(--wp-primary-btn, var(--wp-primary, #3b4fd8)); opacity: .45; }
.bar { width: 72px; height: 4px; border-radius: 2px; background: var(--wp-track, #e2e8f0); overflow: hidden; }
.bar > i { display: block; height: 100%; background: var(--wp-primary-btn, var(--wp-primary, #3b4fd8)); }
.btn {
  all: unset; cursor: pointer; border-radius: var(--wp-btn-radius, 8px); padding: 7px 12px; font-size: 13px; font-weight: 500;
  border: 1px solid var(--wp-border, #e2e8f0); color: var(--wp-fg, #0f172a); background: var(--wp-btn-bg, #fff);
}
.btn:hover { background: var(--wp-hover, #f8fafc); }
.btn.primary {
  background: var(--wp-primary-btn, var(--wp-primary, #3b4fd8)); border-color: var(--wp-primary-btn, var(--wp-primary, #3b4fd8));
  color: var(--wp-on-primary, #fff);
}
.btn.primary:hover { filter: brightness(0.94); background: var(--wp-primary-btn, var(--wp-primary, #3b4fd8)); }
.btn.link { border-color: transparent; background: transparent; color: var(--wp-muted, #64748b); padding-left: 4px; padding-right: 4px; }
.btn:focus-visible, .close:focus-visible { outline: 2px solid var(--wp-ring, var(--wp-primary, #3b4fd8)); outline-offset: 2px; }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
`;
