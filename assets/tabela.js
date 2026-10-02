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

  function tiesHtml(ties) {
    if (!ties || !ties.length)
      return `<div class="empty">Chaveamento ainda não publicado.</div>`;
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
          <span class="kq-t"><img src="${escT(t.casa)}" alt=""><b>${nomeT(t.casa)}</b></span>
          <em>×</em>
          <span class="kq-t"><img src="${escT(t.visitante)}" alt=""><b>${nomeT(t.visitante)}</b></span>
        </div>
        <div class="kq-legs">${pernas}</div>
      </div>`;
      })
      .join("");
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
    // extras: carioca / sula / copa
    const semNada = !d.grupos && !(d.ties && d.ties.length);
    if (semNada && d.erro) return `<div class="empty">Sem dados agora — tente de novo mais tarde.</div>`;
    if (semNada && d.carregando) return `<div class="empty">Carregando classificação…</div>`;
    let h = "";
    if (k === "copa") {
      h = `<div class="t-head-pill"><img src="${SECOES.copa.ico}" alt="">Copa do Brasil • Mata-mata</div>` + tiesHtml(d.ties);
    }
    if (k === "sula") {
      const g = d.grupos && d.grupos[0];
      h = `<div class="t-head-pill"><img src="${SECOES.sula.ico}" alt="">Sul-Americana${g ? " • " + g.nome : ""}</div>`;
      if (g) h += `${COLS}${rowsHtml(g.rows)}<small class="t-upd">Azul: classificados ao mata-mata • Fonte: ESPN</small>`;
      if (d.ties && d.ties.length) h += `<div class="t-sub">Mata-mata</div>` + tiesHtml(d.ties);
    }
    if (k === "carioca") {
      h = `<div class="t-head-pill"><img src="${SECOES.carioca.ico}" alt="">Carioca 2026 • Grupos (1ª fase)</div>`;
      if (d.grupos)
        h += d.grupos
          .map((gr) => `<div class="t-sub">${gr.nome}</div>${COLS}${rowsHtml(gr.rows)}`)
          .join("");
    }
    return h;
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
  }

  // API ao vivo chama estas duas
  window.renderTabela = (rows, meta) => {
    dados.bras = { rows: rows, meta: meta };
    if (atual === "bras") pintar();
  };
  window.renderTabelaOutra = (k, novo) => {
    const d = dados[k] || (dados[k] = {});
    Object.assign(d, novo);
    if (d.grupos || (d.ties && d.ties.length) || d.erro) delete d.carregando;
    if (atual === k) pintar();
  };

  pintar();
})().catch((e) => console.error("Falha ao carregar tabela:", e));
