import {
  CalendarDays,
  MapPin,
  Check,
  HeartHandshake,
  MessageCircle,
  ChevronRight,
  ArrowLeft,
  ClipboardList,
} from "lucide-react";
import { supabase as db } from "./supabase";
type R = Record<string, any>;
export function pastoralLink(church: R, ministry: R, person: string) {
  const phone = church?.pastor_whatsapp || "";
  if (!/^[1-9][0-9]{9,14}$/.test(phone)) return "";
  const text = `Olá, pastores! Sou ${person}, da ${church.name}. Gostaria de conversar sobre servir no ministério ${ministry.name} e entender a orientação e o acompanhamento da igreja antes de participar.`;
  return "https://wa.me/" + phone + "?text=" + encodeURIComponent(text);
}
export function Serving({
  ministries,
  profile,
  church,
  manager,
  actions,
  add,
  go,
}: R) {
  return (
    <>
      <div className="section-heading">
        <h2>Um chamado para servir</h2>
        {manager && (
          <button className="secondary" onClick={add}>
            Criar ministério
          </button>
        )}
      </div>
      <div className="pastoral-note">
        <HeartHandshake size={28} />
        <div>
          <h3>Servir começa com uma conversa.</h3>
          <p>
            Conheça os ministérios e converse com os pastores sobre sua
            caminhada. A liderança orienta o processo e confirma sua
            participação.
          </p>
        </div>
      </div>
      {!church?.pastor_whatsapp && (
        <p className="contact-missing" role="status">
          O WhatsApp pastoral ainda não foi configurado. Procure os pastores da
          sua igreja pessoalmente.
          {manager
            ? " Configure o contato em Mais → Configurações da igreja."
            : ""}
        </p>
      )}
      <div className="card-grid">
        {ministries.map((m: R) => {
          const mine = profile.ministry_id === m.id,
            url = pastoralLink(church, m, profile.full_name);
          return (
            <article
              className={
                "content-card ministry-card " + (mine ? "selected-card" : "")
              }
              key={m.id}
            >
              <HeartHandshake size={25} />
              <h2>{m.name}</h2>
              <p>{m.description}</p>
              {mine ? (
                <>
                  <p className="membership-status">
                    <Check size={17} />
                    Você faz parte desta equipe
                  </p>
                  <button onClick={() => go("tasks")}>
                    Minhas atividades
                    <ChevronRight size={17} />
                  </button>
                </>
              ) : url ? (
                <a
                  className="button-link"
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle size={18} />
                  Quero servir · Conversar
                </a>
              ) : (
                <button disabled>Contato pastoral indisponível</button>
              )}
              <small className="serving-caption">
                {mine
                  ? "Mudanças de ministério também são acompanhadas pela liderança."
                  : "A conversa acontece no WhatsApp. Nenhum vínculo é criado automaticamente."}
              </small>
              {manager && actions("ministries", m)}
            </article>
          );
        })}
      </div>
    </>
  );
}
export function EventJourney({
  event,
  church,
  profile,
  responses,
  tasks,
  busy,
  confirmPresence,
  complete,
  go,
  manager,
  addTask,
}: R) {
  if (!event)
    return (
      <p>
        Este encontro não está mais disponível.{" "}
        <button className="text-btn" onClick={() => go("events")}>
          Voltar à agenda
        </button>
      </p>
    );
  const joined = responses.some(
      (r: R) => r.event_id === event.id && r.user_id === profile.id,
    ),
    mine = tasks.filter(
      (t: R) => t.event_id === event.id && t.assigned_to === profile.id,
    ),
    future = new Date(event.starts_at) >= new Date();
  return (
    <section className="event-journey">
      <button className="text-btn" onClick={() => go("events")}>
        <ArrowLeft size={17} />
        Voltar à agenda
      </button>
      <img
        className="journey-cover"
        src={church?.cover_url || "/community-welcome.jpg"}
        alt="Comunidade da igreja"
      />
      <h2>{event.title}</h2>
      <p className="event-meta">
        <CalendarDays size={19} />
        {new Date(event.starts_at).toLocaleString("pt-BR", {
          dateStyle: "long",
          timeStyle: "short",
        })}
      </p>
      {event.location && (
        <p className="event-meta">
          <MapPin size={19} />
          {event.location}
        </p>
      )}
      <p className="prewrap">
        {event.description ||
          "Sua presença é bem-vinda. Confira as orientações da sua igreja."}
      </p>
      {future && (
        <div className={"presence-panel " + (joined ? "confirmed" : "")}>
          <h3>
            {joined ? "Sua presença está confirmada!" : "Vamos estar juntos?"}
          </h3>
          <p>
            {joined
              ? "Confira abaixo suas atividades e as orientações para o encontro."
              : "Confirme para se organizar para este encontro. A confirmação de presença não inscreve você em um ministério."}
          </p>
          <button
            className={joined ? "secondary" : ""}
            disabled={busy}
            onClick={() => confirmPresence(event, joined)}
          >
            {busy
              ? "Aguarde…"
              : joined
                ? "Cancelar presença"
                : "Confirmar presença"}
          </button>
        </div>
      )}
      <div className="section-heading">
        <h2>Meu serviço neste encontro</h2>
        {manager && (
          <button className="text-btn" onClick={() => addTask(event.id)}>
            Organizar atividades
          </button>
        )}
      </div>
      {mine.length ? (
        mine.map((t: R) => (
          <article className="task-row" key={t.id}>
            <button
              aria-label={
                (t.status === "done" ? "Reabrir" : "Concluir") + " " + t.title
              }
              disabled={busy}
              className={"task-check " + (t.status === "done" ? "done" : "")}
              onClick={() => complete(t.id)}
            >
              {t.status === "done" ? <Check /> : <ClipboardList size={20} />}
            </button>
            <div>
              <h3>{t.title}</h3>
              <p>
                {t.description ||
                  "Converse com sua liderança se precisar de orientação."}
              </p>
              <small>
                {t.status === "done" ? "Concluída" : "Pendente"} ·{" "}
                {new Date(t.due_date + "T12:00:00").toLocaleDateString("pt-BR")}
              </small>
            </div>
          </article>
        ))
      ) : (
        <div className="soft-guidance">
          <p>Você ainda não tem uma atividade atribuída neste encontro.</p>
          <button
            className="text-btn"
            onClick={() => go(profile.ministry_id ? "tasks" : "ministries")}
          >
            {profile.ministry_id
              ? "Ver minhas outras atividades"
              : "Quero conhecer os ministérios"}
            <ChevronRight size={17} />
          </button>
        </div>
      )}
    </section>
  );
}
export function ChurchCareSettings({ church, busy, act, reload }: R) {
  async function upload(file: File, field: string) {
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 5242880
    )
      throw new Error("Escolha uma imagem JPG, PNG ou WebP de até 5 MB.");
    const ext = (
        { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as R
      )[file.type],
      path = church.id + "/" + crypto.randomUUID() + "." + ext;
    const r = await db.storage
      .from("church-branding")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (r.error) throw r.error;
    const { data } = db.storage.from("church-branding").getPublicUrl(path);
    const saved = await db
      .from("churches")
      .update({ [field]: data.publicUrl })
      .eq("id", church.id);
    if (saved.error) throw saved.error;
    await reload();
  }
  return (
    <div className="church-photos">
      <h3>O rosto da sua comunidade</h3>
      <p className="helper">
        Use imagens da igreja que vocês tenham autorização para publicar. As
        fotos de apresentação ficam públicas.
      </p>
      {busy && (
        <p role="status" className="helper">
          Salvando sua alteração. Aguarde um instante…
        </p>
      )}
      {[
        ["cover_url", "Foto da comunidade"],
        ["logo_url", "Logo da igreja"],
        ["pastor_photo_url", "Foto da liderança pastoral"],
      ].map(([field, label]) => (
        <label className="field" key={field}>
          <span>{label}</span>
          {church[field] && (
            <img className="branding-preview" src={church[field]} alt={label} />
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file)
                act(() => upload(file, field), "Imagem da igreja atualizada.");
              e.target.value = "";
            }}
          />
        </label>
      ))}
    </div>
  );
}
