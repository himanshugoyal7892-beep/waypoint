/**
 * Plain-text normalisation for tour content.
 *
 * Content is never interpreted as HTML: the SDK renders with textContent and React escapes
 * on the dashboard. This function only removes characters that have no business in a
 * tooltip (C0/C1 control chars except newline and tab, bidi overrides that can disguise
 * text, zero-width joiners at the edges) and normalises whitespace.
 */
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g;
const BIDI_OVERRIDES = /[‪-‮⁦-⁩]/g;

export function normalizePlainText(input: string, { multiline = false } = {}): string {
  let out = input.normalize("NFC").replace(CONTROL_CHARS, "").replace(BIDI_OVERRIDES, "");
  out = out.replace(/\r\n?/g, "\n");
  if (!multiline) out = out.replace(/[\n\t]+/g, " ");
  else out = out.replace(/\n{3,}/g, "\n\n");
  return out.trim();
}

/** True if the string contains a control character that normalizePlainText would strip. */
export function hasControlChars(input: string): boolean {
  CONTROL_CHARS.lastIndex = 0;
  return CONTROL_CHARS.test(input);
}
