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
    const corpo = lista.length
      ? lista.map(faseHtml).join("")
      : `<div class="empty">Nada por aqui ainda.</div>`;
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
})().catch((e) => console.error("Falha ao carregar tabela:", e));
