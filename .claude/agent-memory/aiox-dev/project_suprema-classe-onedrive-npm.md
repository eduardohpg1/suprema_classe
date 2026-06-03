---
name: suprema-classe-onedrive-npm
description: npm installs in the Suprema Classe OneDrive folder corrupt native/optional packages — clean-reinstall recipe
metadata:
  type: project
---

The Suprema Classe project lives under a OneDrive-synced path (`C:\Users\dugro\OneDrive\Área de Trabalho\Suprema Classe`). OneDrive's file sync races with npm's extraction and intermittently corrupts packages: missing files inside packages (e.g. `util-deprecate/node.js`, `ts-interface-checker/dist/index.js`) and bad native binaries (`@rollup/rollup-win32-x64-msvc` reported as "not a valid Win32 application").

**Symptoms:** `tsc` passes but `vite build` fails with `ERR_DLOPEN_FAILED` on rollup, or "Cannot find module … Please verify that the package.json has a valid main entry" during PostCSS config load. Patching one package just surfaces the next corrupted one.

**Why:** OneDrive holds/locks files mid-write; `cmd rmdir /s` is also blocked by the lock, so `npm install` reports "changed 1 package" (thinks it's already installed) instead of repairing.

**How to apply:** Do a real clean reinstall, not incremental patching:
1. `powershell -NoProfile -Command "Remove-Item -Recurse -Force node_modules; Remove-Item -Force package-lock.json"` (PowerShell handles the OneDrive lock + long paths better than cmd rmdir).
2. `npm cache verify` (garbage-collects corrupted cache entries).
3. `npm install --no-audit --no-fund`.
After that the full `npm run build` (tsc + vite) succeeds. Pausing OneDrive sync during installs would prevent recurrence.
