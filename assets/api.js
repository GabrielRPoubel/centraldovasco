/* Central do Vasco — dados em tempo real (ESPN) com cache e fallback estático.
   Fontes: site.api.espn.com (agendas/scoreboards) + sports.core.api.espn.com (tabela).
   Sem chave, CORS "*", tudo no navegador. Se falhar, os dados locais continuam no ar. */
(function () {
  const SITE = "https://site.api.espn.com/apis/site/v2/sports/soccer";
  const CORE =
    "https://sports.core.api.espn.com/v2/sports/soccer/leagues/bra.1/seasons/2026/types/1/groups/1/standings/0";
  const VASCO = "3454";
  const TZ = "America/Sao_Paulo";

  // id ESPN -> slug do banco de clubes
  const IDS = {
    "3454": "vasco-da-gama", "819": "flamengo", "3445": "fluminense", "6086": "botafogo",
    "3458": "athletico-paranaense", "7632": "atletico-mineiro", "9967": "bahia",
    "9318": "chapecoense", "874": "corinthians", "3456": "coritiba", "2022": "cruzeiro",
    "6273": "gremio", "1936": "internacional", "9169": "mirassol", "2029": "palmeiras",
    "6079": "red-bull-bragantino", "4936": "remo", "2674": "santos", "2026": "sao-paulo",
    "3457": "vitoria", "900": "boavista-rj", "4786": "madureira", "21387": "marica",
    "6087": "nova-iguacu", "4806": "volta-redonda", "2675": "olimpia",
    "4138": "audax-italiano", "10060": "barracas-central", "2690": "independiente-medellin",
    "15424": "paysandu", "5": "boca-juniors", "5488": "independiente-santa-fe",
    "19002": "montevideo-city-torque"
  };

  const AGENDAS = {
    "bra.1": "brasileirao",
    "bra.copa_do_brazil": "copa-do-brasil",
    "bra.camp.carioca": "carioca",
    "conmebol.sudamericana": "sul-americana"
  };
  const FUTUROS = ["bra.1", "bra.copa_do_brazil", "conmebol.sudamericana"]; // carioca já acabou

  /* ---------- cache (sessionStorage + TTL, com cache vencido como rede de segurança) ---------- */
  function ler(chave, ttl) {
    try {
      const b = JSON.parse(sessionStorage.getItem("cv:" + chave));
      if (b && Date.now() - b.t < ttl) return b.d;
    } catch (e) {}
    return null;
  }
  function velho(chave) {
    try {
      const b = JSON.parse(sessionStorage.getItem("cv:" + chave));
      return b ? b.d : null;
    } catch (e) {
      return null;
    }
  }
  function gravar(chave, d) {
    try {
      sessionStorage.setItem("cv:" + chave, JSON.stringify({ t: Date.now(), d: d }));
    } catch (e) {}
  }
  async function pegar(url, chave, ttl) {
    const hit = ler(chave, ttl);
    if (hit) return hit;
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 9000);
    try {
      const r = await fetch(url, { signal: ctrl.signal });
      clearTimeout(to);
      if (!r.ok) throw new Error("HTTP " + r.status);
      const d = await r.json();
      gravar(chave, d);
      return d;
    } catch (e) {
      clearTimeout(to);
      const v = velho(chave);
      if (v) return v;
      throw e;
    }
  }

  /* ---------- datas em horário de Brasília ---------- */
  function partes(iso) {
    const o = {};
    new Intl.DateTimeFormat("pt-BR", {
      timeZone: TZ, weekday: "short", day: "2-digit", month: "short",
      hour: "2-digit", minute: "2-digit", hour12: false
    })
      .formatToParts(new Date(iso))
      .forEach((p) => (o[p.type] = p.value));
    return o;
  }
  const dataBRT = (iso) => new Date(iso).toLocaleDateString("sv-SE", { timeZone: TZ });
  function quando(iso) {
    const p = partes(iso);
    const d = p.day + " " + String(p.month || "").replace(/\./g, "").toUpperCase();
    let h = p.hour === "24" ? "00" : p.hour;
    return h && p.minute && h !== "--" ? d + " • " + h + ":" + p.minute : d;
  }
  // ESPN aceita só AAAAMM (sem hífen)
  const ymAtual = () => new Date().toLocaleDateString("sv-SE", { timeZone: TZ }).slice(0, 7).replace(/-/g, "");
  function ymSeguinte(ym) {
    const y = Number(ym.slice(0, 4));
    const m = Number(ym.slice(4, 6));
    return new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 7).replace(/-/g, "");
  }

  /* ---------- evento ESPN -> jogo do site ---------- */
  function paraJogo(e, comp) {
    if (!e || !e.competitions || !e.competitions[0]) return null;
    const c = e.competitions[0];
    const h = c.competitors.find((x) => x.homeAway === "home");
    const a = c.competitors.find((x) => x.homeAway === "away");
    if (!h || !a) return null;
    const casa = IDS[h.team.id] || "";
    const visitante = IDS[a.team.id] || "";
    if (casa !== "vasco-da-gama" && visitante !== "vasco-da-gama") return null; // só jogos do Vasco
    if (!casa || !visitante) console.info("[CV] time fora do banco (id):", h.team.id, a.team.id, h.team.displayName, "x", a.team.displayName);
    // status: agendas vêm sem description — detecta por state/abreviação ou data passada
    const st = (e.status && e.status.type) || {};
    const state = (e.status && e.status.state) || "";
    const desc = st.description || "";
    const fim =
      state === "post" ||
      st.abbreviation === "F" ||
      /final/i.test(desc) ||
      (!state && !desc && new Date(e.date).getTime() + 72e5 < Date.now());
    const vivo = state === "in" || st.abbreviation === "I" || /progress|half|period/i.test(desc);
    const g = {
      comp: comp,
      casa: casa,
      visitante: visitante,
      data: dataBRT(e.date),
      quando: quando(e.date),
      approx: false,
      status: fim ? "encerrado" : "pendente",
      local: (c.venue && c.venue.fullName) || "",
      fase: "",
      obs: ""
    };
    if (fim) {
      g.gc = parseInt(h.score && h.score.displayValue, 10) || 0;
      g.gv = parseInt(a.score && a.score.displayValue, 10) || 0;
    }
    if (vivo) g.aoVivo = true;
    const notas = (c.notes || []).map((n) => n.headline).filter(Boolean).join(" • ");
    if (notas) {
      let o = /1st/i.test(notas) ? "Jogo de ida" : /2nd/i.test(notas) ? "Volta" : notas;
      if (/tied on aggregate/i.test(notas)) o += " • agregado empatado";
      g.obs = o;
    }
    return g;
  }

  /* ---------- tabela ---------- */
  async function carregarTabela() {
    const d = await pegar(CORE, "standings", 10 * 60000);
    const linhas = [];
    (d.standings || []).forEach((linha, i) => {
      const ref = (linha.team && (linha.team.$ref || linha.team.uid)) || "";
      const id = (String(ref).match(/\/teams\/(\d+)/) || [])[1] || "";
      const slug = IDS[id];
      if (!slug) return;
      const st = {};
      const stats = linha.records && linha.records[0] && linha.records[0].stats;
      (stats || []).forEach((s) => (st[s.name] = s.value));
      const pos = i + 1;
      linhas.push({
        pos: pos, slug: slug,
        pts: Math.round(st.points || 0), j: Math.round(st.gamesPlayed || 0),
        v: Math.round(st.wins || 0), e: Math.round(st.ties || 0), d: Math.round(st.losses || 0),
        gp: Math.round(st.pointsFor || 0), gc: Math.round(st.pointsAgainst || 0),
        sg: Math.round(st.pointDifferential || 0),
        zona: pos <= 5 ? "lib" : pos === 6 ? "sula" : pos >= 17 ? "rebaix" : ""
      });
    });
    if (linhas.length < 10) throw new Error("tabela incompleta");
    const rodada = Math.max.apply(null, linhas.map((l) => l.j));
    const agora = new Intl.DateTimeFormat("pt-BR", {
      timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
    }).format(new Date());
    if (window.renderTabela) window.renderTabela(linhas, { rodada: rodada, atualizado: agora, fonte: "ESPN" });
  }

  /* ---------- jogos: agendas passadas + boards do mês ---------- */
  async function carregarJogos() {
    const jogos = [];
    const vistos = new Set();
    const add = (e, comp) => {
      if (!e || vistos.has(e.id)) return;
      vistos.add(e.id);
      const g = paraJogo(e, comp);
      if (g) jogos.push(g);
    };
    // agendas (jogos encerrados, com placar)
    for (const liga of Object.keys(AGENDAS)) {
      try {
        const d = await pegar(SITE + "/" + liga + "/teams/" + VASCO + "/schedule?season=2026", "sched:" + liga, 30 * 60000);
        (d.events || []).forEach((e) => add(e, AGENDAS[liga]));
      } catch (e) {}
    }
    // futuros: mês atual e seguintes até cobrir a temporada (máx. 3 meses, até dez/2026)
    const hoje = new Date().toLocaleDateString("sv-SE", { timeZone: TZ });
    for (const liga of FUTUROS) {
      let ym = ymAtual();
      for (let m = 0; m < 3 && ym <= "202612"; m++) {
        try {
          const d = await pegar(SITE + "/" + liga + "/scoreboard?dates=" + ym, "board:" + liga + ":" + ym, 15 * 60000);
          (d.events || []).forEach((e) => add(e, AGENDAS[liga]));
        } catch (e) {}
        const futuros = jogos.filter((g) => g.status === "pendente" && g.data >= hoje && g.comp === AGENDAS[liga]).length;
        if (futuros >= 12) break;
        ym = ymSeguinte(ym);
      }
    }
    return jogos;
  }

  /* ---------- merge: API manda em data/placar/status; estático preenche fase/obs/pen ---------- */
  const chave = (g) =>
    g.comp + "|" + [g.casa, g.visitante].slice().sort().join("x") + "|" + (g.status === "encerrado" ? "fim" : "prox");
  function dias(a, b) {
    return Math.abs(new Date(a + "T12:00:00") - new Date(b + "T12:00:00")) / 86400000;
  }
  function mesclar(est, api) {
    const idx = new Map();
    api.forEach((a, i) => {
      const k = chave(a);
      if (!idx.has(k)) idx.set(k, []);
      idx.get(k).push(i);
    });
    const usados = new Set();
    const out = api.slice();
    for (const s of est) {
      const fila = idx.get(chave(s));
      let alvo = -1;
      if (fila) {
        for (const i of fila) {
          if (usados.has(i)) continue;
          if (s.data && api[i].data && dias(s.data, api[i].data) > 20) continue;
          alvo = i;
          break;
        }
      }
      if (alvo >= 0) {
        usados.add(alvo);
        const a = out[alvo];
        // o estático é curado (fase, obs com agregado/goleada, pênaltis): ele manda — inclusive limpo
        if (s.fase && s.fase !== "Rodada a definir") a.fase = s.fase;
        a.obs = s.obs || "";
        if (s.pen) a.pen = s.pen;
        if (s.local && !a.local) a.local = s.local;
      } else {
        out.push(s); // estático sem par na API (ex.: datas ainda não publicadas)
      }
    }
    return out;
  }

  /* ---------- orquestração ---------- */
  function iniciar() {
    let esperas = 0;
    (function espera() {
      if (window.renderJogos && window.renderTabela) return rodar();
      if (++esperas > 30) return;
      setTimeout(espera, 200);
    })();
  }
  function rodar() {
    carregarTabela().catch((e) => console.info("[CV] tabela ao vivo indisponível, mantendo local:", e.message));
    carregarJogos()
      .then((api) => {
        const est = window.JOGOS || [];
        const finais = mesclar(est, api);
        window.renderJogos(finais);
        const vivo = finais.some((g) => g.aoVivo);
        const pill = document.getElementById("livePill");
        if (pill) pill.style.display = vivo ? "" : "none";
        console.info("[CV] ao vivo: " + api.length + " jogos da API, " + finais.length + " exibidos");
      })
      .catch((e) => console.info("[CV] jogos ao vivo indisponíveis, mantendo locais:", e.message));
  }
  iniciar();
})();
