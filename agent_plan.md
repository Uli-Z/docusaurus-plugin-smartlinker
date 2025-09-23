# Plan

1. Review the SmartLink + Tooltip markup/CSS to spot where they bypass Infima tokens/utilities.
2. Refactor the styles to lean on Infima variables (spacing, color, transitions) and adjust the tooltip runtime so width is driven via CSS custom properties.
3. Update docs/logs with the new token mapping and run the build/tests to confirm the packaged output.
