import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Bell,
  Home as HomeIcon,
  Church,
  Home,
  CalendarDays,
  HeartHandshake,
  Users,
  Wallet,
  Settings,
  LogOut,
  ArrowRight,
  Plus,
  Check,
  Menu,
  X,
  ChevronRight,
  Megaphone,
  ClipboardList,
  MapPin,
  ShieldCheck,
  Download,
  RefreshCw,
} from "lucide-react";
import { supabase as db } from "./supabase";
import type { Session } from "@supabase/supabase-js";
import "./style.css";
import { Dove, MoreView, HomeView, Feed, ChurchView, tabs } from "./community";
import "./family.css";
type Row = Record<string, any>;
const roles: Row = {
  member: "Participante",
  leader: "Líder",
  finance: "Financeiro",
  pastor: "Pastor",
  admin: "Administrador",
};
const kinds: Row = {
  visitante: "Visitante",
  novo_membro: "Membro novo",
  membro: "Membro",
};
const money = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const date = (v: string) =>
  new Date(v.length === 10 ? v + "T12:00:00" : v).toLocaleString(
    "pt-BR",
    v.length === 10
      ? { dateStyle: "medium" }
      : { dateStyle: "medium", timeStyle: "short" },
  );
const today = () => new Date().toLocaleDateString("en-CA");
function err(e: any) {
  const m = e?.message || "Não foi possível concluir. Tente novamente.";
  return /Invalid login/.test(m)
    ? "E-mail ou senha incorretos."
    : /Email not confirmed/.test(m)
      ? "Confirme seu e-mail antes de entrar."
      : /rate limit|security purposes/i.test(m)
        ? "Aguarde um pouco antes de tentar novamente."
        : /fetch|network/i.test(m)
          ? "Não conseguimos conectar. Confira sua internet e tente novamente."
          : /foreign key constraint/i.test(m)
            ? "Este registro está em uso. Remova os vínculos antes de excluir."
            : /duplicate key/i.test(m)
              ? "Já existe um registro com esses dados."
              : m;
}
async function result(q: any) {
  const r = await q;
  if (r.error) throw r.error;
  return r.data;
}
function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark">
        <Dove />
      </span>
      <span>
        Graça<span className="brand-sync">Sync</span>
      </span>
    </div>
  );
}
function Field({ label, children }: any) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
function Empty({ children }: any) {
  return (
    <div className="empty">
      <HeartHandshake size={32} />
      <p>{children}</p>
    </div>
  );
}
function App() {
  const currentUser = useRef<string | null>(null),
    generation = useRef(0);
  const [session, setSession] = useState<Session | null>(null),
    [authReady, setAuthReady] = useState(false),
    [profile, setProfile] = useState<Row | null>(null),
    [dev, setDev] = useState(false),
    [church, setChurch] = useState<Row | null>(null),
    [churches, setChurches] = useState<Row[]>([]),
    [context, setContext] = useState(""),
    [page, setPage] = useState("home"),
    [data, setData] = useState<Record<string, Row[]>>({}),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [modal, setModal] = useState<{ table: string; row?: Row } | null>(null),
    [mobile, setMobile] = useState(false),
    [recovery, setRecovery] = useState(false),
    [large, setLarge] = useState(
      localStorage.getItem("graca-large") === "true",
    ),
    [online, setOnline] = useState(navigator.onLine),
    [install, setInstall] = useState<any>(null);
  const admin = dev || ["admin", "pastor"].includes(profile?.role),
    manager = admin || profile?.role === "leader",
    finance = admin || profile?.role === "finance";
  const cid = dev ? context || profile?.church_id : profile?.church_id;
  useEffect(() => {
    db.auth.getSession().then(({ data, error }) => {
      if (error) setError(err(error));
      currentUser.current = data.session?.user.id || null;
      setSession(data.session);
      setAuthReady(true);
    });
    const { data } = db.auth.onAuthStateChange((event, s) => {
      if (currentUser.current !== (s?.user.id || null)) generation.current++;
      currentUser.current = s?.user.id || null;
      setSession(s);
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      if (!s) {
        setProfile(null);
        setChurch(null);
        setData({});
        setContext("");
        setDev(false);
        setModal(null);
        setChurches([]);
      }
    });
    const off = () => setOnline(navigator.onLine);
    const prompt = (e: Event) => {
      e.preventDefault();
      setInstall(e);
    };
    window.addEventListener("online", off);
    window.addEventListener("offline", off);
    window.addEventListener("beforeinstallprompt", prompt);
    return () => {
      data.subscription.unsubscribe();
      window.removeEventListener("online", off);
      window.removeEventListener("offline", off);
      window.removeEventListener("beforeinstallprompt", prompt);
    };
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("large-text", large);
    localStorage.setItem("graca-large", String(large));
  }, [large]);
  async function identity() {
    if (!session) return;
    await result(db.rpc("bootstrap"));
    const [p, d] = await Promise.all([
      result(
        db.from("profiles").select("*").eq("id", session.user.id).single(),
      ),
      result(db.rpc("is_dev")),
    ]);
    const list = d
      ? await result(db.from("churches").select("*").order("name"))
      : [];
    if (currentUser.current !== session.user.id) return;
    setProfile(p);
    setDev(d);
    setChurches(list);
  }
  useEffect(() => {
    if (session) {
      setLoading(true);
      identity()
        .catch((e) => setError(err(e)))
        .finally(() => setLoading(false));
    }
  }, [session?.user.id]);
  async function load() {
    if (!cid) return;
    const request = ++generation.current;
    setLoading(true);
    try {
      const c = await result(
        db.from("churches").select("*").eq("id", cid).single(),
      );

      const tables = [
        "announcements",
        "events",
        "ministries",
        "cells",
        "tasks",
        "event_responses",
        "prayer_requests",
        ...(manager ? ["profiles"] : []),
        ...(finance ? ["finance_entries", "audit_log"] : []),
      ];
      const entries = await Promise.all(
        tables.map(async (t) => {
          const all: Row[] = [];
          let offset = 0;
          do {
            const batch = await result(
              db
                .from(t)
                .select("*")
                .eq("church_id", cid)
                .order(t === "event_responses" ? "event_id" : "created_at", {
                  ascending: false,
                })
                .order(t === "event_responses" ? "user_id" : "id", {
                  ascending: false,
                })
                .range(offset, offset + 999),
            );
            all.push(...batch);
            offset += batch.length;
            if (t !== "finance_entries" || batch.length < 1000) break;
          } while (true);
          return [t, all];
        }),
      );
      if (request !== generation.current) return;
      setChurch(c);
      setData(Object.fromEntries(entries));
    } catch (e) {
      if (request === generation.current) setError(err(e));
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }
  useEffect(() => {
    if (profile) load();
    return () => {
      generation.current++;
    };
  }, [cid, profile?.role, dev]);
  useEffect(() => {
    setPage("home");
    setModal(null);
    setData({});
    setChurch(null);
  }, [cid]);
  async function act(
    fn: () => Promise<any>,
    message = "Pronto! Alteração salva.",
  ) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
      setNotice(message);
    } catch (e) {
      setError(err(e));
    } finally {
      setBusy(false);
    }
  }
  const rows = (t: string) => data[t] || [];
  const changePage = (p: string) => {
    setPage(p);
    setMobile(false);
    setNotice("");
    setError("");
    window.scrollTo(0, 0);
  };
  const mutate = async (t: string, payload: Row, id?: string) => {
    await result(
      id
        ? db.from(t).update(payload).eq("id", id).eq("church_id", cid)
        : db.from(t).insert({ ...payload, church_id: cid }),
    );
    setModal(null);
    await load();
  };
  const remove = async (t: string, row: Row) => {
    if (
      !window.confirm(
        `Excluir “${row.title || row.name || row.description}”? Esta ação não pode ser desfeita.`,
      )
    )
      return;
    await act(async () => {
      await result(db.from(t).delete().eq("id", row.id).eq("church_id", cid));
      await load();
    });
  };
  const actions = (t: string, row: Row) => (
    <div className="row-actions">
      <button className="text-btn" onClick={() => setModal({ table: t, row })}>
        Editar
      </button>
      <button
        className="text-btn danger"
        disabled={busy}
        onClick={() => remove(t, row)}
      >
        Excluir
      </button>
    </div>
  );
  const banners = (
    <>
      {!online && (
        <div className="alert">
          Você está sem internet. Reconecte para consultar e salvar dados.
        </div>
      )}
      {error && (
        <div className="alert error" role="alert">
          {error}
          <button className="text-btn" onClick={() => setError("")}>
            Fechar
          </button>
        </div>
      )}
      {notice && (
        <div className="alert success" role="status">
          {notice}
        </div>
      )}
    </>
  );
  if (!authReady)
    return (
      <div className="loading-screen">
        <Brand />
        <p>Preparando seu espaço…</p>
      </div>
    );
  if (!session || recovery)
    return (
      <div className="auth-layout">
        <aside className="auth-story">
          <Brand />
          <div>
            <span className="eyebrow">FÉ QUE NOS APROXIMA</span>
            <h1>
              Juntos, somos
              <br />
              mais igreja.
            </h1>
            <p>Um lugar para se conectar, servir e cuidar da sua comunidade.</p>
            <div className="story-line" />
            <span>Comunidade · Voluntariado · Gestão</span>
          </div>
          <small>Parte da família Sync</small>
        </aside>
        <main className="auth-main">
          <div className="auth-mobile-brand">
            <Brand />
          </div>
          {banners}
          <Auth
            recovery={recovery}
            busy={busy}
            act={act}
            onRecovered={() => setRecovery(false)}
          />
          <button
            className="text-btn size-button"
            onClick={() => setLarge(!large)}
          >
            {large ? "Usar letras padrão" : "Aumentar letras"}
          </button>
        </main>
      </div>
    );
  if (!profile)
    return (
      <main className="loading-screen">
        <Brand />
        {banners}
        <p>
          {loading
            ? "Carregando sua conta…"
            : "Não foi possível abrir sua conta."}
        </p>
        <button onClick={() => act(identity, "Conta carregada.")}>
          Tentar novamente
        </button>
        <button className="secondary" onClick={() => db.auth.signOut()}>
          Sair
        </button>
      </main>
    );
  const devSelect = dev && (
    <Field label="DEV · Igreja em atendimento">
      <select value={cid || ""} onChange={(e) => setContext(e.target.value)}>
        <option value="">Selecione uma igreja</option>
        {churches.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </Field>
  );
  if (!cid)
    return (
      <main className="onboarding">
        <Brand />
        {banners}
        {devSelect}
        <Onboarding profile={profile} busy={busy} act={act} done={identity} />
        <button className="text-btn" onClick={() => db.auth.signOut()}>
          Sair da conta
        </button>
      </main>
    );
  const nav: [string, string, typeof Home][] = [
    ["home", "Início", Home],
    ["events", "Agenda", CalendarDays],
    ["ministries", "Ministérios", HeartHandshake],
    ["tasks", "Voluntariado", ClipboardList],
    ["cells", "Células", MapPin],
  ];
  if (manager) nav.push(["people", "Pessoas", Users]);
  if (finance) nav.push(["finance", "Financeiro", Wallet]);
  nav.push(["settings", "Minha conta", Settings]);
  const title: Row = {
    home: "Você faz parte desta família.",
    more: "Mais",
    church: "Minha igreja",
    community: "Nossa comunidade",
    prayers: "Pedidos de oração",
    help: "Como podemos ajudar?",
    accessibility: "Acessibilidade",
    events: "Agenda da igreja",
    ministries: "Encontre seu lugar para servir",
    tasks: manager ? "Organize o voluntariado" : "Meu voluntariado",
    cells: "A igreja mais perto de você",
    people: "Pessoas da comunidade",
    finance: "Financeiro da igreja",
    settings: "Minha conta e igreja",
  };
  const nextEvents = rows("events")
    .filter((r) => new Date(r.starts_at) >= new Date())
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  return (
    <div className="app-shell">
      <a href="#content" className="skip">
        Ir para o conteúdo
      </a>
      <div className="workspace">
        <header className="family-header">
          <Brand />
          <button
            className="icon-btn"
            aria-label="Ver avisos da igreja"
            onClick={() => changePage("community")}
          >
            <Bell size={24} />
          </button>
        </header>
        <main id="content" tabIndex={-1}>
          {page !== "home" && (
            <div className="page-heading">
              <div>
                <span className="eyebrow page-breadcrumb">
                  {page === "home"
                    ? `OLÁ, ${profile.full_name.split(" ")[0].toUpperCase()}`
                    : "GRAÇASYNC / " +
                      nav.find((n) => n[0] === page)?.[1].toUpperCase()}
                </span>
                <h1>{title[page]}</h1>
              </div>
              {page !== "more" && (
                <button
                  className="icon-btn"
                  aria-label="Atualizar dados"
                  disabled={loading}
                  onClick={() => act(load, "Dados atualizados.")}
                >
                  <RefreshCw size={20} className={loading ? "spinning" : ""} />
                </button>
              )}
            </div>
          )}
          {banners}
          {loading && <p role="status">Atualizando informações…</p>}
          {page === "home" && (
            <HomeView
              profile={profile}
              church={church}
              nextEvents={nextEvents}
              announcements={rows("announcements")}
              manager={manager}
              go={changePage}
              actions={actions}
            />
          )}
          {page === "more" && (
            <MoreView
              profile={profile}
              church={church}
              manager={manager}
              finance={finance}
              admin={admin}
              dev={dev}
              go={changePage}
              logout={() =>
                act(async () => {
                  await result(db.auth.signOut());
                }, "")
              }
            />
          )}
          {page === "church" && <ChurchView church={church} go={changePage} />}
          {page === "community" && (
            <Feed
              announcements={rows("announcements")}
              church={church}
              manager={manager}
              actions={actions}
              add={() => setModal({ table: "announcements" })}
            />
          )}
          {page === "prayers" && (
            <>
              <Section
                title="Vamos orar juntos"
                can
                add={() => setModal({ table: "prayer_requests" })}
              />
              <p className="helper">
                Seu pedido é privado: somente você, pastores e administradores
                da sua igreja podem ler.
              </p>
              {rows("prayer_requests").length ? (
                rows("prayer_requests").map((r) => (
                  <article className="feed-post" key={r.id}>
                    <h3>{r.title}</h3>
                    <p className="prewrap">{r.body}</p>
                    <small>{date(r.created_at)}</small>
                    {(r.user_id === profile.id || admin) && (
                      <button
                        className="text-btn danger"
                        disabled={busy}
                        onClick={() => remove("prayer_requests", r)}
                      >
                        Excluir pedido
                      </button>
                    )}
                  </article>
                ))
              ) : (
                <Empty>
                  Compartilhe seu pedido de oração com a liderança da sua
                  igreja.
                </Empty>
              )}
            </>
          )}
          {page === "accessibility" && (
            <section className="accessibility-page">
              <h2>Uma leitura confortável para você</h2>
              <p>
                Ajuste o tamanho das letras. Sua preferência fica salva neste
                aparelho.
              </p>
              <button
                className="secondary"
                aria-pressed={large}
                onClick={() => setLarge(!large)}
              >
                {large ? "Usar letras padrão" : "Aumentar letras"}
              </button>
              <div className="reading-sample">
                <h3>Você faz parte desta família.</h3>
                <p>
                  Um lugar para se conectar, servir e cuidar da sua comunidade.
                </p>
              </div>
            </section>
          )}
          {page === "help" && (
            <section className="help-page">
              <details open>
                <summary>Como participar de um ministério?</summary>
                <p>
                  Abra Servir e escolha Quero participar. A entrada é
                  automática. Você pode participar de um único ministério por
                  vez.
                </p>
              </details>
              <details>
                <summary>Onde vejo minhas atividades?</summary>
                <p>
                  Em Mais → Minhas atividades. Você pode marcar como concluídas
                  as tarefas atribuídas a você.
                </p>
              </details>
              <details>
                <summary>Como aumentar as letras?</summary>
                <p>Em Mais → Acessibilidade, toque em Aumentar letras.</p>
              </details>
              <details>
                <summary>Como instalar o aplicativo?</summary>
                <p>
                  No Android, use Instalar aplicativo no menu do navegador. No
                  iPhone, abra no Safari, toque em Compartilhar e Adicionar à
                  Tela de Início.
                </p>
              </details>
              <p className="helper">
                Para dúvidas sobre sua comunidade ou seus cargos, procure a
                liderança da sua igreja.
              </p>
            </section>
          )}
          {page === "events" && (
            <>
              <Section
                title="Encontros e celebrações"
                can={manager}
                add={() => setModal({ table: "events" })}
              />
              {!rows("events").length ? (
                <Empty>Nenhum evento cadastrado.</Empty>
              ) : (
                <div className="card-grid">
                  {[...rows("events")]
                    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
                    .map((e) => {
                      const joined = rows("event_responses").some(
                        (r) => r.event_id === e.id && r.user_id === profile.id,
                      );
                      return (
                        <article className="content-card" key={e.id}>
                          <span className="eyebrow">
                            {new Date(e.starts_at) < new Date()
                              ? "REALIZADO"
                              : "ENCONTRO"}
                          </span>
                          <h2>{e.title}</h2>
                          <p className="prewrap">{e.description}</p>
                          <p>
                            <CalendarDays size={18} />
                            {date(e.starts_at)}
                          </p>
                          {e.location && (
                            <p>
                              <MapPin size={18} />
                              {e.location}
                            </p>
                          )}
                          {new Date(e.starts_at) >= new Date() && (
                            <button
                              className={joined ? "secondary" : ""}
                              disabled={busy}
                              onClick={() =>
                                act(
                                  async () => {
                                    await result(
                                      joined
                                        ? db
                                            .from("event_responses")
                                            .delete()
                                            .eq("event_id", e.id)
                                            .eq("user_id", profile.id)
                                        : db.from("event_responses").insert({
                                            event_id: e.id,
                                            user_id: profile.id,
                                            church_id: cid,
                                          }),
                                    );
                                    await load();
                                  },
                                  joined
                                    ? "Presença cancelada."
                                    : "Presença confirmada!",
                                )
                              }
                            >
                              {joined ? (
                                <>
                                  <Check size={18} />
                                  Confirmado · Cancelar
                                </>
                              ) : (
                                "Confirmar presença"
                              )}
                            </button>
                          )}
                          {manager && actions("events", e)}
                        </article>
                      );
                    })}
                </div>
              )}
            </>
          )}
          {page === "ministries" && (
            <>
              <Section
                title="Ministérios"
                can={manager}
                add={() => setModal({ table: "ministries" })}
              />
              <p className="helper">
                Você pode participar de um ministério. Ao escolher outro, o
                vínculo anterior é substituído automaticamente.
              </p>
              {!rows("ministries").length ? (
                <Empty>A liderança ainda não cadastrou ministérios.</Empty>
              ) : (
                <div className="card-grid">
                  {rows("ministries").map((m) => (
                    <article
                      className={
                        "content-card " +
                        (profile.ministry_id === m.id ? "selected-card" : "")
                      }
                      key={m.id}
                    >
                      <HeartHandshake size={28} />
                      <h2>{m.name}</h2>
                      <p className="prewrap">
                        {m.description || "Faça parte desta equipe."}
                      </p>
                      <button
                        className={
                          profile.ministry_id === m.id ? "secondary" : ""
                        }
                        disabled={busy || profile.church_id !== cid}
                        onClick={() =>
                          act(
                            async () => {
                              if (
                                profile.ministry_id &&
                                profile.ministry_id !== m.id &&
                                !confirm(
                                  "Trocar seu ministério atual por " +
                                    m.name +
                                    "?",
                                )
                              )
                                return;
                              await result(
                                db.rpc("join_ministry", {
                                  mid:
                                    profile.ministry_id === m.id ? null : m.id,
                                }),
                              );
                              await identity();
                            },
                            profile.ministry_id === m.id
                              ? "Você saiu do ministério."
                              : "Pronto! Você faz parte deste ministério.",
                          )
                        }
                      >
                        {profile.ministry_id === m.id
                          ? "Meu ministério · Sair"
                          : "Quero participar"}
                      </button>
                      {manager && actions("ministries", m)}
                    </article>
                  ))}
                </div>
              )}
            </>
          )}
          {page === "tasks" && (
            <>
              <Section
                title={manager ? "Atividades da equipe" : "Minhas atividades"}
                can={manager}
                add={() => setModal({ table: "tasks" })}
              />
              {!rows("tasks").length ? (
                <Empty>
                  Nenhuma atividade por aqui. Quando uma tarefa for atribuída a
                  você, ela aparecerá nesta página.
                </Empty>
              ) : (
                rows("tasks").map((t) => (
                  <article className="task-row" key={t.id}>
                    <button
                      className={
                        "task-check " + (t.status === "done" ? "done" : "")
                      }
                      disabled={busy}
                      aria-label={
                        (t.status === "done" ? "Reabrir" : "Concluir") +
                        " " +
                        t.title
                      }
                      onClick={() =>
                        act(async () => {
                          await result(db.rpc("complete_task", { tid: t.id }));
                          await load();
                        })
                      }
                    >
                      {t.status === "done" && <Check />}
                    </button>
                    <div>
                      <h3>{t.title}</h3>
                      <p>{t.description}</p>
                      <small>
                        {date(t.due_date)} ·{" "}
                        {t.status === "done" ? "Concluída" : "Pendente"}
                        {manager &&
                          " · " +
                            (rows("profiles").find(
                              (p) => p.id === t.assigned_to,
                            )?.full_name || "Sem responsável")}
                      </small>
                    </div>
                    {manager && actions("tasks", t)}
                  </article>
                ))
              )}
            </>
          )}
          {page === "cells" && (
            <>
              <Section
                title="Encontros em comunidade"
                can={manager}
                add={() => setModal({ table: "cells" })}
              />
              {!rows("cells").length ? (
                <Empty>As células da igreja aparecerão aqui.</Empty>
              ) : (
                <div className="card-grid">
                  {rows("cells").map((c) => (
                    <article className="content-card" key={c.id}>
                      <MapPin size={27} />
                      <h2>{c.name}</h2>
                      <p className="prewrap">{c.description}</p>
                      <p>{c.meeting_time}</p>
                      <p>{c.location}</p>
                      {manager && actions("cells", c)}
                    </article>
                  ))}
                </div>
              )}
            </>
          )}
          {page === "people" && manager && (
            <People
              people={rows("profiles")}
              ministries={rows("ministries")}
              admin={admin}
              busy={busy}
              act={act}
              refresh={async () => {
                await identity();
                await load();
              }}
            />
          )}
          {page === "finance" && finance && (
            <Finance
              entries={rows("finance_entries")}
              audit={rows("audit_log")}
              add={() => setModal({ table: "finance_entries" })}
              actions={actions}
            />
          )}
          {page === "settings" && (
            <div className="settings-grid">
              <section className="panel">
                <h2>Meus dados</h2>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    act(async () => {
                      await result(
                        db.rpc("update_profile", {
                          person_name: f.get("name"),
                          kind: f.get("kind"),
                        }),
                      );
                      await identity();
                    });
                  }}
                >
                  <Field label="Nome completo">
                    <input
                      name="name"
                      required
                      minLength={2}
                      maxLength={100}
                      defaultValue={profile.full_name}
                    />
                  </Field>
                  <Field label="Minha participação">
                    <select name="kind" defaultValue={profile.member_type}>
                      {Object.entries(kinds).map(([v, l]) => (
                        <option key={v} value={v}>
                          {String(l)}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <p>{session.user.email}</p>
                  <p>
                    Acesso: <strong>{dev ? "DEV" : roles[profile.role]}</strong>
                  </p>
                  <button disabled={busy}>Salvar meus dados</button>
                </form>
                <button className="text-btn" onClick={() => setLarge(!large)}>
                  {large
                    ? "Voltar ao tamanho padrão"
                    : "Aumentar tamanho das letras"}
                </button>
                {install && (
                  <button
                    className="secondary"
                    onClick={async () => {
                      await install.prompt();
                      setInstall(null);
                    }}
                  >
                    <Download size={18} />
                    Instalar aplicativo
                  </button>
                )}
                <p className="helper">
                  Para instalar no iPhone: abra no Safari, toque em Compartilhar
                  e em Adicionar à Tela de Início.
                </p>
              </section>
              <section className="panel">
                <h2>Minha igreja</h2>
                {devSelect}
                {admin && church ? (
                  <form
                    key={church.id}
                    onSubmit={(e) => {
                      e.preventDefault();
                      const f = Object.fromEntries(
                        new FormData(e.currentTarget),
                      );
                      act(async () => {
                        await result(
                          db.from("churches").update(f).eq("id", cid),
                        );
                        await load();
                      });
                    }}
                  >
                    <Field label="Nome da igreja">
                      <input
                        name="name"
                        defaultValue={church.name}
                        required
                        minLength={2}
                        maxLength={120}
                      />
                    </Field>
                    <Field label="Cidade">
                      <input name="city" defaultValue={church.city} />
                    </Field>
                    <Field label="Endereço">
                      <input name="address" defaultValue={church.address} />
                    </Field>
                    <Field label="Mensagem de boas-vindas">
                      <textarea name="welcome" defaultValue={church.welcome} />
                    </Field>
                    <button disabled={busy}>Salvar igreja</button>
                  </form>
                ) : (
                  <p>
                    {church?.name}
                    <br />
                    {church?.address}
                    <br />
                    {church?.city}
                  </p>
                )}
                <div className="invite">
                  <h3>Convide sua comunidade</h3>
                  <p>
                    Compartilhe este código para as pessoas entrarem na igreja.
                  </p>
                  <code>{church?.invite_code}</code>
                  <button
                    className="text-btn"
                    onClick={() =>
                      act(async () => {
                        await navigator.clipboard.writeText(
                          church?.invite_code || "",
                        );
                      }, "Código copiado!")
                    }
                  >
                    Copiar código
                  </button>
                </div>
              </section>
            </div>
          )}
        </main>
      </div>
      <nav className="bottom-nav" aria-label="Navegação principal">
        {tabs.map(([p, label, Icon]) => {
          const active =
            page === p ||
            (p === "ministries" && page === "tasks") ||
            (p === "more" &&
              !["home", "church", "ministries", "tasks", "community"].includes(
                page,
              ));
          const TabIcon = p === "home" ? HomeIcon : Icon;
          return (
            <button
              key={p}
              aria-current={active ? "page" : undefined}
              className={active ? "selected" : ""}
              onClick={() => changePage(p)}
            >
              <TabIcon size={23} strokeWidth={1.6} />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>
      {modal && (
        <Editor
          key={modal.table + (modal.row?.id || "")}
          table={modal.table}
          row={modal.row}
          ministries={rows("ministries")}
          people={rows("profiles")}
          error={error}
          busy={busy}
          close={() => setModal(null)}
          save={(payload: Row) =>
            act(() => mutate(modal.table, payload, modal.row?.id))
          }
        />
      )}
    </div>
  );
}
function Auth({ recovery, busy, act, onRecovered }: any) {
  const [mode, setMode] = useState("login"),
    [sent, setSent] = useState(false);
  return (
    <section className="auth-form">
      <span className="eyebrow">BEM-VINDO AO GRAÇASYNC</span>
      <h1>
        {recovery
          ? "Escolha uma nova senha"
          : mode === "signup"
            ? "Sua comunidade começa aqui."
            : mode === "reset"
              ? "Vamos recuperar seu acesso."
              : "Que bom ter você aqui."}
      </h1>
      <p>
        {mode === "signup"
          ? "Crie sua conta para participar ou cadastrar sua igreja."
          : mode === "reset"
            ? "Informe seu e-mail para receber as instruções."
            : "Entre para acompanhar a vida da sua igreja."}
      </p>
      {sent && (
        <div className="alert success" role="status">
          Confira seu e-mail, inclusive a caixa de spam. Depois da confirmação,
          volte aqui para entrar.
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget),
            email = String(f.get("email")),
            password = String(f.get("password"));
          act(
            async () => {
              if (recovery) {
                await result(db.auth.updateUser({ password }));
                onRecovered();
              } else if (mode === "login")
                await result(db.auth.signInWithPassword({ email, password }));
              else if (mode === "signup") {
                const d = await result(
                  db.auth.signUp({
                    email,
                    password,
                    options: {
                      data: { full_name: f.get("name") },
                      emailRedirectTo: location.origin,
                    },
                  }),
                );
                if (!d.session) setSent(true);
              } else {
                await result(
                  db.auth.resetPasswordForEmail(email, {
                    redirectTo: location.origin,
                  }),
                );
                setSent(true);
              }
            },
            recovery ? "Senha atualizada." : "",
          );
        }}
      >
        {mode === "signup" && !recovery && (
          <Field label="Como você se chama?">
            <input
              name="name"
              autoComplete="name"
              required
              minLength={2}
              maxLength={100}
              placeholder="Seu nome completo"
            />
          </Field>
        )}
        {!recovery && (
          <Field label="Seu e-mail">
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="voce@exemplo.com"
            />
          </Field>
        )}
        {(recovery || mode !== "reset") && (
          <Field label={recovery ? "Nova senha" : "Sua senha"}>
            <input
              name="password"
              type="password"
              autoComplete={
                mode === "login" && !recovery
                  ? "current-password"
                  : "new-password"
              }
              required
              minLength={8}
              placeholder="Pelo menos 8 caracteres"
            />
          </Field>
        )}
        <button className="full" disabled={busy}>
          {busy
            ? "Aguarde…"
            : recovery
              ? "Salvar nova senha"
              : mode === "login"
                ? "Entrar na minha conta"
                : mode === "signup"
                  ? "Criar minha conta"
                  : "Enviar instruções"}
          <ArrowRight size={18} />
        </button>
      </form>
      {!recovery && (
        <>
          <button
            className="text-btn"
            onClick={() => {
              setMode(mode === "reset" ? "login" : "reset");
              setSent(false);
            }}
          >
            {mode === "reset" ? "Voltar para entrar" : "Esqueci minha senha"}
          </button>
          <div className="auth-divider" />
          <p>
            {mode === "signup" ? "Já tem uma conta?" : "Primeira vez por aqui?"}{" "}
            <button
              className="text-btn"
              onClick={() => {
                setMode(mode === "signup" ? "login" : "signup");
                setSent(false);
              }}
            >
              {mode === "signup" ? "Entrar" : "Criar conta"}
            </button>
          </p>
        </>
      )}
      <small className="muted">
        Cada conta participa de uma igreja. Seus dados ficam separados de outras
        comunidades.
      </small>
    </section>
  );
}
function Onboarding({ profile, busy, act, done }: any) {
  const [mode, setMode] = useState("join");
  return (
    <section className="panel onboarding-panel">
      <span className="eyebrow">SEU PRIMEIRO PASSO</span>
      <h1>Vamos encontrar sua comunidade.</h1>
      <div className="segmented">
        <button
          className={mode === "join" ? "selected" : ""}
          onClick={() => setMode("join")}
        >
          Participar de uma igreja
        </button>
        <button
          className={mode === "create" ? "selected" : ""}
          onClick={() => setMode("create")}
        >
          Cadastrar minha igreja
        </button>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          act(async () => {
            await result(
              db.rpc("onboard", {
                mode,
                church_name: f.get("church") || "",
                code: f.get("code") || "",
                person_name: f.get("name"),
                kind: f.get("kind"),
              }),
            );
            await done();
          }, "Bem-vindo à sua igreja!");
        }}
      >
        <Field label="Seu nome completo">
          <input
            name="name"
            required
            minLength={2}
            maxLength={100}
            defaultValue={profile.full_name}
          />
        </Field>
        {mode === "join" ? (
          <Field label="Código da igreja">
            <input
              name="code"
              autoCapitalize="characters"
              required
              placeholder="Peça o código à sua igreja"
              maxLength={32}
            />
          </Field>
        ) : (
          <Field label="Nome da sua igreja">
            <input
              name="church"
              required
              minLength={2}
              maxLength={120}
              placeholder="Ex.: Comunidade da Graça"
            />
          </Field>
        )}
        <Field label="Como você participa?">
          <select name="kind">
            {Object.entries(kinds).map(([v, l]) => (
              <option key={v} value={v}>
                {String(l)}
              </option>
            ))}
          </select>
        </Field>
        <p className="helper">
          {mode === "create"
            ? "Você será o administrador e poderá organizar a equipe da sua igreja."
            : "Ao entrar, sua conta ficará vinculada somente a esta igreja."}
        </p>
        <button disabled={busy} className="full">
          {busy
            ? "Preparando…"
            : mode === "create"
              ? "Criar espaço da minha igreja"
              : "Entrar na igreja"}
          <ArrowRight size={18} />
        </button>
      </form>
    </section>
  );
}
function Section({ title, can, add }: any) {
  return (
    <div className="section-heading">
      <h2>{title}</h2>
      {can && (
        <button onClick={add}>
          <Plus size={18} />
          Adicionar
        </button>
      )}
    </div>
  );
}
function People({ people, ministries, admin, busy, act, refresh }: any) {
  const [search, setSearch] = useState("");
  return (
    <>
      <Field label="Encontrar uma pessoa">
        <input
          type="search"
          placeholder="Pesquisar pelo nome"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </Field>
      <p className="helper">
        Entrar em um ministério é livre. Os cargos abaixo definem os acessos
        administrativos.
      </p>
      <div className="people-list">
        {people
          .filter((p: Row) =>
            p.full_name.toLowerCase().includes(search.toLowerCase()),
          )
          .map((p: Row) => (
            <article className="person-row" key={p.id}>
              <span className="avatar">{p.full_name.charAt(0)}</span>
              <div>
                <h3>{p.full_name}</h3>
                <p>
                  {kinds[p.member_type]} ·{" "}
                  {ministries.find((m: Row) => m.id === p.ministry_id)?.name ||
                    "Sem ministério"}
                </p>
              </div>
              {admin ? (
                <Field label={"Cargo de " + p.full_name}>
                  <select
                    aria-label={"Cargo de " + p.full_name}
                    value={p.role}
                    disabled={busy}
                    onChange={(e) => {
                      const role = e.target.value;
                      if (
                        confirm(
                          "Alterar o cargo de " +
                            p.full_name +
                            " para " +
                            roles[role] +
                            "?",
                        )
                      )
                        act(async () => {
                          await result(
                            db.rpc("set_role", { uid: p.id, new_role: role }),
                          );
                          await refresh();
                        });
                    }}
                  >
                    {Object.entries(roles).map(([v, l]) => (
                      <option key={v} value={v}>
                        {String(l)}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : (
                <span>{roles[p.role]}</span>
              )}
            </article>
          ))}
        {!people.length && <Empty>Nenhuma pessoa encontrada.</Empty>}
      </div>
    </>
  );
}
function Finance({ entries, audit, add, actions }: any) {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)),
    [history, setHistory] = useState(false);
  const filtered = entries.filter((r: Row) => r.entry_date.startsWith(month)),
    sum = (kind: string) =>
      filtered
        .filter((r: Row) => r.kind === kind)
        .reduce((v: number, r: Row) => v + Number(r.amount), 0);
  const csv = () => {
    const safe = (v: any) =>
      '"' +
      String(v)
        .replace(/^[=+@-]/, "'" + "$&")
        .replaceAll('"', '""') +
      '"';
    const blob = new Blob(
      [
        "\ufeff" +
          [
            ["Data", "Descrição", "Categoria", "Tipo", "Valor"],
            ...filtered.map((r: Row) => [
              r.entry_date,
              r.description,
              r.category,
              r.kind === "income" ? "Entrada" : "Saída",
              String(r.amount).replace(".", ","),
            ]),
          ]
            .map((row) => row.map(safe).join(";"))
            .join("\r\n"),
      ],
      { type: "text/csv;charset=utf-8" },
    );
    const u = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = u;
    a.download = "financeiro-" + month + ".csv";
    a.click();
    URL.revokeObjectURL(u);
  };
  return (
    <>
      <Section title="Controle de entradas e saídas" can add={add} />
      <p className="helper">
        Registros de controle interno. Os valores são informados pela sua
        equipe; o app não movimenta dinheiro.
      </p>
      <div className="finance-toolbar">
        <Field label="Mês de referência">
          <input
            type="month"
            required
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </Field>
        <button className="secondary" onClick={csv}>
          <Download size={18} />
          Exportar CSV
        </button>
      </div>
      <div className="finance-summary">
        <div>
          <span>Entradas</span>
          <strong>{money(sum("income"))}</strong>
        </div>
        <div>
          <span>Saídas</span>
          <strong>{money(sum("expense"))}</strong>
        </div>
        <div>
          <span>Resultado do mês</span>
          <strong>{money(sum("income") - sum("expense"))}</strong>
        </div>
      </div>
      {!filtered.length ? (
        <Empty>Nenhum lançamento neste mês.</Empty>
      ) : (
        <div className="table-scroll">
          <table>
            <caption className="sr-only">
              Lançamentos financeiros do mês selecionado
            </caption>
            <thead>
              <tr>
                <th>Data</th>
                <th>Descrição</th>
                <th>Categoria</th>
                <th>Valor</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered
                .sort((a: Row, b: Row) =>
                  b.entry_date.localeCompare(a.entry_date),
                )
                .map((r: Row) => (
                  <tr key={r.id}>
                    <td>{date(r.entry_date)}</td>
                    <td>{r.description}</td>
                    <td>{r.category}</td>
                    <td
                      className={r.kind === "expense" ? "negative" : "positive"}
                    >
                      {r.kind === "expense" ? "−" : "+"}
                      {money(Number(r.amount))}
                    </td>
                    <td>{actions("finance_entries", r)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
      <button
        className="text-btn"
        aria-expanded={history}
        onClick={() => setHistory(!history)}
      >
        {history ? "Ocultar" : "Ver"} histórico de alterações financeiras
      </button>
      {history && (
        <div className="audit-list">
          {audit
            .filter((r: Row) => r.entity === "finance_entries")
            .slice(0, 50)
            .map((r: Row) => (
              <p key={r.id}>
                {date(r.created_at)} ·{" "}
                {
                  (
                    {
                      INSERT: "Criado",
                      UPDATE: "Alterado",
                      DELETE: "Excluído",
                    } as Row
                  )[r.action]
                }{" "}
                · {(r.new_data || r.old_data)?.description} ·{" "}
                {money(Number((r.new_data || r.old_data)?.amount || 0))}
              </p>
            ))}
          <small>Até 50 alterações recentes carregadas.</small>
        </div>
      )}
      <p className="helper">
        Todos os lançamentos carregados são considerados no resultado do mês.
      </p>
    </>
  );
}
const specs: Record<
  string,
  { label: string; fields: [string, string, string, boolean?][] }
> = {
  prayer_requests: {
    label: "Pedido de oração",
    fields: [
      ["title", "Assunto", "text", true],
      ["body", "Seu pedido", "textarea", true],
    ],
  },
  announcements: {
    label: "Aviso",
    fields: [
      ["title", "Título", "text", true],
      ["body", "Mensagem", "textarea", true],
    ],
  },
  events: {
    label: "Evento",
    fields: [
      ["title", "Nome do encontro", "text", true],
      ["description", "Detalhes", "textarea"],
      ["starts_at", "Data e horário", "datetime-local", true],
      ["location", "Local", "text"],
    ],
  },
  ministries: {
    label: "Ministério",
    fields: [
      ["name", "Nome do ministério", "text", true],
      ["description", "Sobre a equipe", "textarea"],
    ],
  },
  cells: {
    label: "Célula",
    fields: [
      ["name", "Nome da célula", "text", true],
      ["description", "Sobre o encontro", "textarea"],
      ["meeting_time", "Dia e horário (ex.: terça às 19h)", "text"],
      ["location", "Local e responsável pelo encontro", "text"],
    ],
  },
  tasks: {
    label: "Atividade",
    fields: [
      ["title", "O que precisa ser feito?", "text", true],
      ["description", "Orientações", "textarea"],
      ["assigned_to", "Responsável", "person"],
      ["ministry_id", "Ministério", "ministry"],
      ["due_date", "Data da atividade", "date", true],
    ],
  },
  finance_entries: {
    label: "Lançamento",
    fields: [
      ["description", "Descrição", "text", true],
      ["kind", "Tipo", "kind", true],
      ["amount", "Valor em reais", "number", true],
      ["category", "Categoria", "text", true],
      ["entry_date", "Data", "date", true],
    ],
  },
};
function Editor({
  table,
  row,
  ministries,
  people,
  error,
  busy,
  close,
  save,
}: any) {
  const s = specs[table];
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    document.body.style.overflow = "hidden";
    const dialog = document.getElementById("edit-dialog") as HTMLDialogElement;
    dialog.showModal();
    return () => {
      document.body.style.overflow = "";
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      id="edit-dialog"
      className="editor"
      aria-labelledby="editor-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) close();
      }}
    >
      <div className="editor-header">
        <h2 id="editor-title">
          {row ? "Editar" : "Adicionar"} {s.label.toLowerCase()}
        </h2>
        <button
          className="icon-btn"
          type="button"
          aria-label="Fechar formulário"
          disabled={busy}
          onClick={close}
        >
          <X />
        </button>
      </div>
      {error && (
        <div className="alert error" role="alert">
          {error}
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const raw = Object.fromEntries(new FormData(e.currentTarget)),
            payload: Row = { ...raw };
          if (table === "events")
            payload.starts_at = new Date(String(raw.starts_at)).toISOString();
          if (table === "finance_entries") payload.amount = Number(raw.amount);
          if (table === "tasks") {
            payload.assigned_to = raw.assigned_to || null;
            payload.ministry_id = raw.ministry_id || null;
          }
          save(payload);
        }}
      >
        {s.fields.map(([name, label, type, required]) => {
          let value =
            row?.[name] ??
            (type === "date" ? today() : type === "kind" ? "income" : "");
          if (type === "datetime-local" && value) {
            const d = new Date(value);
            value = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
              .toISOString()
              .slice(0, 16);
          }
          return (
            <Field key={name} label={label}>
              {type === "textarea" ? (
                <textarea
                  name={name}
                  defaultValue={value}
                  required={required}
                  maxLength={10000}
                />
              ) : ["person", "ministry", "kind"].includes(type) ? (
                <select name={name} defaultValue={value}>
                  <option value="">
                    {type === "kind" ? "Escolha o tipo" : "Não definido"}
                  </option>
                  {(type === "kind"
                    ? [
                        { id: "income", name: "Entrada" },
                        { id: "expense", name: "Saída" },
                      ]
                    : type === "person"
                      ? people.map((p: Row) => ({
                          id: p.id,
                          name: p.full_name,
                        }))
                      : ministries
                  ).map((p: Row) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  name={name}
                  type={type}
                  defaultValue={value}
                  required={required}
                  min={type === "number" ? "0.01" : undefined}
                  step={type === "number" ? "0.01" : undefined}
                  max={type === "number" ? "999999999999.99" : undefined}
                  maxLength={type === "text" ? 160 : undefined}
                />
              )}
            </Field>
          );
        })}
        <div className="editor-footer">
          <button
            className="secondary"
            type="button"
            disabled={busy}
            onClick={close}
          >
            Cancelar
          </button>
          <button disabled={busy}>{busy ? "Salvando…" : "Salvar"}</button>
        </div>
      </form>
    </dialog>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
if ("serviceWorker" in navigator)
  window.addEventListener("load", () =>
    navigator.serviceWorker.register("/sw.js").catch(() => {}),
  );
