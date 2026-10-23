/**
 * Focuses the control a Reset button belongs to: the first other control in its row or key
 * control. The button unmounts once its value is reset, which would drop focus (WCAG 2.4.3).
 */
export function focusControl(reset: HTMLElement): void {
  const scope = reset.closest("[data-token], [data-key]");
  const controls = scope?.querySelectorAll<HTMLElement>("input, button") ?? [];
  [...controls].find((control) => control !== reset)?.focus();
}
