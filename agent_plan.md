# Build-Prozess Vereinfachung für `remark-smartlinker`

**Ziel:** Den Build-Prozess des internen Pakets `remark-smartlinker` vereinfachen und an den des Haupt-Pakets `docusaurus-plugin-smartlinker` angleichen.

## Bisherige Schritte

1.  **Analyse:** Es wurde festgestellt, dass `remark-smartlinker` ein manuelles Skript (`scripts/build-cjs.js`) verwendet, um eine CJS-Version zu erstellen, während das Haupt-Projekt `tsup` nutzt.
2.  **`tsup` Konfiguration:** Eine `tsup.config.ts` wurde für `remark-smartlinker` erstellt, um den Build-Prozess zu standardisieren.
3.  **`package.json` Aktualisierung:** Die `package.json` von `remark-smartlinker` wurde um ein `build`-Skript, `devDependencies` und die notwendigen `exports`-Einträge für CJS/ESM erweitert.
4.  **Skript-Entfernung:** Das veraltete Skript `scripts/build-cjs.js` wurde gelöscht.

## Aktueller Stand & Problem

Beim Testen der Änderungen schlug der Build-Prozess für `remark-smartlinker` fehl.

- **Fehler:** `error TS2688: Cannot find type definition file for 'vitest/globals'.`
- **Ursache:** Die `tsconfig.base.json` im Root-Verzeichnis erzwingt das globale Einbinden von `vitest/globals` Typen. Dies stört den Produktions-Build (`d.ts`-Generierung) mit `tsup`, da die Test-Typen nicht Teil des Produktions-Codes sein sollten.

## Nächste Schritte

1.  **TypeScript-Konfiguration korrigieren:** Die `tsconfig.base.json` muss so angepasst werden, dass die `vitest`-Typen nicht mehr global geladen werden. Stattdessen sollten sie nur in den `tsconfig.json`-Dateien der Pakete referenziert werden, die tatsächlich Tests enthalten.
2.  **Erneuter Test:** Nach der Korrektur wird der Build- und Test-Prozess erneut ausgeführt, um die erfolgreiche Vereinfachung zu verifizieren.