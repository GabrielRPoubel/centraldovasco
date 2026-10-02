(async function () {
  const el = document.getElementById("tabela");
  if (!el) return;
  let tabela = window.TABELA, clubes = window.CLUBES;
  if (!tabela) tabela = await (await fetch("assets/data/tabela.json")).json();
  if (!clubes) clubes = await (await fetch("assets/data/clubes.json")).json();
  const map = Object.fromEntries(clubes.map((c) => [c.slug, c]));
  const VASCO = "vasco-da-gama";
  const DEF = "assets/logos/times/_default.svg";
  const ico = (n) => "assets/logos/competicoes/" + n;
  const nomeT = (slug, alt) => (map[slug] && map[slug].nome) || alt || slug || "?";
  const escT = (slug) => (map[slug] && map[slug].escudo) || DEF;

  const SECOES = {
    bras: { nome: "Brasileirão", ico: ico("brasileirao-2026.svg") },
    copa: { nome: "Copa do Brasil", ico: ico("copa-do-brasil-2026.svg") },
    sula: { nome: "Sul-Americana", ico: ico("sul-americana-2026.svg") },
    carioca: { nome: "Carioca 2026", ico: ico("carioca-2026.svg") },
  };

  const dados = {
    bras: { rows: tabela, meta: null },
    copa: { carregando: true },
    sula: { carregando: true },
    carioca: { carregando: true },
  };
  let atual = "bras";

  const COLS = `<div class="t-cols"><span>#</span><span>Time</span><span>P</span><span>J</span><span>SG</span></div>`;

  function rowsHtml(rows) {
    return rows
      .map((r) => {
        const cls = ["t-row", r.zona ? "zona-" + r.zona : "", r.slug === VASCO ? "me" : ""].join(" ").trim();
        const det = r.v != null ? `${r.pts} pts • ${r.j}j ${r.v}V ${r.e}E ${r.d}D` : `${r.pts} pts em ${r.j} jogos`;
        return `<div class="${cls}" title="${nomeT(r.slug, r.nome)}: ${det}">
      <span class="t-pos">${r.pos}</span>
      <span class="t-team"><img src="${escT(r.slug)}" alt=""><b>${nomeT(r.slug, r.nome)}</b></span>
      <span class="t-pts">${r.pts}</span>
      <span class="t-j">${r.j}</span>
      <span class="t-sg">${r.sg > 0 ? "+" + r.sg : r.sg}</span>
    </div>`;
      })
      .join("");
  }

  // time sem escudo resolvido (ex.: "A definir" na final): só o nome
  const eq = (slug, alt) => (slug ? `<img src="${escT(slug)}" alt="">` : "") + `<b>${nomeT(slug, alt)}</b>`;

  function tiesHtml(ties) {
    if (!ties || !ties.length) return `<div class="empty">Chaveamento ainda não publicado.</div>`;
    return ties
      .map((t) => {
        const pernas = t.pernas
          .map((p, i) => {
            const rot = t.pernas.length > 1 ? (i === 0 ? "Ida" : "Volta") : "Jogo";
            return `<span class="kq-leg">${rot}: ${p.quando || "A definir"}${p.placar ? " • " + p.placar : ""}</span>`;
          })
          .join("");
        return `<div class="kq">
        <div class="kq-teams">
          <span class="kq-t">${eq(t.casa, t.casaNome)}</span>
          <em>×</em>
          <span class="kq-t">${eq(t.visitante, t.visitanteNome)}</span>
        </div>
        <div class="kq-legs">${pernas}</div>
      </div>`;
      })
      .join("");
  }

  /* ---------- fases e sub-abas (Todas / Grupos / Mata-mata / Fases iniciais) ---------- */
  const ehInicial = (f) => /-round$/.test(f.key || "");
  const temTies = (f) => f.ties && f.ties.length;
  const ehMata = (k, f) => !f.grupos && temTies(f) && (k !== "copa" || !ehInicial(f));

  function subsDe(k, fases) {
    if (k === "bras" || fases.length < 2) return [];
    const out = [{ id: "todas", nome: "Todas as fases" }];
    if (fases.some((f) => f.grupos && f.grupos.length)) out.push({ id: "grupos", nome: "Grupos" });
    if (fases.some((f) => ehMata(k, f))) out.push({ id: "mata", nome: "Mata-mata" });
    if (k === "copa" && fases.some((f) => ehInicial(f) && temTies(f))) out.push({ id: "iniciais", nome: "Fases iniciais" });
    return out;
  }

  function faseHtml(f) {
    let corpo;
    if (f.grupos && f.grupos.length) {
      const zonado = f.grupos.some((g) => g.rows.some((r) => r.zona));
      corpo =
        f.grupos
          .map((g) => `<div class="t-sub">${g.nome}</div>${COLS}${rowsHtml(g.rows)}`)
          .join("") +
        `<small class="t-upd">${zonado ? "Azul: classificados • " : ""}Fonte: ESPN</small>`;
    } else {
      corpo = tiesHtml(f.ties);
    }
    return `<details class="t-fase" open><summary class="t-sub">${f.nome}<i class="t-fn">${f.jogos} ${f.jogos === 1 ? "jogo" : "jogos"}</i></summary>${corpo}</details>`;
  }

  /* ---------- bracket visual (mata-mata) ---------- */
  const ehPotenciaDe2 = (n) => n > 0 && (n & (n - 1)) === 0;
  const tieAgg = (t) => {
    let c = 0, v = 0;
    (t.pernas || []).forEach((p) => {
      if (!p.placar) return;
      const parts = String(p.placar).split(/[–-]/).map((s) => parseInt(s.trim(), 10));
      if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) return;
      c += parts[0];
      v += parts[1];
    });
    return { c: c, v: v };
  };
  const ehFaseBracket = (f, prox) => {
    const n = f.ties ? f.ties.length : 0;
    if (!ehPotenciaDe2(n) || n > 8) return false;
    if (prox && prox.grupos) return false; // alimenta grupos: não é bracket
    return true;
  };
  const bTeam = (slug, nome, win, gols) => {
    const esc = slug ? `<img src="${escT(slug)}" alt="">` : "";
    const g = gols != null ? `<span class="bt-gols">${gols}</span>` : "";
    return `<div class="bt${win ? " bt-win" : ""}">${esc}<span>${nomeT(slug, nome)}</span>${g}</div>`;
  };
  const bMatch = (t) => {
    const agg = tieAgg(t);
    const win = agg.c > agg.v ? 0 : agg.v > agg.c ? 1 : -1;
    const legs = (t.pernas || [])
      .map((p, i) => {
        const rot = t.pernas.length > 1 ? (i === 0 ? "Ida" : "Volta") : "Jogo";
        return `<span>${rot}: ${p.quando || "A definir"}${p.placar ? " • " + p.placar : ""}</span>`;
      })
      .join("");
    return `<div class="bm">${bTeam(t.casa, t.casaNome, win === 0, agg.c)}${bTeam(t.visitante, t.visitanteNome, win === 1, agg.v)}<div class="bm-legs">${legs}</div></div>`;
  };
  const bracketHtml = (k, fases) => {
    const mata = fases.filter((f) => ehMata(k, f));
    const cols = [];
    const grid = [];
    mata.forEach((f, i) => {
      if (ehFaseBracket(f, mata[i + 1])) cols.push(f);
      else grid.push(f);
    });
    let h = "";
    if (grid.length) {
      h += `<div class="bgrid">` + grid.map((f) => `<div class="bgrid-fase"><h4 class="btitle">${f.nome}</h4><div class="bgrid-matches">` + f.ties.map(bMatch).join("") + `</div></div>`).join("") + `</div>`;
    }
    if (cols.length) {
      h += `<div class="bwrap"><div class="bbracket">`;
      cols.forEach((f) => {
        h += `<div class="bcol"><h4 class="btitle">${f.nome}</h4><div class="bcol-matches">` + f.ties.map(bMatch).join("") + `</div></div>`;
      });
      h += `</div><svg class="bsvg"></svg></div>`;
    }
    return h;
  };
  function drawBracketConnectors() {
    const svg = document.querySelector(".bsvg");
    const wrap = document.querySelector(".bwrap");
    if (!svg || !wrap) return;
    const wb = wrap.getBoundingClientRect();
    svg.setAttribute("viewBox", `0 0 ${wb.width} ${wb.height}`);
    svg.innerHTML = "";
    const cols = wrap.querySelectorAll(".bcol");
    for (let i = 0; i < cols.length - 1; i++) {
      const ms = cols[i].querySelectorAll(".bm");
      const nx = cols[i + 1].querySelectorAll(".bm");
      ms.forEach((m, j) => {
        const tgt = nx[Math.floor(j / 2)];
        if (!tgt) return;
        const mr = m.getBoundingClientRect();
        const tr = tgt.getBoundingClientRect();
        const x1 = mr.right - wb.left;
        const y1 = mr.top + mr.height / 2 - wb.top;
        const x2 = tr.left - wb.left;
        const y2 = tr.top + tr.height / 2 - wb.top;
        const mx = (x1 + x2) / 2;
        const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
        p.setAttribute("d", `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`);
        p.setAttribute("stroke", "rgba(255,255,255,0.14)");
        p.setAttribute("fill", "none");
        p.setAttribute("stroke-width", "2");
        svg.appendChild(p);
      });
    }
  }

  function conteudo(k) {
    const d = dados[k];
    if (k === "bras") {
      const meta = d.meta;
      const rodada = (meta && meta.rodada) || window.TABELA_RODADA || 28;
      const upd =
        meta && meta.atualizado
          ? `Atualizado em ${meta.atualizado} • Fonte: ${meta.fonte || "ESPN"}`
          : "Atualizado até os jogos de 20 de setembro de 2026 • Fonte: CBF";
      return `<div class="t-head-pill"><img src="${SECOES.bras.ico}" alt="">Brasileirão Série A • Rodada ${rodada}</div>
      ${COLS}${rowsHtml(d.rows || [])}
      <div class="t-legend">
        <span><i class="lib"></i>Libertadores</span>
        <span><i class="sula"></i>Sul-Americana</span>
        <span><i class="rebaix"></i>Rebaixamento</span>
      </div>
      <small class="t-upd">${upd}</small>`;
    }
    // copa / sula / carioca: fases + sub-abas
    const fases = d.fases || [];
    if (!fases.length) {
      if (d.erro) return `<div class="empty">Sem dados agora — tente de novo mais tarde.</div>`;
      if (d.carregando) return `<div class="empty">Carregando fases…</div>`;
      return "";
    }
    const subs = subsDe(k, fases);
    const sub = d.sub && subs.some((s) => s.id === d.sub) ? d.sub : "todas";
    let lista = fases;
    if (sub === "grupos") lista = fases.filter((f) => f.grupos && f.grupos.length);
    else if (sub === "mata") lista = fases.filter((f) => ehMata(k, f));
    else if (sub === "iniciais") lista = fases.filter((f) => ehInicial(f) && temTies(f));
    const pill = `<div class="t-head-pill"><img src="${SECOES[k].ico}" alt="">${SECOES[k].nome} • Fases</div>`;
    const chips =
      subs.length > 1
        ? `<div class="filters sub">` +
          subs
            .map(
              (s) =>
                `<button class="chip${s.id === sub ? " active" : ""}" data-sub="${s.id}">${s.nome}</button>`
            )
            .join("") +
          `</div>`
        : "";
    let corpo;
    if (sub === "mata") {
      corpo = bracketHtml(k, fases);
    } else {
      corpo = lista.length
        ? lista.map(faseHtml).join("")
        : `<div class="empty">Nada por aqui ainda.</div>`;
    }
    return pill + chips + corpo;
  }

  function pintar() {
    const chips = Object.keys(SECOES)
      .map(
        (k) =>
          `<button class="chip${k === atual ? " active" : ""}" data-t="${k}"><img src="${SECOES[k].ico}" alt="">${SECOES[k].nome}</button>`
      )
      .join("");
    el.innerHTML = `<div class="filters">${chips}</div>` + conteudo(atual);
    el.querySelectorAll("[data-t]").forEach((b) => (b.onclick = () => { atual = b.dataset.t; pintar(); }));
    el.querySelectorAll("[data-sub]").forEach(
      (b) => (b.onclick = () => { dados[atual].sub = b.dataset.sub; pintar(); })
    );
    drawBracketConnectors();
  }

  // API ao vivo chama estas duas
  window.renderTabela = (rows, meta) => {
    dados.bras = { rows: rows, meta: meta };
    if (atual === "bras") pintar();
  };
  window.renderTabelaOutra = (k, novo) => {
    const d = dados[k] || (dados[k] = {});
    Object.assign(d, novo);
    if (novo.fases || novo.erro) delete d.carregando;
    if (atual === k) pintar();
  };

  pintar();
  window.addEventListener("resize", drawBracketConnectors);
})().catch((e) => console.error("Falha ao carregar tabela:", e));
