import { test, expect } from "@playwright/test";
import fs from "node:fs";
const fixtures = fs.existsSync("/tmp/graca-fixtures.json")
  ? JSON.parse(fs.readFileSync("/tmp/graca-fixtures.json", "utf8"))
  : null;
test("fluxo real: criar igreja, ministério, evento, financeiro e entrada de visitante", async ({
  browser,
}) => {
  test.setTimeout(600000);
  expect.configure({ timeout: 90000 });
  test.skip(
    !fixtures,
    "Exige contas temporárias de teste criadas pelo responsável no Supabase.",
  );
  const page = await browser.newPage();
  await page.route("https://*.supabase.co/**", async (route) => {
    const response = await route.fetch({ timeout: 90000 });
    await route.fulfill({ response });
  });
  page.on("requestfailed", (r) =>
    console.log("FAILED", r.url().split("?")[0], r.failure()?.errorText),
  );
  await page.goto("/");
  await page.getByLabel("Seu e-mail").fill("graca-e2e-a@example.invalid");
  await page.getByLabel("Sua senha").fill(fixtures.password);
  await page.getByRole("button", { name: "Entrar na minha conta" }).click();
  await expect(
    page.getByRole("heading", { name: "Vamos encontrar sua comunidade." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cadastrar minha igreja" }).click();
  await page.getByLabel("Nome da sua igreja").fill("Comunidade Teste E2E");
  await page
    .getByRole("button", { name: "Criar espaço da minha igreja" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Você faz parte desta família." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Servir", exact: true }).click();
  await page
    .getByRole("button", { name: "Criar ministério", exact: true })
    .click();
  await page.getByLabel("Nome do ministério").fill("Recepção de teste");
  await page
    .getByLabel("Sobre a equipe")
    .fill("Acolher cada pessoa com carinho.");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Recepção de teste" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Mais", exact: true }).click();
  await page.getByRole("button", { name: "Agenda", exact: true }).click();
  await page.getByRole("button", { name: "Adicionar", exact: true }).click();
  await page.getByLabel("Nome do encontro").fill("Encontro de teste");
  await page.getByLabel("Data e horário").fill("2027-01-03T19:00");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Encontro de teste" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Mais", exact: true }).click();
  await page.getByRole("button", { name: "Financeiro", exact: true }).click();
  await page.getByRole("button", { name: "Adicionar", exact: true }).click();
  await page.getByLabel("Descrição", { exact: true }).fill("Oferta de teste");
  await page.getByLabel("Valor em reais").fill("150.50");
  await page.getByLabel("Categoria", { exact: true }).fill("Ofertas");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(
    page.getByRole("cell", { name: "Oferta de teste", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Mais", exact: true }).click();
  await page.getByRole("button", { name: "Meu perfil", exact: true }).click();
  const code = await page.locator(".invite code").innerText();
  await page.screenshot({
    path: "test-results/desktop-settings.png",
    fullPage: true,
  });
  const visitor = await browser.newPage({
    viewport: { width: 390, height: 844 },
  });
  await visitor.route("https://*.supabase.co/**", async (route) => {
    const response = await route.fetch({ timeout: 90000 });
    await route.fulfill({ response });
  });
  await visitor.goto("/");
  await visitor.getByLabel("Seu e-mail").fill("graca-e2e-b@example.invalid");
  await visitor.getByLabel("Sua senha").fill(fixtures.password);
  await visitor.getByRole("button", { name: "Entrar na minha conta" }).click();
  await visitor.getByLabel("Código da igreja").fill(code);
  await visitor
    .getByRole("button", { name: "Entrar na igreja", exact: true })
    .click();
  await expect(
    visitor.getByRole("heading", { name: "Você faz parte desta família." }),
  ).toBeVisible();
  await visitor.screenshot({
    path: "test-results/mobile-home.png",
    fullPage: true,
  });
  await visitor.getByRole("button", { name: "Mais" }).click();
  await expect(
    visitor.getByRole("button", { name: "Financeiro", exact: true }),
  ).toHaveCount(0);
  await visitor.getByRole("button", { name: "Servir", exact: true }).click();
  await expect(
    visitor
      .getByRole("button", { name: "Contato pastoral indisponível" })
      .first(),
  ).toBeDisabled();
  await expect(visitor.locator('a[href*="wa.me"]')).toHaveCount(0);
  expect(
    await visitor.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await visitor.getByRole("button", { name: "Mais" }).click();
  await visitor.getByRole("button", { name: "Agenda", exact: true }).click();
  await visitor.getByRole("button", { name: "Confirmar presença" }).click();
  await expect(
    visitor.getByRole("button", { name: "Confirmado · Cancelar" }),
  ).toBeVisible();
  await page.close();
  await visitor.close();
});

test("regressão: leitura financeira completa e saída da conta", async ({
  browser,
}) => {
  test.skip(!fixtures, "Exige as contas temporárias e o fluxo anterior.");
  test.setTimeout(180000);
  const page = await browser.newPage();
  await page.route("https://*.supabase.co/**", async (route) => {
    try {
      const response = await route.fetch({ timeout: 90000 });
      await route.fulfill({ response });
    } catch {
      await route.abort();
    }
  });
  await page.goto("/");
  await page.getByLabel("Seu e-mail").fill("graca-e2e-a@example.invalid");
  await page.getByLabel("Sua senha").fill(fixtures.password);
  await page.getByRole("button", { name: "Entrar na minha conta" }).click();
  await expect(
    page.getByRole("heading", { name: "Você faz parte desta família." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Mais", exact: true }).click();
  await page.getByRole("button", { name: "Financeiro", exact: true }).click();
  await expect(
    page.getByRole("cell", { name: "Oferta de teste", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".finance-summary")).toContainText("150,50");
  await page.getByRole("button", { name: "Mais", exact: true }).click();
  await page.getByRole("button", { name: "Sair da conta" }).click();
  await expect(
    page.getByRole("heading", { name: "Que bom ter você aqui." }),
  ).toBeVisible();
  await page.close();
});
