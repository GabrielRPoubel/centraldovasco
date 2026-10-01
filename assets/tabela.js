(async function () {
  const el = document.getElementById("tabela");
  if (!el) return;
  let tabela = window.TABELA, clubes = window.CLUBES;
  if (!tabela) tabela = await (await fetch("assets/data/tabela.json")).json();
  if (!clubes) clubes = await (await fetch("assets/data/clubes.json")).json();
  const map = Object.fromEntries(clubes.map((c) => [c.slug, c]));
  const VASCO = "vasco-da-gama";

  const linhas = tabela.map((t) => {
    const c = map[t.slug] || {};
    const cls = ["t-row", t.zona ? "zona-" + t.zona : "", t.slug === VASCO ? "me" : ""].join(" ").trim();
    return `<div class="${cls}" title="${c.nome || t.slug}: ${t.pts} pts em ${t.j} jogos">
      <span class="t-pos">${t.pos}</span>
      <span class="t-team"><img src="${c.escudo}" alt=""><b>${c.nome || t.slug}</b></span>
      <span class="t-pts">${t.pts}</span>
      <span class="t-j">${t.j}</span>
      <span class="t-sg">${t.sg > 0 ? "+" + t.sg : t.sg}</span>
    </div>`;
  }).join("");

  el.innerHTML = `
    <div class="t-head-pill"><img src="assets/logos/competicoes/brasileirao-2026.svg" alt="">Brasileirão Série A • Rodada ${window.TABELA_RODADA || 28}</div>
    <div class="t-cols"><span>#</span><span>Time</span><span>P</span><span>J</span><span>SG</span></div>
    ${linhas}
    <div class="t-legend">
      <span><i class="lib"></i>Libertadores</span>
      <span><i class="sula"></i>Sul-Americana</span>
      <span><i class="rebaix"></i>Rebaixamento</span>
    </div>
    <small class="t-upd">Atualizado até os jogos de 20 de setembro de 2026 • Fonte: CBF</small>`;
})().catch((e) => console.error("Falha ao carregar tabela:", e));
