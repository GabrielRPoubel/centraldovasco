(async function () {
  const el = document.getElementById("tabela");
  if (!el) return;
  let tabela = window.TABELA, clubes = window.CLUBES;
  if (!tabela) tabela = await (await fetch("assets/data/tabela.json")).json();
  if (!clubes) clubes = await (await fetch("assets/data/clubes.json")).json();
  const map = Object.fromEntries(clubes.map((c) => [c.slug, c]));
  const VASCO = "vasco-da-gama";

  function pintar(t, meta) {
    const linhas = t
      .map((r) => {
        const c = map[r.slug] || {};
        const cls = ["t-row", r.zona ? "zona-" + r.zona : "", r.slug === VASCO ? "me" : ""].join(" ").trim();
        const det = r.v != null ? `${r.pts} pts • ${r.j}j ${r.v}V ${r.e}E ${r.d}D` : `${r.pts} pts em ${r.j} jogos`;
        return `<div class="${cls}" title="${c.nome || r.slug}: ${det}">
      <span class="t-pos">${r.pos}</span>
      <span class="t-team"><img src="${c.escudo || "assets/logos/times/_default.svg"}" alt=""><b>${c.nome || r.slug}</b></span>
      <span class="t-pts">${r.pts}</span>
      <span class="t-j">${r.j}</span>
      <span class="t-sg">${r.sg > 0 ? "+" + r.sg : r.sg}</span>
    </div>`;
      })
      .join("");
    const rodada = (meta && meta.rodada) || window.TABELA_RODADA || 28;
    const upd =
      meta && meta.atualizado
        ? `Atualizado em ${meta.atualizado} • Fonte: ${meta.fonte || "ESPN"}`
        : "Atualizado até os jogos de 20 de setembro de 2026 • Fonte: CBF";
    el.innerHTML = `
    <div class="t-head-pill"><img src="assets/logos/competicoes/brasileirao-2026.svg" alt="">Brasileirão Série A • Rodada ${rodada}</div>
    <div class="t-cols"><span>#</span><span>Time</span><span>P</span><span>J</span><span>SG</span></div>
    ${linhas}
    <div class="t-legend">
      <span><i class="lib"></i>Libertadores</span>
      <span><i class="sula"></i>Sul-Americana</span>
      <span><i class="rebaix"></i>Rebaixamento</span>
    </div>
    <small class="t-upd">${upd}</small>`;
  }

  window.renderTabela = pintar;
  pintar(tabela, null);
})().catch((e) => console.error("Falha ao carregar tabela:", e));
