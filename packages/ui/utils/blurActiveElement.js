/**
 * Blurs the currently focused element (dismisses the mobile keyboard),
 * then waits for the keyboard animation to complete before resolving.
 *
 * @param {number} delay - Milliseconds to wait after blur (default 300ms)
 * @returns {Promise<void>} Resolves after the delay
 *
 * @example
 * import { blurActiveElement } from '@routine-notes/ui/utils/blurActiveElement';
 *
 * async openDrawer() {
 *   await blurActiveElement();
 *   this.drawerOpen = true;
 * }
 */
export function blurActiveElement(delay = 300) {
    return new Promise((resolve) => {
        const el = document.activeElement;
        if (el && typeof el.blur === 'function') {
            el.blur();
        }
        setTimeout(resolve, delay);
    });
}
