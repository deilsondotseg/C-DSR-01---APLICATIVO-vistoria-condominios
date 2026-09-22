import { test, expect } from '@playwright/test';
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import { randomBytes, scryptSync } from 'node:crypto';

const testUsername = 'e2e-admin';
const testPassword = 'e2e-admin-123';

async function ensureTestAdmin() {
  const db = await open({ filename: 'database.sqlite', driver: sqlite3.Database });
  const existing = await db.get('SELECT id FROM users WHERE username = ?', testUsername);
  if (!existing) {
    const salt = randomBytes(16).toString('hex');
    const passwordHash = `${salt}:${scryptSync(testPassword, salt, 64).toString('hex')}`;
    const permissions = JSON.stringify({ dashboard: 'edit', clients: 'edit', equipments: 'edit', labor: 'edit', inspections: 'edit', appointments: 'edit', reports: 'edit', settings: 'edit' });
    await db.run(
      `INSERT INTO users (id, fullName, email, username, passwordHash, role, permissions, active, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      `e2e-${Date.now()}`,
      'Administrador E2E',
      'e2e-admin@example.com',
      testUsername,
      passwordHash,
      'admin',
      permissions,
      1,
      new Date().toISOString(),
    );
  }
  await db.close();
}

test('create inspection via UI', async ({ page }) => {
  await ensureTestAdmin();
  await page.goto('/');

  await page.getByLabel('Usuário').fill(testUsername);
  await page.getByRole('textbox', { name: 'Senha', exact: true }).fill(testPassword);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('button', { name: /Nova vistoria/i }).first()).toBeVisible();

  // debug network: log api requests/responses
  page.on('request', (req) => {
    if (req.url().includes('/api')) console.log('REQ>', req.method(), req.url());
  });
  page.on('response', (res) => {
    if (res.url().includes('/api')) console.log('RES>', res.status(), res.url());
  });
  page.on('console', (m) => console.log('PAGE LOG>', m.text()));
  page.on('pageerror', (err) => console.log('PAGE ERROR>', err && err.message));

  // open modal (use button labeled 'Nova vistoria')
  await page.getByRole('button', { name: /Nova vistoria/i }).click();

  // wait for modal heading/title
  await expect(page.getByRole('heading', { name: /Nova vistoria|Editar vistoria/ })).toBeVisible();

  // select first client if present
  const clientSelect = page.locator('select').first();
  await clientSelect.waitFor({ state: 'visible' });
  const options = await clientSelect.locator('option').allTextContents();
  if (options.length > 1) {
    await clientSelect.selectOption({ index: 1 });
  }

  // add an item: fill equipment name and other item fields
  await page.getByLabel('Equipamento').fill('Câmera E2E Test');
  await page.getByLabel('Quantidade').fill('1');
  await page.getByLabel('Valor unitário').fill('100');
  // click add item
  await page.getByRole('button', { name: /Adicionar item/i }).click();

  // signature removed from app; no drawing required

  // debug: verify submit button existence and state
  const submitInfo = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const found = buttons.filter((b) => /Registrar vistoria|Salvar vistoria/i.test(b.innerText));
    return found.map((b) => ({ text: b.innerText, disabled: b.disabled, visible: !!(b.offsetWidth || b.offsetHeight) }));
  });
  console.log('SUBMIT BUTTONS:', submitInfo);

  // submit inspection
  await page.getByRole('button', { name: /Registrar vistoria|Salvar vistoria/i }).click();

  // wait for success or error toast
  let ok = false;
  try {
    await page.getByText('Vistoria técnica gravada com sucesso.', { exact: true }).waitFor({ timeout: 8000 });
    ok = true;
  } catch (e) {
    try {
      await page.getByText(/Falha ao salvar vistoria|Não foi possível salvar a vistoria|Atenção/i).waitFor({ timeout: 1000 });
      ok = false;
    } catch (err) {
      throw new Error('Nem sucesso nem erro de toast apareceram após submissão');
    }
  }
  if (!ok) throw new Error('Submission did not succeed; check page logs for validation messages');
});
