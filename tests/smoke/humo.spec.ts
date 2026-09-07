import { expect, test } from '@playwright/test';

// Lo que caza esta prueba y ninguna otra de la puerta puede cazar:
//   · errores de JavaScript en tiempo de ejecución (el lint no abre el navegador),
//   · peticiones del propio origen que fallan (5xx) al cargar una pantalla,
//   · controles que se pintan pero no reaccionan al clic.
// No comprueba lógica de negocio: para eso están los tests unitarios y la suite e2e.

test.describe('humo: la app arranca y responde', () => {
  test('la pantalla de login se pinta, sin errores de consola ni peticiones rotas', async ({
    page,
  }) => {
    const erroresConsola: string[] = [];
    const peticionesRotas: string[] = [];

    // Dos criterios distintos, a propósito:
    //  · una excepción de JS SIEMPRE es un defecto;
    //  · una petición se juzga por su CÓDIGO, no por el ruido que deja en la consola. Sin
    //    sesión, /login pregunta por el usuario y recibe un 401 — eso es correcto, no un fallo.
    //    Por eso se descarta el «Failed to load resource» genérico: de esas ya decide el 5xx.
    const RUIDO_DE_RECURSO = /^Failed to load resource/;
    page.on('console', m => {
      if (m.type() === 'error' && !RUIDO_DE_RECURSO.test(m.text())) erroresConsola.push(m.text());
    });
    page.on('pageerror', e => erroresConsola.push(`excepción de JS: ${e.message}`));
    page.on('response', r => {
      // Sólo el propio origen: un 5xx de un tercero no es culpa de este cambio.
      const url = new URL(r.url());
      if (url.port === (process.env.SMOKE_PORT ?? '3999') && r.status() >= 500) {
        peticionesRotas.push(`${r.status()} ${url.pathname}`);
      }
    });

    await page.goto('/login', { waitUntil: 'domcontentloaded' });

    // Se pinta lo esencial de la pantalla.
    await expect(page.getByTestId('input-username')).toBeVisible();
    await expect(page.getByTestId('input-password')).toBeVisible();
    await expect(page.getByTestId('button-submit')).toBeVisible();

    expect(erroresConsola, `errores de consola al cargar /login:\n${erroresConsola.join('\n')}`)
      .toEqual([]);
    expect(peticionesRotas, `peticiones del propio origen con 5xx:\n${peticionesRotas.join('\n')}`)
      .toEqual([]);
  });

  test('el botón de entrar reacciona al clic (no es un botón muerto)', async ({ page }) => {
    const errores: string[] = [];
    page.on('pageerror', e => errores.push(e.message));

    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    // Esperar a que el formulario esté vivo ANTES de tocarlo. Sin esto la pantalla todavía no
    // ha hidratado y cualquier comparación «antes/después» sale verde por comparar contra
    // vacío: me pasó escribiendo esta prueba, y por eso no cazaba el botón desconectado.
    await expect(page.getByTestId('button-submit')).toBeVisible();
    await expect(page.getByTestId('input-username')).toBeVisible();

    await page.getByTestId('button-submit').click();

    // Con los campos vacíos, el formulario TIENE que marcarlos como obligatorios. Es la propia
    // validación de umami (`rules={{ required }}`), la misma en la que se apoya su suite e2e.
    // Verificado en los dos sentidos: con el código sano aparece; desconectando el `onSubmit`
    // y quitando las reglas, NO aparece y esta prueba se pone roja.
    await expect(
      page.getByText(/required/i).first(),
      'pulsar «entrar» con los campos vacíos no marcó nada como obligatorio: acción sin cablear',
    ).toBeVisible({ timeout: 10_000 });

    expect(errores, `errores de JS al pulsar entrar:\n${errores.join('\n')}`).toEqual([]);
  });
});
