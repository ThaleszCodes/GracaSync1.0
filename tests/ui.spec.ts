import { test, expect } from "@playwright/test";
test("login, cadastro, recuperação e letras maiores no celular", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Que bom ter você aqui." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Aumentar letras", exact: true })
    .click();
  await expect(page.locator("html")).toHaveClass("large-text");
  await page.getByRole("button", { name: "Criar conta", exact: true }).click();
  await expect(page.getByLabel("Como você se chama?")).toBeVisible();
  await page
    .getByRole("button", { name: "Esqueci minha senha", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Vamos recuperar seu acesso." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: "test-results/mobile-login.png",
    fullPage: true,
  });
});
test("validação nativa e formulário com teclado", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Entrar na minha conta" }).click();
  await expect(page.getByLabel("Seu e-mail")).toBeFocused();
  await page.getByLabel("Seu e-mail").fill("pessoa@example.com");
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Sua senha")).toBeFocused();
  await page.screenshot({
    path: "test-results/desktop-login.png",
    fullPage: true,
  });
});
