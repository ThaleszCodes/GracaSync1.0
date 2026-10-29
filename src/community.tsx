import {
  Sun,
  Moon,
  CalendarDays,
  Church,
  Heart,
  HeartHandshake,
  Users,
  MoreHorizontal,
  ClipboardList,
  ChevronRight,
  LogOut,
  UserRound,
  Type,
  Wallet,
  ShieldCheck,
  HandHeart,
  MapPin,
  Settings,
} from "lucide-react";
type R = Record<string, any>;
export function Dove() {
  return (
    <svg className="dove" viewBox="0 0 48 44" aria-hidden="true">
      <path
        fill="currentColor"
        d="M4 5c12 0 20 8 23 17 2-9 7-13 13-11l6-5-1 9-5 3c-2 13-13 23-27 19-5-1-9-4-11-8 6 1 11 0 15-2C8 23 4 15 4 5Z"
      />
      <circle cx="38" cy="14" r="1.2" fill="white" />
    </svg>
  );
}
export const tabs: [string, string, typeof Church][] = [
  ["home", "Início", Church],
  ["church", "Igreja", Church],
  ["ministries", "Servir", Heart],
  ["community", "Comunidade", Users],
  ["more", "Mais", MoreHorizontal],
];
export function MoreView({
  profile,
  church,
  manager,
  finance,
  admin,
  dev,
  go,
  logout,
}: R) {
  const groups = [
    {
      title: "Comunidade",
      items: [
        ["events", "Agenda", CalendarDays],
        ["cells", "Células", Users],
        ["prayers", "Pedidos de oração", HandHeart],
      ],
    },
    {
      title: "Voluntariado",
      items: [
        ["ministries", "Meu ministério", HeartHandshake],
        ["tasks", "Minhas atividades", ClipboardList],
      ],
    },
    {
      title: "Conta e preferências",
      items: [
        ["settings", "Meu perfil", UserRound],
        ["accessibility", "Acessibilidade", Type],
      ],
    },
    ...(manager || finance || dev
      ? [
          {
            title: "Cuidar da igreja",
            items: [
              ...(manager ? [["people", "Pessoas e cargos", Users]] : []),
              ...(finance ? [["finance", "Financeiro", Wallet]] : []),
              ...(admin
                ? [["settings", "Configurações da igreja", Settings]]
                : []),
              ...(dev
                ? [["settings", "DEV · Todas as igrejas", ShieldCheck]]
                : []),
            ],
          },
        ]
      : []),
  ];
  return (
    <div className="more-page">
      <button className="profile-link" onClick={() => go("settings")}>
        <span className="avatar profile-avatar">
          {profile.full_name.charAt(0)}
        </span>
        <span>
          <strong>{profile.full_name}</strong>
          <small>{church?.name}</small>
        </span>
        <ChevronRight />
      </button>
      {groups.map((g) => (
        <section className="menu-group" key={g.title}>
          <h2>{g.title}</h2>
          {g.items.map(([p, label, Icon]: any) => (
            <button className="menu-row" key={label} onClick={() => go(p)}>
              <Icon size={23} />
              <span>{label}</span>
              <ChevronRight size={18} />
            </button>
          ))}
        </section>
      ))}
      <button className="menu-row help-link" onClick={() => go("help")}>
        <span>Precisa de ajuda?</span>
        <ChevronRight size={18} />
      </button>
      <button className="menu-row logout-link" onClick={logout}>
        <LogOut size={22} />
        <span>Sair da conta</span>
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
export function Feed({
  announcements,
  church,
  manager,
  actions,
  add,
  compact = false,
}: R) {
  const list = compact ? announcements.slice(0, 2) : announcements;
  return (
    <section className="community-feed">
      {!compact && manager && (
        <button className="secondary" onClick={add}>
          Publicar aviso
        </button>
      )}
      {!list.length ? (
        <p className="quiet-empty">Os avisos da sua igreja aparecerão aqui.</p>
      ) : (
        list.map((a: R) => (
          <article className="feed-post" key={a.id}>
            <div className="post-author">
              <span className="avatar">
                <Church size={21} />
              </span>
              <div>
                <strong>{church?.name}</strong>
                <small>
                  {new Date(a.created_at).toLocaleDateString("pt-BR", {
                    day: "numeric",
                    month: "short",
                  })}
                </small>
              </div>
            </div>
            <h3>{a.title}</h3>
            <p className="prewrap">{a.body}</p>
            {manager && actions("announcements", a)}
          </article>
        ))
      )}
    </section>
  );
}
export function HomeView({
  profile,
  church,
  nextEvents,
  announcements,
  manager,
  go,
  actions,
}: R) {
  const event = nextEvents[0],
    hour = new Date().getHours(),
    greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const shortcuts = [
    ["church", "Minha igreja", Church],
    ["ministries", "Quero servir", HeartHandshake],
    ["prayers", "Oração", HandHeart],
    ["events", "Agenda", CalendarDays],
  ];
  return (
    <div className="family-home">
      <div className="home-identity">
        <Church size={23} />
        <span>{church?.name || "Minha igreja"}</span>
      </div>
      <div className="home-greeting">
        <p>
          {greeting}, {profile.full_name.split(" ")[0]}{" "}
          <span aria-hidden="true">
            {hour < 18 ? <Sun size={20} /> : <Moon size={20} />}
          </span>
        </p>
        <h1>
          Você faz parte
          <br />
          desta família.
        </h1>
      </div>
      <section className="gathering">
        <img
          src="/community-welcome.jpg"
          alt="Famílias e voluntários se acolhendo em uma comunidade cristã"
          fetchPriority="high"
        />
        <div className="gathering-caption">
          <div>
            <h2>{event?.title || "Sua igreja, sua família"}</h2>
            <p>
              {event
                ? new Date(event.starts_at).toLocaleString("pt-BR", {
                    weekday: "long",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Um lugar para caminhar juntos."}
            </p>
          </div>
          <button onClick={() => go(event ? "events" : "church")}>
            {event ? "Participar" : "Conhecer"}
            <ChevronRight size={19} />
          </button>
        </div>
      </section>
      <button className="newcomer" onClick={() => go("church")}>
        <HeartHandshake />
        <span>
          <strong>Chegou agora?</strong>
          <small>Sinta-se em casa. Conheça sua igreja.</small>
        </span>
        <ChevronRight size={21} />
      </button>
      <div className="home-shortcuts">
        {shortcuts.map(([p, label, Icon]: any) => (
          <button key={p} onClick={() => go(p)}>
            <Icon size={30} strokeWidth={1.6} />
            <span>{label}</span>
          </button>
        ))}
      </div>
      <div className="section-heading">
        <h2>Nossa comunidade</h2>
        <button className="text-btn" onClick={() => go("community")}>
          Ver tudo
          <ChevronRight size={17} />
        </button>
      </div>
      <Feed
        announcements={announcements}
        church={church}
        manager={manager}
        actions={actions}
        compact
      />
    </div>
  );
}
export function ChurchView({ church, go }: R) {
  return (
    <div className="church-view">
      <img
        className="church-cover"
        src="/community-welcome.jpg"
        alt="Acolhimento em comunidade"
      />
      <h2>{church?.name}</h2>
      <p className="church-welcome">{church?.welcome}</p>
      {(church?.address || church?.city) && (
        <p className="church-address">
          <MapPin size={20} />
          {[church?.address, church?.city].filter(Boolean).join(" · ")}
        </p>
      )}
      <button className="menu-row" onClick={() => go("events")}>
        <CalendarDays size={23} />
        <span>Encontros e celebrações</span>
        <ChevronRight size={18} />
      </button>
      <button className="menu-row" onClick={() => go("ministries")}>
        <HeartHandshake size={23} />
        <span>Conheça nossos ministérios</span>
        <ChevronRight size={18} />
      </button>
      <button className="menu-row" onClick={() => go("cells")}>
        <Users size={23} />
        <span>Encontre uma célula</span>
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
