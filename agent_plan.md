# agent_plan.md — Tooltip tap handling regression analysis

## Problem Statement
When testing the SmartLink tooltip on touch-only/mobile devices, the outer SmartLink behaves as expected (first tap opens the tooltip, second tap follows the SmartLink target). However, any additional links that are rendered **inside the tooltip content itself** (e.g., the MDX "Short Note" links) cannot be activated—the tap closes the tooltip instead of navigating.

## Observations
* Tooltip rendering is driven by `packages/docusaurus-plugin-smartlinker/src/theme/runtime/Tooltip.tsx`. It wraps the trigger in a Radix `RT.Root`/`RT.Trigger` pair, with the portalized `RT.Content` that hosts the MDX-rendered Short Note.
* Mobile-specific state lives in `packages/docusaurus-plugin-smartlinker/src/theme/runtime/SmartLink.tsx`. The component tracks whether hover is supported and, when hover is absent, manually controls the tooltip using `open`/`setOpen`.
* To emulate "tap once to open, tap again to navigate" semantics on touch devices, the component installs a `pointerdown`/`touchstart` capture listener on `document` whenever the tooltip is open:
  ```ts
  React.useEffect(() => {
    if (isHoverCapable || !open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent | MouseEvent | TouchEvent) => {
      const node = triggerRef.current;
      if (!node) return;
      if (event.target instanceof Node && node.contains(event.target)) {
        return;
      }
      close();
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('touchstart', handlePointerDown, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('touchstart', handlePointerDown, true);
    };
  }, [isHoverCapable, open, close]);
  ```
* Because Radix renders the tooltip content inside a portal, taps on the Short Note links **do not satisfy** `node.contains(event.target)`. The capture-phase handler therefore calls `close()` before the tap propagates to the tooltip link.
* `close()` not only collapses the tooltip (`setOpen(false)`), it also resets the `readyToNavigateRef`. Unmounting the tooltip during the capture phase prevents the subsequent `click` event from finding the link, which matches the observed "link is not clickable" behavior.

## Suspected Root Cause
The global capture handler treats any pointer/touch interaction outside the SmartLink trigger span as an "outside click" and immediately closes the tooltip. Since the tooltip content is portalized outside the trigger DOM tree, taps on its internal links are misidentified as outside interactions. Closing the tooltip during the capture phase removes the target element before the browser can emit the `click`, so the navigation never occurs.

## Next Steps for Fixing
* Revisit the outside-click detection so that taps within the tooltip content are exempt.
* Options could include checking `event.composedPath()` for the tooltip content, scoping the listener to exclude portal nodes, or delegating to Radix's built-in dismissal controls. (Implementation TBD by the follow-up task.)
