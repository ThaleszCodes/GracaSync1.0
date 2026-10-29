import { test, expect, Page } from "@playwright/test";
const uid = "10000000-0000-4000-8000-000000000001",
  cid = "20000000-0000-4000-8000-000000000001";
async function setup(page: Page, role = "member", phone = "") {
  const user = {
    id: uid,
    aud: "authenticated",
    role: "authenticated",
    email: "fixture@example.invalid",
    app_metadata: { provider: "email" },
    user_metadata: {},
    created_at: "2026-01-01T00:00:00Z",
  };
  const token =
    Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString(
      "base64url",
    ) +
    "." +
    Buffer.from(
      JSON.stringify({
        sub: uid,
        exp: Math.floor(Date.now() / 1000) + 3600,
        role: "authenticated",
      }),
    ).toString("base64url") +
    ".test";
  await page.addInitScript(
    ({ user, token }) =>
      localStorage.setItem(
        "sb-oywdpselqqzvfqmwnfxv-auth-token",
        JSON.stringify({
          access_token: token,
          refresh_token: "fixture",
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          expires_in: 3600,
          token_type: "bearer",
          user,
        }),
      ),
    { user, token },
  );
  const state: any = {
    responses: [],
    tasks: [
      {
        id: "t1",
        church_id: cid,
        event_id: "e1",
        assigned_to: uid,
        title: "Preparar recepção",
        description: "Chegue 20 minutos antes.",
        due_date: "2030-01-06",
        status: "pending",
        created_at: "2026-01-01T12:00:00Z",
      },
    ],
  };
  await page.route("https://fonts.googleapis.com/**", (r) => r.abort());
  await page.route("https://oywdpselqqzvfqmwnfxv.supabase.co/**", async (r) => {
    const path = new URL(r.request().url()).pathname,
      table = path.split("/").at(-1);
    const fixtures: any = {
      event_responses: state.responses,
      tasks: state.tasks,
      profiles: [
        {
          id: uid,
          church_id: cid,
          full_name: "Thales Alves",
          member_type: "membro",
          role,
          ministry_id: null,
        },
      ],
      churches: [
        {
          id: cid,
          name: "Comunidade da Graça",
          welcome: "Um lugar para caminhar juntos.",
          city: "Pelotas",
          address: "Rua da Comunidade, 10",
          invite_code: "EXEMPLO",
          pastor_whatsapp: phone,
          pastor_name: "Pastores da comunidade",
        },
      ],
      events: [
        {
          id: "e1",
          church_id: cid,
          title: "Domingo em família",
          description: "Esperamos por você.",
          starts_at: "2030-01-06T19:00:00-03:00",
          location: "Na igreja",
          created_at: "2026-01-01T12:00:00Z",
        },
      ],
      announcements: [
        {
          id: "n1",
          title: "Há um lugar para você",
          body: "Esperamos você e sua família neste domingo. 💙",
          created_at: "2026-01-01T12:00:00Z",
        },
      ],
      ministries: [
        {
          id: "m1",
          name: "Obreiros",
          description: "Acolher nossa comunidade.",
        },
      ],
      finance_entries: [
        {
          id: "f1",
          description: "Oferta",
          kind: "income",
          amount: 150,
          category: "Ofertas",
          entry_date: new Date().toISOString().slice(0, 10),
        },
      ],
    };
    if (table === "event_responses" && r.request().method() === "POST") {
      state.responses.push(r.request().postDataJSON());
      return r.fulfill({ status: 201, json: [] });
    }
    if (table === "event_responses" && r.request().method() === "DELETE") {
      state.responses = [];
      return r.fulfill({ status: 204 });
    }
    if (table === "complete_task") {
      state.tasks[0].status =
        state.tasks[0].status === "done" ? "pending" : "done";
      return r.fulfill({ status: 204 });
    }
    if (table === "bootstrap") return r.fulfill({ status: 204 });
    if (table === "is_dev") return r.fulfill({ json: false });
    if (path.includes("/auth/")) return r.fulfill({ json: user });
    const arr = fixtures[table || ""] || [];
    const single = r.request().headers().accept?.includes("vnd.pgrst.object");
    await r.fulfill({ json: single ? arr[0] : arr });
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Você faz parte desta família." }),
  ).toBeVisible();
}
test("home e Mais aprovados, acessibilidade e links reais no mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page);
  await expect(
    page
      .getByRole("navigation", { name: "Navegação principal" })
      .getByRole("button"),
  ).toHaveCount(5);
  await page.screenshot({ path: "test-results/new-home.png", fullPage: true });
  await page.getByRole("button", { name: "Mais", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Mais", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Financeiro", exact: true }),
  ).toHaveCount(0);
  await page.screenshot({ path: "test-results/new-more.png", fullPage: true });
  await page
    .getByRole("button", { name: "Acessibilidade", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Aumentar letras", exact: true })
    .click();
  await expect(page.locator("html")).toHaveClass("large-text");
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  }
  await page.getByRole("button", { name: "Mais", exact: true }).click();
  await page
    .getByRole("button", { name: "Pedidos de oração", exact: true })
    .click();
  await page.getByRole("button", { name: "Adicionar", exact: true }).click();
  await expect(page.getByLabel("Seu pedido")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("novo sistema em todas as áreas administrativas e desktop", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await setup(page, "admin");
  for (const label of [
    "Agenda",
    "Células",
    "Minhas atividades",
    "Pessoas e cargos",
    "Financeiro",
    "Meu perfil",
  ]) {
    await page.getByRole("button", { name: "Mais", exact: true }).click();
    await page.getByRole("button", { name: label, exact: true }).click();
    await expect(page.locator("#content h1")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  }
  await page.getByRole("button", { name: "Mais", exact: true }).click();
  await page.getByRole("button", { name: "Financeiro", exact: true }).click();
  await page.screenshot({
    path: "test-results/new-finance-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Adicionar", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
});

test("processo pastoral, contato ausente e jornada encontro-serviço", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page, "member", "5553999999999");
  await page.getByRole("button", { name: "Servir", exact: true }).click();
  const link = page.getByRole("link", { name: "Quero servir · Conversar" });
  await expect(link).toHaveAttribute(
    "href",
    /^https:\/\/wa.me\/5553999999999\?text=/,
  );
  expect(decodeURIComponent((await link.getAttribute("href")) || "")).toContain(
    "Obreiros",
  );
  await expect(
    page.getByRole("button", { name: "Quero participar", exact: true }),
  ).toHaveCount(0);
  await page.screenshot({
    path: "test-results/pastoral-serving.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Início", exact: true }).click();
  await page.getByRole("button", { name: "Participar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Meu serviço neste encontro" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Confirmar presença", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Sua presença está confirmada!" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Concluir Preparar recepção", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Reabrir Preparar recepção",
      exact: true,
    }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/connected-event.png",
    fullPage: true,
  });
});
test("contato não configurado não permite entrada nem inventa WhatsApp", async ({
  page,
}) => {
  await setup(page);
  await page.getByRole("button", { name: "Servir", exact: true }).click();
  await expect(
    page.getByText(/WhatsApp pastoral ainda não foi configurado/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Contato pastoral indisponível" }),
  ).toBeDisabled();
  await expect(page.locator('a[href*="wa.me"]')).toHaveCount(0);
});

test("movimento reduzido e validação de fotos da igreja", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await setup(page, "admin");
  await page.getByRole("button", { name: "Mais", exact: true }).click();
  expect(
    await page
      .locator(".route-view")
      .evaluate((e) => getComputedStyle(e).animationName),
  ).toBe("none");
  await page
    .getByRole("button", { name: "Configurações da igreja", exact: true })
    .click();
  await page
    .getByLabel("Foto da comunidade")
    .setInputFiles({
      name: "invalid.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("not an image"),
    });
  await expect(page.getByRole("alert")).toContainText(
    "Escolha uma imagem JPG, PNG ou WebP",
  );
  await expect(
    page.getByLabel("WhatsApp pastoral (código do país + DDD + número)"),
  ).toBeVisible();
});
