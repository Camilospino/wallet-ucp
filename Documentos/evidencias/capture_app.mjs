import { chromium } from '/Users/camilorodriguez/Desktop/wallet/frontend/node_modules/playwright/index.mjs';

const OUT = '/Users/camilorodriguez/Desktop/wallet/Documentos/evidencias';
const AMBIENTES = [
  { tag: 'qa',   puerto: 8081, nombre: 'QA',         host: 'wallet-ucp-qa.local' },
  { tag: 'prod', puerto: 8082, nombre: 'PRODUCCION', host: 'wallet-ucp.local'     },
];

const browser = await chromium.launch();
const errores = [];

for (const a of AMBIENTES) {
  const base = `http://localhost:${a.puerto}`;
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  const shot = async (n) => {
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${OUT}/app_${a.tag}_${n}.png`, fullPage: false });
    console.log(`OK app_${a.tag}_${n}.png  ->  ${page.url()}`);
  };

  // 1. Login
  await page.goto(base, { waitUntil: 'networkidle' });
  await shot('01_login');

  // 2. Ingresar como user1
  const email = page.locator('input[type=email]');
  const pass  = page.locator('input[type=password]');
  if (await email.count()) {
    await email.fill('user1@example.com');
    await pass.fill('User123!');
    await page.locator('button[type=submit]').click();
    await page.waitForTimeout(2500);
  } else { errores.push(`${a.tag}: no se encontro el formulario de login`); }
  await shot('02_dashboard');

  // 3. Transferir
  await page.goto(`${base}/transfer`, { waitUntil: 'networkidle' });
  await shot('03_transferir');

  const dest = page.locator('input[type=email]').first();
  if (await dest.count()) {
    await dest.fill('user2@example.com');
    const amt = page.locator('input[type=number]').first();
    if (await amt.count()) await amt.fill('25.00');
    await shot('04_transferir_formulario');
  }

  // 4. Historial
  await page.goto(`${base}/transactions`, { waitUntil: 'networkidle' });
  await shot('05_transacciones');

  // 5. Swagger
  await page.goto(`${base}/api-docs`, { waitUntil: 'networkidle' });
  await shot('06_swagger');

  await ctx.close();
}

await browser.close();
console.log('errores:', JSON.stringify(errores));
