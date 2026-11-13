
/* ================= 条纹管交互模拟器 ================= */
(function(){
  var cv = document.getElementById('lab'), ctx = cv.getContext('2d');
  var W = 940, H = 360, AXIS = 180;
  var CATH = 90, ANODE = 180, PLS = 400, PLE = 500, SCR = 850;
  var phosphor = document.createElement('canvas'); phosphor.width = W; phosphor.height = H;
  var pctx = phosphor.getContext('2d');

  var mode = 'const';            // 'const' | 'scan'
  var electrons = [], simT = 0, emitting = false, emitStart = 0, lastSpawn = 0;
  var running = true, yMin = null, yMax = null, launched = 0;

  var sU1 = document.getElementById('sU1'), sU = document.getElementById('sU'),
      sK = document.getElementById('sK'), sDt = document.getElementById('sDt');

  function pU1(){ return sU1.value / 10; }       // 0.5 .. 3.0
  function pU(){ return sU.value / 10; }         // 0 .. 3.0
  function pK(){ return sK.value / 10; }         // 0.2 .. 3.0
  function pDt(){ return sDt.value / 10; }       // 0.3 .. 2.0 s
  function v0(){ return 150 * Math.sqrt(pU1()); }
  function uAt(t){ return mode === 'const' ? pU() : 0.4 + pK() * (t - emitStart); }

  /* 滑块显示 */
  function syncLabels(){
    document.getElementById('vU1').textContent = pU1().toFixed(1);
    document.getElementById('vU').textContent = pU().toFixed(1);
    document.getElementById('vK').textContent = pK().toFixed(1);
    document.getElementById('vDt').textContent = pDt().toFixed(1);
  }
  [sU1, sU, sK, sDt].forEach(function(s){ s.addEventListener('input', syncLabels); });
  syncLabels();

  /* 模式切换 */
  var tabC = document.getElementById('tabConst'), tabS = document.getElementById('tabScan');
  function setMode(m){
    mode = m;
    tabC.classList.toggle('on', m === 'const');
    tabS.classList.toggle('on', m === 'scan');
    document.getElementById('ctlU').style.display = m === 'const' ? '' : 'none';
    document.getElementById('ctlK').style.display = m === 'scan' ? '' : 'none';
    clearAll();
  }
  tabC.onclick = function(){ setMode('const'); };
  tabS.onclick = function(){ setMode('scan'); };

  document.getElementById('btnFire').onclick = function(){
    clearAll();
    emitting = true; emitStart = simT; lastSpawn = -1; launched = 0;
  };
  document.getElementById('btnClear').onclick = clearAll;

  function clearAll(){
    electrons = []; yMin = null; yMax = null; launched = 0; emitting = false;
    pctx.clearRect(0, 0, W, H);
    document.getElementById('roDy').textContent = '—';
    document.getElementById('roN').textContent = '0';
  }

  function spawn(){
    electrons.push({ x: CATH, y: AXIS, vx: 0, vy: 0, uEntry: null });
    launched++;
    document.getElementById('roN').textContent = launched;
  }

  var last = performance.now();
  function tick(now){
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    simT += dt;

    /* 发射 */
    if (emitting){
      if (simT - emitStart <= pDt()){
        if (lastSpawn < 0 || simT - lastSpawn >= 0.07){ spawn(); lastSpawn = simT; }
      } else emitting = false;
    }
    /* 恒定模式下持续流（便于拖滑块看光点移动） */
    if (mode === 'const' && !emitting && electrons.length < 26 && Math.random() < 0.25) spawn();

    /* 物理推进 */
    for (var i = electrons.length - 1; i >= 0; i--){
      var e = electrons[i];
      if (e.x < ANODE){                       // 加速区
        var prog = (e.x - CATH) / (ANODE - CATH);
        e.vx = v0() * Math.sqrt(Math.max(0.02, prog));
        e.x += e.vx * dt;
      } else if (e.x < PLS){                  // L1 漂移
        e.x += v0() * dt;
      } else if (e.x < PLE){                  // 偏转区
        if (e.uEntry === null) e.uEntry = uAt(simT);
        var a = 95 * (e.uEntry / 1.0);        // 视觉比例系数
        e.vy -= a * dt;                       // 上板为正 → 向上偏
        e.y += e.vy * dt;
        e.x += v0() * dt;
      } else if (e.x < SCR){                  // L3 漂移
        e.x += v0() * dt;
        e.y += e.vy * dt;
      } else {                                 // 打屏
        impact(e.y);
        electrons.splice(i, 1);
      }
    }

    draw();
  }

  function impact(y){
    y = Math.max(20, Math.min(H - 20, y));
    if (yMin === null || y < yMin) yMin = y;
    if (yMax === null || y > yMax) yMax = y;
    var g = pctx.createRadialGradient(SCR + 6, y, 0, SCR + 6, y, 12);
    g.addColorStop(0, 'rgba(255,216,77,.95)');
    g.addColorStop(0.4, 'rgba(255,216,77,.45)');
    g.addColorStop(1, 'rgba(255,216,77,0)');
    pctx.fillStyle = g;
    pctx.beginPath(); pctx.arc(SCR + 6, y, 12, 0, 7); pctx.fill();
    if (yMax > yMin) document.getElementById('roDy').textContent = Math.round(yMax - yMin) + ' px';
  }

  function draw(){
    ctx.clearRect(0, 0, W, H);
    /* 磷光余晖 */
    ctx.drawImage(phosphor, 0, 0);

    /* 装置 */
    ctx.strokeStyle = '#22304f'; ctx.setLineDash([3, 5]);
    ctx.beginPath(); ctx.moveTo(0, AXIS); ctx.lineTo(W, AXIS); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#9d7bff'; ctx.fillRect(CATH - 4, AXIS - 55, 8, 110);
    ctx.fillStyle = '#d8b45a';
    ctx.fillRect(ANODE - 3, AXIS - 55, 7, 40); ctx.fillRect(ANODE - 3, AXIS + 15, 7, 40);
    ctx.fillStyle = '#22b07d';
    ctx.fillRect(PLS, AXIS - 46, PLE - PLS, 7); ctx.fillRect(PLS, AXIS + 39, PLE - PLS, 7);
    ctx.fillStyle = '#22304f'; ctx.fillRect(SCR, 30, 10, H - 60);
    ctx.strokeStyle = '#3a4a70'; ctx.strokeRect(SCR, 30, 10, H - 60);

    /* 标注 */
    ctx.fillStyle = '#5d6b8a'; ctx.font = '11px PingFang SC, sans-serif';
    ctx.fillText('光阴极', CATH - 16, AXIS + 78);
    ctx.fillText('阳极', ANODE - 10, AXIS + 78);
    ctx.fillText('偏转板 U', PLS + 18, AXIS + 70);
    ctx.fillText('荧光屏', SCR - 10, 22);
    ctx.fillStyle = '#4dd0e1'; ctx.fillText('加速 U₁', CATH + 30, AXIS - 70);

    /* 电压表 */
    ctx.fillStyle = '#d8b45a'; ctx.font = 'bold 13px Consolas, monospace';
    ctx.fillText('U(t) = ' + (emitting || mode === 'scan' ? uAt(simT).toFixed(2) : pU().toFixed(1)), PLS - 20, AXIS - 60);
    document.getElementById('roU').textContent = (mode === 'const' ? pU() : uAt(simT)).toFixed(2);

    /* 电子 */
    ctx.fillStyle = '#3dffa0';
    ctx.shadowColor = '#3dffa0'; ctx.shadowBlur = 10;
    electrons.forEach(function(e){
      ctx.beginPath(); ctx.arc(e.x, e.y, 3.6, 0, 7); ctx.fill();
    });
    ctx.shadowBlur = 0;

    /* 条纹量尺 */
    if (yMin !== null && yMax !== null && yMax - yMin > 4){
      ctx.strokeStyle = '#d8b45a'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(SCR + 24, yMin); ctx.lineTo(SCR + 24, yMax); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(SCR + 18, yMin); ctx.lineTo(SCR + 30, yMin);
      ctx.moveTo(SCR + 18, yMax); ctx.lineTo(SCR + 30, yMax); ctx.stroke();
      ctx.fillStyle = '#d8b45a'; ctx.font = 'italic 14px Times New Roman';
      ctx.fillText('Δy', SCR + 34, (yMin + yMax) / 2 + 5);
    }
  }
  function loop(now){ tick(now); requestAnimationFrame(loop); }
  requestAnimationFrame(loop);
  /* 部分 WebView 在页面不可见时会冻结 rAF，用定时器兜底保证模拟继续 */
  setInterval(function(){ if (performance.now() - last > 250) tick(performance.now()); }, 120);

  /* ================= 光电小实验 ================= */
  var W0 = 1.1, matName = '多碱';
  var matBtns = document.querySelectorAll('.mat-btns button');
  var sLam = document.getElementById('sLam');
  var peStatus = document.getElementById('peStatus');
  function photonE(){ return 6.63e-34 * 3e8 / (sLam.value * 1e-9) / 1.6e-19; }
  function syncPE(){
    document.getElementById('vLam').textContent = sLam.value + ' nm';
    peStatus.innerHTML = '当前光子能量 E = <b>' + photonE().toFixed(2) + ' eV</b>，逸出功 W₀ = <b>' + W0 + ' eV</b>';
  }
  matBtns.forEach(function(b){
    b.onclick = function(){
      matBtns.forEach(function(x){ x.classList.remove('on'); });
      b.classList.add('on');
      W0 = parseFloat(b.dataset.w);
      matName = b.textContent.split(' ')[0];
      document.getElementById('peMetal').innerHTML = '光阴极<br>（' + matName + '）';
      syncPE();
    };
  });
  sLam.addEventListener('input', syncPE);
  syncPE();

  var firing = false;
  document.getElementById('btnPhoton').onclick = function(){
    if (firing) return;
    firing = true;
    var ph = document.getElementById('pePhoton'), el = document.getElementById('peElectron');
    var stage = document.getElementById('peStage');
    var metal = document.getElementById('peMetal');
    var sr = stage.getBoundingClientRect(), mr = metal.getBoundingClientRect();
    var targetX = mr.left - sr.left - 10, startX = sr.width * 0.06;
    var ey = 80;
    ph.style.transition = 'none'; ph.style.left = startX + 'px'; ph.style.opacity = '1';
    el.style.transition = 'none'; el.style.opacity = '0';
    requestAnimationFrame(function(){
      ph.style.transition = 'left .9s cubic-bezier(.3,.6,.6,1), opacity .2s .85s';
      ph.style.left = targetX + 'px'; ph.style.opacity = '0';
    });
    setTimeout(function(){
      if (photonE() >= W0){
        el.style.left = (targetX + 14) + 'px'; el.style.top = ey + 'px';
        el.style.transition = 'opacity .15s, left .8s ease-out, top .8s ease-out';
        el.style.opacity = '1';
        requestAnimationFrame(function(){
          el.style.left = (targetX - 90) + 'px';
          el.style.top = (ey - 44) + 'px';
        });
        setTimeout(function(){ el.style.opacity = '0'; }, 750);
        peStatus.innerHTML = '<span style="color:var(--beam)">✔ 打出电子！</span> E = <b>' + photonE().toFixed(2) + '</b> ≥ W₀ = <b>' + W0 + '</b> eV';
      } else {
        peStatus.innerHTML = '<span style="color:var(--red)">✘ 被吸收了</span> E = <b>' + photonE().toFixed(2) + '</b> &lt; W₀ = <b>' + W0 + '</b> eV，电子出不来';
      }
      setTimeout(function(){ firing = false; }, 1000);
    }, 880);
  };
})();
