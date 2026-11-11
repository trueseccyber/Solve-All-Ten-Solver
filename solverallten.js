// To enable this cheat you need to do Ctrl + Shift + I and open the console then paste code below and enjoy!
(() => {
  // ---- find instance ----
  let inst = null;
  for (const el of document.querySelectorAll("*")) {
    const k = Object.keys(el).find(k => k.startsWith("__reactContainer") || k.startsWith("__reactFiber"));
    if (!k) continue;
    let fiber = el[k], seen = new Set();
    const walk = (f, d) => {
      if (!f || d > 140 || seen.has(f) || inst) return; seen.add(f);
      let s = f.memoizedState, g = 0;
      while (s && g++ < 120) {
        const m = s.memoizedState;
        if (m && typeof m === "object" && Array.isArray(m.targets) && m.problem && typeof m.saveToStorage === "function") { inst = m; return; }
        const st = m && (m.current || m.stateNode);
        if (st && Array.isArray(st.targets) && st.problem && typeof st.saveToStorage === "function") { inst = st; return; }
        s = s.next;
      }
      walk(f.child, d + 1); walk(f.sibling, d);
    };
    walk(fiber, 0); if (inst) break;
  }
  if (!inst) return alert("Kestrel-7: instance not found. Reload and retry.");
  window.__K7INST = inst;

  const problem = inst.problem;
  const start = Array.from(problem.start);
  const targets = Array.from(problem.targets);

  // ---- solver ----
  function getPermutations(arr) {
    if (arr.length <= 1) return [arr];
    const perms = [], used = new Array(arr.length).fill(false), cur = [];
    function backtrack() {
      if (cur.length === arr.length) { perms.push([...cur]); return; }
      for (let i = 0; i < arr.length; i++) {
        if (used[i]) continue;
        if (i > 0 && arr[i] === arr[i-1] && !used[i-1]) continue;
        used[i] = true; cur.push(i); backtrack(); cur.pop(); used[i] = false;
      }
    }
    backtrack(); return perms;
  }

  const digitPerms = getPermutations(start);
  const ops = ["+", "-", "*", "/"];
  const sol = new Map(); 
  const strSol = new Map(); 

  for (const p of digitPerms) {
    for (const op1 of ops) for (const op2 of ops) for (const op3 of ops) {
      const toks = [
        { type: "start", index: p[0] }, { type: "op", op: op1 },
        { type: "start", index: p[1] }, { type: "op", op: op2 },
        { type: "start", index: p[2] }, { type: "op", op: op3 },
        { type: "start", index: p[3] }
      ];
      
      let val = start[p[0]];
      const doOp = (v, op, right) => op === "+" ? v + right : op === "-" ? v - right : op === "*" ? v * right : v / right;
      val = doOp(val, op1, start[p[1]]);
      val = doOp(val, op2, start[p[2]]);
      val = doOp(val, op3, start[p[3]]);

      if (Math.abs(val - Math.round(val)) < 1e-9) {
        const t = Math.round(val);
        if (targets.includes(t)) {
          if (!sol.has(t)) { sol.set(t, []); strSol.set(t, []); }
          sol.get(t).push(toks);
          const strVal = start[p[0]] + op1 + start[p[1]] + op2 + start[p[2]] + op3 + start[p[3]];
          strSol.get(t).push(strVal);
        }
      }
    }
  }

  // ---- state ----
  let px = null, py = null, theme = "light", isMin = false, opacity = 0.95, autoSolve = false;
  try {
    const p = JSON.parse(localStorage.getItem("k7-panel-pos") || "null"); if (p) { px = p.x; py = p.y; }
    theme = localStorage.getItem("k7-theme") || "light";
    const op = localStorage.getItem("k7-opacity"); if (op) opacity = parseFloat(op);
    autoSolve = localStorage.getItem("k7-autosolve") === "true";
  } catch (e) {}

  const applyTheme = () => {
    const isDark = theme === "dark";
    root.style.background = isDark ? `rgba(28,28,30,${opacity})` : `rgba(245,245,247,${opacity})`;
    root.style.color = isDark ? "#f5f5f7" : "#1d1d1f";
    root.style.boxShadow = isDark ? "0 12px 40px rgba(0,0,0,.5),0 1px 3px rgba(0,0,0,.2)" : "0 12px 40px rgba(0,0,0,.15),0 1px 3px rgba(0,0,0,.06)";
    
    const out = root.querySelector("#k7-out");
    if (out) {
      out.style.background = isDark ? `rgba(44,44,46,${opacity})` : `rgba(255,255,255,${opacity})`;
      out.style.color = isDark ? "#f5f5f7" : "#1d1d1f";
    }
    const btns = root.querySelectorAll(".k7-btn");
    btns.forEach(b => {
      if (b.id === "k7-solve") return;
      b.style.background = isDark ? `rgba(44,44,46,${opacity})` : `rgba(255,255,255,${opacity})`;
      b.style.color = isDark ? "#f5f5f7" : "#1d1d1f";
      b.style.borderColor = isDark ? "#3a3a3c" : "#d2d2d7";
    });
  };

  const solveAll = (silent = false) => {
    let okCount = 0;
    for (let i = 0; i < inst.targets.length; i++) {
      const t = inst.targets[i];
      if (t.solution) { okCount++; continue; }
      const toksList = sol.get(t.number);
      if (!toksList) { t.impossible = true; continue; }

      let ok = false;
      for (const toks of toksList) {
        try { inst.grabTarget(i); } catch (e) {}
        try { inst.updateExpressionState({ start: problem.start, rules: problem.rules, main: toks, interm: [] }, {}); } catch (e) {}
        try { inst.pushEquals(); } catch (e) {}
        if (inst.targets[i].solution) { ok = true; break; }
      }
      if (ok) okCount++;
    }
    try { inst.saveToStorage(); } catch (e) {}
    
    if (!silent) {
      const isDark = theme === "dark";
      out.style.display = "block";
      out.innerHTML = `<div style="text-align:center;padding:20px 0;color:#34c759;font-weight:600;font-size:15px;">All ${okCount}/10 Solved</div>`;
      setTimeout(() => { out.style.display = "none"; }, 2000);
    }
    return okCount;
  };

  // ---- UI ----
  document.getElementById("k7-allten")?.remove();
  const root = document.createElement("div");
  root.id = "k7-allten";
  
  root.style.cssText = `position:fixed;${px != null ? `left:${px}px;top:${py}px;` : "top:24px;right:24px;"}width:360px;z-index:2147483647;
    font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",Roboto,Helvetica,Arial,sans-serif;
    border-radius:18px;padding:0;box-sizing:border-box;font-size:14px;line-height:1.4;
    user-select:none;-webkit-user-select:none;transition:background 0.2s,color 0.2s,opacity 0.1s;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);`;
    
  root.innerHTML = `
    <div id="k7-head" style="display:flex;justify-content:space-between;align-items:center;padding:20px 20px 0;cursor:grab;touch-action:none;">
      <div style="font-size:17px;font-weight:600;letter-spacing:-.2px;">All Ten</div>
      <div style="display:flex;gap:8px;">
        <div id="k7-settings" style="cursor:pointer;color:#86868b;font-size:16px;line-height:1;padding:2px 6px;" title="Settings">⚙</div>
        <div id="k7-x" style="cursor:pointer;color:#86868b;font-size:18px;line-height:1;padding:2px 6px;">×</div>
      </div>
    </div>
    
    <div id="k7-settings-panel" style="display:none;padding:0 20px 14px;border-bottom:1px solid rgba(128,128,128,0.2);margin-bottom:10px;font-size:13px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">
        <span>Dark Mode</span>
        <input type="checkbox" id="k7-dark-toggle" style="cursor:pointer;">
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">
        <span>Auto-Solve</span>
        <input type="checkbox" id="k7-auto-toggle" style="cursor:pointer;">
      </div>
      <div style="display:flex;flex-direction:column;margin-top:12px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
          <span>Opacity</span>
          <span id="k7-op-val">${Math.round(opacity * 100)}%</span>
        </div>
        <input type="range" id="k7-opacity" min="0.2" max="1.0" step="0.05" value="${opacity}" style="cursor:pointer;width:100%;">
      </div>
    </div>

    <div id="k7-content" style="padding:0 20px 20px;">
      <div id="k7-subtext" style="color:#86868b;font-size:12px;margin:4px 0 14px;">digits ${start.join(", ")} · ${sol.size}/${targets.length} found</div>
      <div style="display:flex;gap:8px;margin-bottom:8px;">
        <button id="k7-reveal" class="k7-btn" style="flex:1;border-radius:980px;padding:11px 0;font:500 14px inherit;cursor:pointer;">Reveal</button>
        <button id="k7-solve" style="flex:1;background:#0071e3;color:#fff;border:none;border-radius:980px;padding:11px 0;font:500 14px inherit;cursor:pointer;">Solve</button>
      </div>
      <div id="k7-out" style="margin-top:14px;max-height:300px;overflow:auto;border-radius:12px;padding:10px 12px;font:12px ui-monospace,SFMono-Regular,Menlo,monospace;display:none;user-select:text;border:1px solid rgba(128,128,128,0.2);"></div>
    </div>
    
    <div id="k7-mini" style="display:none;padding:12px 16px;font-weight:600;cursor:pointer;text-align:center;color:#0071e3;">All Ten</div>
  `;
  document.body.appendChild(root);
  
  const darkToggle = root.querySelector("#k7-dark-toggle");
  const autoToggle = root.querySelector("#k7-auto-toggle");
  const opSlider = root.querySelector("#k7-opacity");
  const opVal = root.querySelector("#k7-op-val");
  
  darkToggle.checked = (theme === "dark");
  autoToggle.checked = autoSolve;
  applyTheme();

  const head = root.querySelector("#k7-head"), out = root.querySelector("#k7-out");
  const content = root.querySelector("#k7-content"), mini = root.querySelector("#k7-mini");
  const settingsPanel = root.querySelector("#k7-settings-panel");

  root.querySelector("#k7-settings").onclick = () => {
    settingsPanel.style.display = settingsPanel.style.display === "none" ? "block" : "none";
  };
  
  darkToggle.onchange = (e) => {
    theme = e.target.checked ? "dark" : "light";
    localStorage.setItem("k7-theme", theme);
    applyTheme();
  };

  autoToggle.onchange = (e) => {
    autoSolve = e.target.checked;
    localStorage.setItem("k7-autosolve", autoSolve);
  };

  opSlider.oninput = (e) => {
    opacity = parseFloat(e.target.value);
    opVal.textContent = Math.round(opacity * 100) + "%";
    localStorage.setItem("k7-opacity", opacity);
    applyTheme();
  };

  root.querySelector("#k7-x").onclick = () => root.remove();

  // Drag
  let drag = null;
  head.addEventListener("pointerdown", e => {
    if (e.target.id === "k7-x" || e.target.id === "k7-settings") return;
    const r = root.getBoundingClientRect();
    drag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
    root.style.right = "auto"; root.style.left = r.left + "px"; root.style.top = r.top + "px";
    head.style.cursor = "grabbing"; head.setPointerCapture(e.pointerId);
  });
  head.addEventListener("pointermove", e => {
    if (!drag) return;
    const w = root.offsetWidth, h = root.offsetHeight;
    let x = Math.max(0, Math.min(innerWidth - w, e.clientX - drag.dx));
    let y = Math.max(0, Math.min(innerHeight - h, e.clientY - drag.dy));
    root.style.left = x + "px"; root.style.top = y + "px";
  });
  const endDrag = () => { if (!drag) return; drag = null; head.style.cursor = "grab";
    try { const r = root.getBoundingClientRect(); localStorage.setItem("k7-panel-pos", JSON.stringify({x:r.left,y:r.top})); } catch(e){} };
  head.addEventListener("pointerup", endDrag);
  head.addEventListener("pointercancel", endDrag);

  // Minimize
  const toggleMin = () => {
    isMin = !isMin;
    head.style.display = isMin ? "none" : "flex";
    content.style.display = isMin ? "none" : "block";
    settingsPanel.style.display = "none"; 
    mini.style.display = isMin ? "block" : "none";
  };

  document.addEventListener("keydown", (e) => {
    if (e.key === "Shift" && e.code === "ShiftRight") {
      e.preventDefault();
      toggleMin();
    }
  });

  mini.onclick = toggleMin;

  // Reveal
  root.querySelector("#k7-reveal").onclick = () => {
    out.style.display = "block";
    out.innerHTML = "";
    targets.forEach(t => {
      const strList = strSol.get(t);
      const str = strList ? strList[0] : "?";
      out.innerHTML += `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid rgba(128,128,128,0.15);">
        <span style="color:#86868b;">${t}</span>
        <span style="font-weight:600;">${str} = ${t}</span>
      </div>`;
    });
    out.scrollTop = 0;
  };

  // Solve
  root.querySelector("#k7-solve").onclick = () => {
    const btn = root.querySelector("#k7-solve");
    btn.disabled = true; btn.textContent = "Solving…";
    out.style.display = "none";
    solveAll();
    btn.disabled = false; btn.textContent = "Solve";
  };

  // Auto-solve check on load
  if (autoSolve) {
    solveAll(true);
  }
})();

// ©️2026 TrueSec Security, All Rights Reserved
