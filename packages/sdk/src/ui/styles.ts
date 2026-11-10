// Styles live inside the shadow root, so host-page CSS can't reach them and they can't leak out.
export const Z_INDEX = 2147483000;

export const STYLES = `
:host { all: initial; }
* { box-sizing: border-box; }
.highlight {
  position: fixed; z-index: ${Z_INDEX}; pointer-events: none; border-radius: 8px;
  box-shadow: 0 0 0 4px rgba(99,112,255,.9), 0 0 0 100vmax rgba(15,23,42,.55);
}
.tooltip {
  position: fixed; top: 0; left: 0; z-index: ${Z_INDEX + 1}; width: max-content; max-width: min(360px, calc(100vw - 24px));
  background: #fff; color: #0f172a; border-radius: 12px; padding: 16px 16px 12px;
  box-shadow: 0 12px 32px rgba(15,23,42,.25), 0 2px 6px rgba(15,23,42,.12);
  font: 14px/1.5 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  text-align: left; pointer-events: auto; outline: none;
}
.arrow { position: absolute; width: 12px; height: 12px; background: #fff; transform: rotate(45deg); }
.header { display: flex; align-items: flex-start; gap: 12px; }
.title { flex: 1; margin: 0; font-size: 16px; font-weight: 600; line-height: 1.35; }
.close {
  all: unset; cursor: pointer; width: 28px; height: 28px; margin: -4px -6px 0 0; border-radius: 6px;
  display: inline-flex; align-items: center; justify-content: center; color: #475569; font-size: 20px; line-height: 1;
}
.close:hover { background: #f1f5f9; }
.body { margin: 6px 0 0; white-space: pre-wrap; color: #334155; }
.footer { display: flex; align-items: center; gap: 8px; margin-top: 14px; }
.counter { flex: 1; font-size: 12px; color: #64748b; }
.btn {
  all: unset; cursor: pointer; border-radius: 8px; padding: 7px 12px; font-size: 13px; font-weight: 500;
  border: 1px solid #e2e8f0; color: #0f172a; background: #fff;
}
.btn:hover { background: #f8fafc; }
.btn.primary { background: #3b4fd8; border-color: #3b4fd8; color: #fff; }
.btn.primary:hover { background: #3243c4; }
.btn.link { border-color: transparent; color: #64748b; padding-left: 4px; padding-right: 4px; }
.btn:focus-visible, .close:focus-visible { outline: 2px solid #3b4fd8; outline-offset: 2px; }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
`;
