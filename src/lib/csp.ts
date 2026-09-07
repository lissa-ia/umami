function getUrlOrigin(url: string) {
  try {
    return new URL(url).origin;
  } catch {
    return '';
  }
}

// ALLOWED_FRAME_URLS se interpola cruda en la cabecera. Un ';' dentro del valor cierra la
// directiva y abre otra, así que un valor mal formado —o copiado de donde no debía— altera la
// política entera en vez de sólo frame-ancestors. Una lista de fuentes legítima nunca lleva
// ';': si aparece, el valor se descarta ENTERO y queda 'self', que es el fallo seguro. Ampliar
// frame-ancestors a medias sería peor que no ampliarlo.
function getFrameAncestors() {
  const raw = process.env.ALLOWED_FRAME_URLS || '';
  return raw.includes(';') ? '' : raw;
}

// Builds the Content-Security-Policy. Reads the environment when called, so it
// can run at build time (next.config.ts) or per request in the Docker proxy,
// where ALLOWED_FRAME_URLS and API_URL then apply without rebuilding the image.
export function getContentSecurityPolicy() {
  const apiUrlOrigin = getUrlOrigin(process.env.API_URL || '');
  const connectSrc = ["'self'", 'https:', apiUrlOrigin].filter(Boolean).join(' ');
  const frameAncestors = ["'self'", getFrameAncestors()].filter(Boolean).join(' ');

  const directives = [
    `default-src 'self'`,
    `img-src 'self' https: data: blob:`,
    `script-src 'self' 'unsafe-eval' 'unsafe-inline'`,
    `style-src 'self' 'unsafe-inline'`,
    `connect-src ${connectSrc}`,
    `frame-src 'self' http: https:`,
    `frame-ancestors ${frameAncestors}`,
  ];

  return `${directives.join('; ')};`;
}
