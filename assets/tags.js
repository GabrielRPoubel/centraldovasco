async function renderTags(targetId, basePath = "") {
  const clubes = window.CLUBES || await (await fetch(basePath + "assets/data/clubes.json")).json();
  const el = document.getElementById(targetId);
  el.innerHTML = clubes.map((c) =>
    `<span class="club-tag" data-slug="${c.slug}"><img src="${basePath + c.escudo}" alt="${c.nome}" loading="lazy"><b>${c.tag}</b><small>${c.nome}</small></span>`
  ).join("");
}
