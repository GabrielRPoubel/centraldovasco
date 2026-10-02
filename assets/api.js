/* Central do Vasco — dados em tempo real (ESPN) com cache e fallback estático.
   Fontes: site.api.espn.com (agendas/scoreboards) + sports.core.api.espn.com (tabela).
   Sem chave, CORS "*", tudo no navegador. Se falhar, os dados locais continuam no ar. */
(function () {
  const SITE = "https://site.api.espn.com/apis/site/v2/sports/soccer";
  const CORE =
    "https://sports.core.api.espn.com/v2/sports/soccer/leagues/bra.1/seasons/2026/types/1/groups/1/standings/0";
  const VASCO = "3454";
  const TZ = "America/Sao_Paulo";

  // id ESPN -> slug do banco de clubes (177 clubes das 4 ligas)
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
    "19002": "montevideo-city-torque", "10265": "bangu", "18134": "portuguesa-rj",
    "20855": "sampaio-correa-rj",
    "9965": "abc", "22487": "ae-velo-clube", "6196": "asa", "15562": "aguia-de-maraba",
    "18433": "altos", "21888": "amazonas", "6154": "america-mineiro", "131677": "america-se",
    "7634": "america-rn", "18424": "anapolis", "131670": "araguaiana", "20851": "athletic",
    "21550": "atletico-alagoinhas", "10357": "atletico-goianiense", "9966": "avai",
    "21384": "azuriz", "131671": "bare", "131708": "barra-fc", "22489": "betim-fc",
    "17317": "botafogo-pb", "19398": "bragantino-pa", "20699": "ceov-operario", "9970": "crb",
    "7531": "csa", "22190": "capital", "22557": "capital-cf", "19962": "castanhal-u20",
    "17131": "caxias-do-sul", "9969": "ceara", "6219": "ceilandia", "4909": "cianorte",
    "131672": "clube-laguna", "4875": "confianca", "17313": "cuiaba", "17326": "ferroviaria",
    "3461": "figueirense", "21401": "fluminense-pi", "6272": "fortaleza", "22189": "ga-sampaio",
    "18190": "galvez", "3395": "goias", "131674": "guapore", "3448": "guarani",
    "21369": "guarany-de-bage", "131684": "iape", "22193": "independente-ap", "22559": "independencia",
    "6214": "itabaiana", "18195": "ivinhema", "17713": "jacuipense", "22191": "ji-parana-fc",
    "13143": "joinville", "18191": "juazeirense", "6270": "juventude", "17332": "lagarto",
    "17333": "londrina", "131681": "maguary-pe", "22194": "manauara", "18959": "manaus",
    "22561": "maracana", "9303": "maranhao", "17715": "maringa", "15559": "mixto",
    "131682": "monte-roraima", "17325": "nacional-de-manaus", "18127": "novorizontino",
    "19400": "operario-ms", "18187": "operario-pr", "15557": "oratorio", "131685": "pantanal-corumba",
    "17710": "piaui-teresina", "3459": "ponte-preta", "131673": "porta-ba", "20897": "porto-velho",
    "131687": "porto-vitoria-fc", "4773": "portuguesa", "131679": "primavera-mg", "131564": "primavera-sp",
    "20896": "retro", "18198": "rio-branco-es", "131686": "sc-penedense", "6277": "se-gama",
    "131676": "santa-catarina", "4929": "santa-cruz", "131680": "serra-branca",
    "6195": "sociedade-imperatriz-de-desportos", "15561": "sousa-ec", "7635": "sport",
    "11268": "sao-bernardo", "7391": "sao-luiz-rs", "131678": "tirol", "18192": "tocantinopolis",
    "17339": "tombense", "21553": "trem", "21389": "tuna-luso", "9460": "uberlandia",
    "131683": "vasco-da-gama-ac", "9973": "vila-nova", "4935": "ypiranga",
    "18995": "academia-puerto-cabello", "5267": "alianza-atletico", "8109": "america-de-cali",
    "6137": "atletico-bucaramanga", "5264": "atletico-nacional", "6047": "blooming",
    "2681": "bolivar", "9999": "boston-river", "6037": "carabobo", "4811": "caracas-fc",
    "3372": "cienciano-del-cusco", "4133": "cobresal", "1007": "defensor-sporting",
    "4812": "deportivo-cuenca", "21819": "deportivo-garcilaso", "22517": "deportivo-recoleta",
    "17702": "deportivo-riestra", "9497": "guabira", "20889": "independiente-petrolero",
    "8416": "juventud", "12": "lanus", "21843": "libertad-ecuador", "18439": "macara",
    "7312": "melgar", "13481": "metropolitanos", "5484": "millonarios", "6041": "monagas-sc",
    "2684": "nacional", "5584": "nacional-asuncion", "6072": "o-higgins", "20695": "orense",
    "4422": "palestino", "9903": "racing-montevideo", "15": "racing-club", "16": "river-plate",
    "22137": "san-antonio-bulo-bulo", "18": "san-lorenzo", "2673": "sporting-cristal",
    "7466": "sportivo-trinidense", "7767": "tigre", "10094": "ucv-fc", "4139": "universidad-de-chile"
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
  async function pegar(url, chave, ttl, grava) {
    const hit = ler(chave, ttl);
    if (hit) return hit;
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 9000);
    try {
      const r = await fetch(url, { signal: ctrl.signal });
      clearTimeout(to);
      if (!r.ok) throw new Error("HTTP " + r.status);
      const d = await r.json();
      if (grava !== false) gravar(chave, d);
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

  /* ---------- evento ESPN -> jogo do site (soVasco=false: serve pras fases) ---------- */
  const nomeTime = (t) => {
    const n = (t && (t.displayName || t.name)) || "";
    return /tbd|definir/i.test(n) ? "A definir" : n || "A definir";
  };
  function paraJogo(e, comp, soVasco) {
    if (soVasco === undefined) soVasco = true;
    if (!e || !e.competitions || !e.competitions[0]) return null;
    const c = e.competitions[0];
    const h = c.competitors.find((x) => x.homeAway === "home");
    const a = c.competitors.find((x) => x.homeAway === "away");
    if (!h || !a) return null;
    const casa = IDS[h.team.id] || "";
    const visitante = IDS[a.team.id] || "";
    if (soVasco && casa !== "vasco-da-gama" && visitante !== "vasco-da-gama") return null; // só jogos do Vasco
    if (soVasco && (!casa || !visitante))
      console.info("[CV] time fora do banco (id):", h.team.id, a.team.id, h.team.displayName, "x", a.team.displayName);
    // status: agendas vêm sem description — detecta por state/abreviação, placar ou data passada
    const st = (e.status && e.status.type) || {};
    const state = (e.status && e.status.state) || "";
    const desc = st.description || "";
    const temPlacar =
      !!(h.score && (h.score.displayValue || h.score)) &&
      !!(a.score && (a.score.displayValue || a.score));
    const ehAoVivo = state === "in" || st.abbreviation === "I" || /progress|half|period/i.test(desc);
    const fim =
      state === "post" ||
      st.abbreviation === "F" ||
      /final|ft\b|full time/i.test(desc) ||
      (temPlacar && !ehAoVivo) || // jogo com placar no placar é encerrado (não vale p/ ao vivo)
      (!state && !desc && new Date(e.date).getTime() + 72e5 < Date.now());
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
    if (!casa) g.casaNome = nomeTime(h.team);
    if (!visitante) g.visitanteNome = nomeTime(a.team);
    if (fim) {
      g.gc = parseInt(h.score && (h.score.displayValue || h.score), 10) || 0;
      g.gv = parseInt(a.score && (a.score.displayValue || a.score), 10) || 0;
    }
    if (ehAoVivo) g.aoVivo = true;
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

  /* ---------- confrontos do mata-mata (ida/volta), montados por fase ---------- */
  function montarMata(events) {
    const por = new Map();
    for (const m of events) {
      const k = [(m.casa || m.casaNome || "?"), (m.visitante || m.visitanteNome || "?")].sort().join("x");
      if (!por.has(k)) por.set(k, []);
      por.get(k).push(m);
    }
    const ties = [];
    por.forEach((lista) => {
      lista.sort((a, b) => ((a.data || "9999") < (b.data || "9999") ? -1 : 1));
      const par = [lista[0].casa, lista[0].visitante];
      ties.push({
        casa: par[0], visitante: par[1],
        casaNome: lista[0].casaNome || "", visitanteNome: lista[0].visitanteNome || "",
        ordem: lista[0].data || "9999",
        pernas: lista.map((m) => ({
          quando: m.quando,
          data: m.data,
          placar: m.status === "encerrado" ? (m.casa === par[0] ? m.gc + "–" + m.gv : m.gv + "–" + m.gc) : ""
        }))
      });
    });
    ties.sort((a, b) => (a.ordem < b.ordem ? -1 : 1));
    return ties;
  }

  /* ---------- classificações em grupos (Sula e Carioca) ---------- */
  const CORE0 = "https://sports.core.api.espn.com/v2/sports/soccer/leagues";
  const httpsDo = (u) => String(u).replace(/^http:/, "https:");
  // segue a cadeia grupo -> /standings -> /standings/0 até achar o array de entradas
  async function standDe(url, chaveCache) {
    let obj = await pegar(httpsDo(url), chaveCache, 15 * 60000);
    for (let i = 0; i < 3 && obj; i++) {
      if (Array.isArray(obj.standings)) return obj.standings;
      const ref = (obj.standings && obj.standings.$ref) || (obj.items && obj.items[0] && obj.items[0].$ref);
      if (!ref) return null;
      obj = await pegar(httpsDo(ref), chaveCache + ":" + i, 15 * 60000);
    }
    return obj && Array.isArray(obj.standings) ? obj.standings : null;
  }
  function linhasDe(entries) {
    return entries
      .map((r, i) => {
        const ref = (r.team && (r.team.$ref || r.team.uid)) || "";
        const id = (String(ref).match(/\/teams\/(\d+)/) || [])[1] || "";
        const st = {};
        ((r.records && r.records[0] && r.records[0].stats) || []).forEach((s) => (st[s.name] = s.value));
        return {
          pos: Math.round(st.rank || i + 1), slug: IDS[id] || "",
          nome: (r.team && r.team.displayName) || "",
          pts: Math.round(st.points || 0), j: Math.round(st.gamesPlayed || 0),
          v: Math.round(st.wins || 0), e: Math.round(st.ties || 0), d: Math.round(st.losses || 0),
          sg: Math.round(st.pointDifferential || 0), adv: !!st.advanced
        };
      })
      .sort((a, b) => a.pos - b.pos);
  }
  /* ---------- fases da temporada inteira: eventos -> fases, tabelas e chaves ---------- */
  const slugify = (s) =>
    String(s).toLowerCase().trim().replace(/\s+/g, "-").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const ROT = {
    "first-stage": "Fase Preliminar",
    "group-stage": "Fase de Grupos",
    "knockout-round-playoffs": "Playoffs",
    "round-of-16": "Oitavas de final",
    "quarterfinals": "Quartas de final",
    "semifinals": "Semifinais",
    "final": "Final",
    "first-round": "Primeira Rodada",
    "second-round": "Segunda Rodada",
    "third-round": "Terceira Rodada",
    "fourth-round": "Quarta Rodada",
    "fifth-round": "Quinta Rodada",
    "taca-guanabara": "Taça Guanabara",
    "taca-guanabara---quarterfinals": "Taça Guanabara • Quartas",
    "taca-guanabara---semifinals": "Taça Guanabara • Semifinais",
    "taca-guanabara---final": "Taça Guanabara • Final",
    "taca-rio---semifinals": "Taça Rio • Semifinais",
    "taca-rio---final": "Taça Rio • Final",
    "relegation-stage": "Fase de Permanência",
    "outras": "Outras partidas"
  };
  const nomeFase = (slug) =>
    ROT[slug] || slug.split("-").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");

  // temporada inteira da liga em 1 pedido, já normalizada (fase vem embutida no evento)
  async function temporada(liga) {
    const chave = "ano:" + liga;
    const hit = ler(chave, 30 * 60000);
    if (hit) return hit;
    let bruto;
    try {
      bruto = await pegar(SITE + "/" + liga + "/scoreboard?dates=2026&limit=250", "anoraw:" + liga, 30 * 60000, false);
    } catch (e) {
      const v = velho(chave);
      if (v) return v;
      throw e;
    }
    const jogos = (bruto.events || [])
      .map((e) => {
        const g = paraJogo(e, AGENDAS[liga], false);
        if (g) g.fase = (e.season && e.season.slug) || "";
        return g;
      })
      .filter(Boolean);
    if (!jogos.length) {
      const v = velho(chave);
      if (v) return v;
      throw new Error("temporada vazia");
    }
    gravar(chave, jogos);
    return jogos;
  }

  // classificação de uma fase: types/N/groups -> cadeia standDe -> linhas
  async function tabelasDoTipo(liga, tipo) {
    const base = CORE0 + "/" + liga + "/seasons/2026/types/" + tipo.id;
    const gl = await pegar(base + "/groups?page=1&pageSize=50", "tg:" + liga + ":" + tipo.id, 30 * 60000);
    const grupos = [];
    let i = 0;
    for (const it of (gl && gl.items) || []) {
      if (!it.$ref) continue;
      const k = liga + ":" + tipo.id + ":" + i++;
      const g = await pegar(httpsDo(it.$ref), "tgr:" + k, 30 * 60000);
      const sref = g.standings && (g.standings.$ref || g.standings);
      if (!sref) continue;
      const entries = await standDe(sref, "tgs:" + k);
      if (!entries || !entries.length) continue;
      grupos.push({
        nome: String(g.name || "Grupo").replace(/^Group/, "Grupo"),
        rows: linhasDe(entries).map((r) =>
          // Sula: 1º vai direto às oitavas, 2º aos playoffs — os dois classificados (azul)
          r.adv || (liga === "conmebol.sudamericana" && r.pos <= 2)
            ? Object.assign({}, r, { zona: "sula" })
            : r
        )
      });
    }
    if (!grupos.length) throw new Error("sem grupos");
    return grupos;
  }
  // só fases com tabela valem a cadeia de pedidos; chaves (round/quartas/semis/final) são puladas
  async function gruposDoLiga(liga) {
    if (liga === "bra.copa_do_brazil") return {}; // copa: tudo é chave
    let t;
    try {
      t = await pegar(CORE0 + "/" + liga + "/seasons/2026/types?page=1&pageSize=50", "types:" + liga, 30 * 60000);
    } catch (e) {
      return {};
    }
    const out = {};
    for (const it of (t && t.items) || []) {
      if (!it || !it.$ref) continue;
      const tid = (String(it.$ref).match(/\/types\/(\d+)/) || [])[1] || it.$ref;
      let tipo;
      try {
        tipo = await pegar(httpsDo(it.$ref), "tipo:" + liga + ":" + tid, 30 * 60000);
      } catch (e) {
        continue;
      }
      const nome = String((tipo && tipo.name) || "");
      if (!nome) continue;
      if (/round|quarterfinal|semifinal|final|playoffs/i.test(nome)) continue;
      try {
        out[slugify(nome)] = await tabelasDoTipo(liga, tipo);
      } catch (e) {}
    }
    return out;
  }
  // fases = eventos agrupados por season.slug + tabelas quando existem; grupos primeiro, o resto por data
  async function carregarFases(liga) {
    const jogos = await temporada(liga);
    const tabs = await gruposDoLiga(liga);
    const por = new Map();
    jogos.forEach((g) => {
      const k = g.fase || "outras";
      if (!por.has(k)) por.set(k, []);
      por.get(k).push(g);
    });
    const fases = [];
    por.forEach((lista, key) => {
      const grupos = tabs[key];
      if (!grupos && /group/.test(key)) return; // fase de grupos sem tabela não vira "confrontos"
      fases.push({
        key: key,
        nome: nomeFase(key),
        jogos: lista.length,
        ordem: grupos ? "0000" : lista.reduce((m, g) => (g.data && g.data < m ? g.data : m), "9999"),
        grupos: grupos || null,
        ties: grupos ? [] : montarMata(lista)
      });
    });
    fases.sort((a, b) => (a.ordem < b.ordem ? -1 : a.ordem > b.ordem ? 1 : 0));
    return fases;
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
        // garantia de resultado: se a API veio 0–0 mas o estático tem placar, adota o do estático
        if (s.gc != null && s.gv != null && (s.gc !== 0 || s.gv !== 0) && a.gc === 0 && a.gv === 0) {
          a.gc = s.gc;
          a.gv = s.gv;
        }
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
      if (window.renderJogos && window.renderTabela && window.renderTabelaOutra) return rodar();
      if (++esperas > 30) return;
      setTimeout(espera, 200);
    })();
  }
  function rodar() {
    carregarTabela().catch((e) => console.info("[CV] tabela ao vivo indisponível, mantendo local:", e.message));
    const FASES = { copa: "bra.copa_do_brazil", sula: "conmebol.sudamericana", carioca: "bra.camp.carioca" };
    Object.keys(FASES).forEach((sec) =>
      carregarFases(FASES[sec])
        .then((fases) => window.renderTabelaOutra(sec, { fases: fases }))
        .catch((e) => {
          window.renderTabelaOutra(sec, { erro: true });
          console.info("[CV] fases de " + sec + " indisponíveis:", e.message);
        })
    );
    carregarJogos()
      .then((jogos) => {
        const est = window.JOGOS || [];
        const finais = mesclar(est, jogos);
        window.renderJogos(finais);
        const vivo = finais.some((g) => g.aoVivo);
        const pill = document.getElementById("livePill");
        if (pill) pill.style.display = vivo ? "" : "none";
        console.info("[CV] ao vivo: " + jogos.length + " jogos da API, " + finais.length + " exibidos");
      })
      .catch((e) => console.info("[CV] jogos ao vivo indisponíveis, mantendo locais:", e.message));
  }
  iniciar();
})();
