import { Z_INDEX } from "../ui/styles";

export const BUILDER_STYLES = `
:host { all: initial; }
* { box-sizing: border-box; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
.panel {
  position: fixed; right: 16px; bottom: 16px; z-index: ${Z_INDEX + 10}; width: 360px; max-height: min(78vh, 720px);
  display: flex; flex-direction: column; background: #fff; color: #0f172a; border-radius: 14px; overflow: hidden;
  box-shadow: 0 18px 48px rgba(15,23,42,.28), 0 2px 8px rgba(15,23,42,.12); font-size: 13px; line-height: 1.45;
}
.panel.left { right: auto; left: 16px; }
.panel.min { width: auto; }
.head { display: flex; align-items: center; gap: 8px; padding: 10px 12px; background: #1e2a78; color: #fff; }
.head .t { flex: 1; font-weight: 600; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.head .sub { font-weight: 400; opacity: .8; }
.icon { all: unset; cursor: pointer; width: 26px; height: 26px; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; font-size: 15px; color: inherit; }
.icon:hover { background: rgba(255,255,255,.15); }
.body { padding: 12px; overflow-y: auto; overflow-x: hidden; display: grid; grid-template-columns: minmax(0, 1fr); gap: 10px; }
.body > * { min-width: 0; }
.row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.grow { flex: 1; min-width: 0; }
label { display: grid; gap: 4px; font-weight: 600; font-size: 12px; color: #334155; }
input, select, textarea {
  font: 13px/1.4 inherit; color: #0f172a; background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 7px 9px; width: 100%;
}
textarea { min-height: 64px; resize: vertical; }
input.mono { font-family: ui-monospace, Menlo, monospace; font-size: 12px; }
input:focus, select:focus, textarea:focus { outline: 2px solid #6366f1; outline-offset: 0; border-color: #6366f1; }
.check { display: flex; flex-direction: row; align-items: center; gap: 6px; font-weight: 500; }
.check input { width: auto; }
.btn { all: unset; cursor: pointer; text-align: center; border-radius: 8px; padding: 7px 12px; font-size: 13px; font-weight: 600; border: 1px solid #cbd5e1; background: #fff; color: #0f172a; }
.btn:hover { background: #f8fafc; }
.btn.primary { background: #3b4fd8; border-color: #3b4fd8; color: #fff; }
.btn.primary:hover { background: #3243c4; }
.btn.danger { color: #b91c1c; }
.btn.small { padding: 4px 8px; font-size: 12px; }
.btn[disabled] { opacity: .5; pointer-events: none; }
.btn:focus-visible, .icon:focus-visible { outline: 2px solid #6366f1; outline-offset: 2px; }
.badge { display: inline-block; border-radius: 999px; padding: 1px 8px; font-size: 11px; font-weight: 600; background: #f1f5f9; color: #334155; }
.badge.PUBLISHED, .badge.stable { background: #dcfce7; color: #166534; }
.badge.DRAFT, .badge.good { background: #fef9c3; color: #854d0e; }
.badge.fragile, .badge.ARCHIVED { background: #fee2e2; color: #991b1b; }
.steps { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: minmax(0, 1fr); gap: 6px; }
.step { min-width: 0; display: flex; align-items: center; gap: 6px; border: 1px solid #e2e8f0; border-radius: 10px; padding: 6px 8px; }
.num { flex: none; width: 22px; height: 22px; border-radius: 999px; background: #eef2ff; color: #3730a3; font-weight: 700; font-size: 11px; display: inline-flex; align-items: center; justify-content: center; }
.step .txt { flex: 1; min-width: 0; }
.step .ttl { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.step .meta { color: #64748b; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mini { all: unset; cursor: pointer; padding: 2px 5px; border-radius: 5px; color: #475569; font-size: 13px; }
.mini:hover { background: #f1f5f9; }
.mini[disabled] { opacity: .3; pointer-events: none; }
.note { border-radius: 8px; padding: 8px 10px; font-size: 12px; background: #f1f5f9; color: #334155; }
.note.warn { background: #fffbeb; color: #78350f; border: 1px solid #fde68a; }
.note.err { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
.note ul { margin: 4px 0 0; padding-left: 16px; }
.err-text { color: #b91c1c; font-size: 11px; font-weight: 500; }
.muted { color: #64748b; font-size: 12px; }
.status { min-height: 16px; color: #475569; font-size: 12px; }
.pick-box { position: fixed; z-index: ${Z_INDEX + 5}; pointer-events: none; border: 2px solid #6366f1; background: rgba(99,102,241,.12); border-radius: 4px; }
.pick-label { position: absolute; left: -2px; top: -22px; background: #6366f1; color: #fff; font: 600 11px/1 ui-monospace, Menlo, monospace; padding: 4px 6px; border-radius: 4px 4px 4px 0; white-space: nowrap; }
.banner { position: fixed; top: 12px; left: 50%; transform: translateX(-50%); z-index: ${Z_INDEX + 11}; background: #1e2a78; color: #fff; border-radius: 999px; padding: 8px 14px; font-size: 13px; font-weight: 600; box-shadow: 0 8px 24px rgba(15,23,42,.3); display: flex; gap: 10px; align-items: center; }
.banner .btn { padding: 4px 10px; font-size: 12px; }
`;
