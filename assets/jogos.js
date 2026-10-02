const COMPS = {
  carioca: { nome: "Carioca 2026", ico: "assets/logos/competicoes/carioca-2026.svg" },
  brasileirao: { nome: "Brasileirão", ico: "assets/logos/competicoes/brasileirao-2026.svg" },
  "copa-do-brasil": { nome: "Copa do Brasil", ico: "assets/logos/competicoes/copa-do-brasil-2026.svg" },
  "sul-americana": { nome: "Sul-Americana", ico: "assets/logos/competicoes/sul-americana-2026.svg" },
};
const DIA = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
const VASCO = "vasco-da-gama";

(async function () {
  let clubes = window.CLUBES, jogos = window.JOGOS;
  if (!clubes) clubes = await (await fetch("assets/data/clubes.json")).json();
  if (!jogos) jogos = await (await fetch("assets/data/jogos.json")).json();

  const map = Object.fromEntries(clubes.map((c) => [c.slug, c]));
  const nome = (s) => (map[s] && map[s].nome) || s || "?";
  const escudo = (s) => (map[s] && map[s].escudo) || "assets/logos/times/_default.svg";
  const dia = (g) => (g.data ? DIA[new Date(g.data + "T12:00:00").getDay()] : "");
  const res = (g) => {
    const vc = g.casa === VASCO ? g.gc : g.gv;
    const vv = g.casa === VASCO ? g.gv : g.gc;
    return vc > vv ? "v" : vc < vv ? "d" : "e";
  };
  const letra = (r) => (r === "v" ? "V" : r === "e" ? "E" : "D");

  function dateBlock(g) {
    if (!g.quando) return `<span class="date tbd">A DEFINIR</span>`;
    const l2 =
      g.status === "encerrado" ? "FIM" : g.data ? dia(g) + (g.approx ? " • PREV" : "") : "";
    return `<span class="date">${g.quando}${l2 ? "<br>" + l2 : ""}</span>`;
  }

  function titleLine(g) {
    const cN = nome(g.casa), vN = nome(g.visitante);
    const eu = (s) => (s === VASCO ? ' class="eu"' : "");
    if (g.status === "encerrado") {
      const pen = g.pen ? ` <em>(${g.pen} p)</em>` : "";
      const placar = g.gc != null && g.gv != null ? `${g.gc}–${g.gv}` : "–";
      return `<strong><b${eu(g.casa)}>${cN}</b><b class="g-placar">${placar}</b><b${eu(g.visitante)}>${vN}</b>${pen}</strong>`;
    }
    return `<strong><b${eu(g.casa)}>${cN}</b> <em>×</em> <b${eu(g.visitante)}>${vN}</b></strong>`;
  }

  function row(g) {
    const cls = g.status === "encerrado" ? "f " + res(g) : "";
    const cp = COMPS[g.comp] || { nome: g.comp, ico: "" };
    const meta = `${cp.nome}${g.fase ? " • " + g.fase : ""}${g.obs ? ` <em class="obs">${g.obs}</em>` : ""}`;
    return `<div class="game ${cls}" title="${g.local || ""}">
      <div class="g-teams">
        <img class="g-esc" src="${escudo(g.casa)}" alt="" loading="lazy">
        <img class="g-esc" src="${escudo(g.visitante)}" alt="" loading="lazy">
        <div class="g-txt">${titleLine(g)}<small><img class="g-ico" src="${cp.ico}" alt="">${meta}</small></div>
      </div>
      ${dateBlock(g)}
    </div>`;
  }

  let filtro = "todos";
  let abertos = false;

  function renderFilters() {
    const el = document.getElementById("filters");
    if (!el) return;
    const keys = ["todos"].concat(Object.keys(COMPS));
    el.innerHTML = keys
      .map(
        (k) =>
          `<button class="chip${filtro === k ? " active" : ""}" data-f="${k}">${
            k === "todos" ? "Todos" : `<img src="${COMPS[k].ico}" alt="">${COMPS[k].nome}`
          }</button>`
      )
      .join("");
    el.querySelectorAll(".chip").forEach(
      (b) => (b.onclick = () => { filtro = b.dataset.f; abertos = false; renderFilters(); renderList(); })
    );
  }

  function renderList() {
    const up = document.getElementById("jogos-up");
    const down = document.getElementById("jogos-down");
    if (!up || !down) return;
    const passa = (g) => filtro === "todos" || g.comp === filtro;
    const pend = jogos
      .filter((g) => g.status === "pendente" && passa(g))
      .sort((a, b) => ((a.data || "9999") < (b.data || "9999") ? -1 : 1));
    const fim = jogos
      .filter((g) => g.status === "encerrado" && passa(g))
      .sort((a, b) => ((a.data || "0000") < (b.data || "0000") ? 1 : -1));
    // próximos: mostra só os5 primeiros (por data) + "Ver todos"
    const mostra = abertos ? pend : pend.slice(0, 5);
    const btn =
      pend.length > 5
        ? `<button class="btn more" id="verTodos">${abertos ? "Mostrar menos" : `Ver todos os ${pend.length} jogos`}</button>`
        : "";
    up.innerHTML = pend.length
      ? `<h4 class="sec-title">Próximos jogos</h4>` + mostra.map(row).join("") + btn
      : `<div class="empty">Nenhum jogo pendente nesta competição.</div>`;
    const bt = document.getElementById("verTodos");
    if (bt) bt.onclick = () => { abertos = !abertos; renderList(); };
    down.innerHTML = fim.length
      ? `<h4 class="sec-title">Resultados 2026</h4>` + fim.map(row).join("")
      : `<div class="empty">Nenhum resultado nesta competição.</div>`;
  }

  function renderHero() {
    const hero = document.getElementById("hero");
    if (!hero) return;
    const prox = jogos
      .filter((g) => g.status === "pendente" && g.data)
      .sort((a, b) => (a.data < b.data ? -1 : 1))[0];
    if (!prox) return;
    const recentes = jogos
      .filter((g) => g.status === "encerrado" && g.data)
      .sort((a, b) => (a.data > b.data ? -1 : 1))
      .slice(0, 5)
      .reverse();
    const form = recentes
      .map((g) => { const r = res(g); return `<i class="fd ${r}">${letra(r)}</i>`; })
      .join("");
    const comp = COMPS[prox.comp] || { nome: prox.comp, ico: "" };
    const quando = `${prox.data ? dia(prox) + ", " : ""}${prox.quando}${prox.approx ? " • PREV." : ""}`;
    hero.innerHTML = `
      <div class="hero-top">
        <span class="pill"><img class="pill-ico" src="${comp.ico}" alt="">${comp.nome}${prox.fase ? " • " + prox.fase : ""}</span>
        <span class="pill">${quando}</span>
      </div>
      <div class="teams">
        <div class="team"><div class="shield"><img src="${escudo(prox.casa)}" alt=""></div><strong>${nome(prox.casa)}</strong><small>Casa</small></div>
        <div class="placar"><div class="gols vs">×</div><small>${prox.local || "A definir"}</small></div>
        <div class="team"><div class="shield"><img src="${escudo(prox.visitante)}" alt=""></div><strong>${nome(prox.visitante)}</strong><small>Fora</small></div>
      </div>
      <div class="hero-form"><span>Últimos 5</span><div class="form-dots">${form}</div></div>
      <div class="hero-actions">
        <button class="btn primary">Prévia do jogo</button>
        <button class="btn">Chaveamento</button>
        <button class="btn">Campanha</button>
      </div>`;
  }

  window.renderJogos = (novos) => {
    if (novos) jogos = novos;
    renderFilters();
    renderList();
    renderHero();
  };
  window.renderJogos();
})().catch((e) => console.error("Falha ao carregar jogos:", e));
