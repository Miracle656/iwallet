# Frontend dev — "it freezes / restarts my laptop"

Almost always a **WSL2 memory + filesystem** problem, not the app. Symptoms: long
loads, the machine freezes, then Windows restarts, with no app error. Runs fine
natively on Windows.

## Why
- Running the repo from **`/mnt/c/...` inside WSL** makes Next.js/Turbopack watch and
  recompile across the slow 9P bridge — constant heavy I/O.
- **WSL2 (`vmmem`) has no memory cap by default** — it can grab most of the host's RAM.
  Next dev + Turbopack + the live polling balloons it until Windows starves and hard-restarts.

## Fix — pick one

### A. Run the frontend natively on Windows (simplest, recommended)
In **PowerShell** (not WSL):
```powershell
cd C:\path\to\iwallet\frontend
npm install
npm run dev -- -p 3001
```
Keep the agent/backend in WSL if you like — only the frontend needs this.

### B. If you must use WSL
1. **Move the repo into the Linux home**, not `/mnt/c`:
   ```bash
   cp -r /mnt/c/Users/you/iwallet ~/iwallet   # or git clone into ~
   cd ~/iwallet/frontend && npm install && npm run dev -- -p 3001
   ```
2. **Cap WSL2 memory** so it can't freeze Windows — create `C:\Users\<you>\.wslconfig`:
   ```ini
   [wsl2]
   memory=6GB
   processors=4
   swap=2GB
   ```
   Then in PowerShell: `wsl --shutdown` and reopen WSL.

## Also done in code (reduces load regardless)
The `/trade` page ran 5 pollers at 2.5–6s. Now they poll slower (5–8s) and **pause
entirely when the browser tab is hidden** (`lib/use-poll.ts`), and the chart caps its
history. Far less background CPU/RAM/RPC.

## If `next build` also fails on WSL
Same root cause (OOM during compile). Use option A/B above, or build on Windows.
