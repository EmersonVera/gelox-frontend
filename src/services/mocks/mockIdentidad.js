// Datos simulados de identidad visual y landing por subdominio (RF60, RF61).
// Respeta la forma del contrato del backend (IdentidadDTO, InfoNegocioDTO,
// CatalogoProductoPublicoDTO). La identidad de la distribuidora del usuario se
// guarda en localStorage para que los cambios sobrevivan a una recarga.
//
// Identidad:   { nombreComercial, logoUrl, faviconUrl, colorPrimario, colorSecundario }
// InfoNegocio: { nombreComercial, eslogan, direccion, barrio, ciudad, horario, enlaceComoLlegar, whatsapp }
// Productos:   { CATEGORIA: [{ nombre, imagenUrl, precioVenta, descripcion, categoria }] }

const DEMORA_MS = 300;
const CLAVE_STORAGE = 'gelox_mock_identidad';

const esperar = (valor) =>
  new Promise((resolve) => setTimeout(() => resolve(structuredClone(valor)), DEMORA_MS));

const errorHttp = (status, mensaje) =>
  Object.assign(new Error(mensaje), { response: { status, data: { error: mensaje, mensaje } } });

// Logotipo de ejemplo de Mágico Sabor (assets/logo.png está vacío en el repositorio).
const LOGO_MAGICO_SABOR = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
  '<rect width="64" height="64" rx="14" fill="#9e2016"/>' +
  '<circle cx="32" cy="24" r="13" fill="#ffdad5"/>' +
  '<path d="M21 30h22L32 54z" fill="#f5c16c"/>' +
  '<circle cx="27" cy="21" r="3" fill="#fff" opacity=".7"/>' +
  '</svg>'
);

export const PRESETS = {
  magicosabor: {
    nombreComercial: 'Mágico Sabor',
    logoUrl: LOGO_MAGICO_SABOR,
    faviconUrl: null,
    colorPrimario: '#9E2016',
    colorSecundario: '#7C0202',
  },
  // Distribuidora de prueba sin logotipo: el menú muestra sus iniciales.
  heladospolar: {
    nombreComercial: 'Helados Polar',
    logoUrl: null,
    faviconUrl: null,
    colorPrimario: '#1D4ED8',
    colorSecundario: '#0EA5E9',
  },
};

const INFO_NEGOCIO = {
  magicosabor: {
    nombreComercial: 'Mágico Sabor',
    eslogan: 'Tu antojo de Crem Helado a un clic',
    direccion: 'Calle 0 Av 9 #9-36',
    barrio: 'Carora',
    ciudad: 'Cúcuta',
    horario: 'Lunes a Domingo 10:00am - 9:00pm',
    enlaceComoLlegar: 'https://maps.google.com/?q=Calle+0+Av+9+%239-36+C%C3%BAcuta',
    whatsapp: '573124099628',
  },
  heladospolar: {
    nombreComercial: 'Helados Polar',
    eslogan: 'El frío que te alegra el día',
    direccion: 'Carrera 5 #12-40',
    barrio: 'La Libertad',
    ciudad: 'Pamplona',
    horario: 'Lunes a Sábado 8:00am - 7:00pm',
    enlaceComoLlegar: 'https://maps.google.com/?q=Carrera+5+%2312-40+Pamplona',
    whatsapp: '573001112233',
  },
};

const producto = (nombre, precioVenta, categoria, descripcion = '') =>
  ({ nombre, imagenUrl: null, precioVenta, descripcion, categoria });

const PRODUCTOS = {
  magicosabor: {
    PALETAS: [
      producto('Crem Helado Casero Guanábana', 2800, 'PALETAS'),
      producto('Tosh Paleta Fresa NF 75G', 3500, 'PALETAS'),
      producto('Polet Paleta Frutos', 6000, 'PALETAS'),
    ],
    CONOS: [
      producto('Bocatto Cono Tres Leches', 6000, 'CONOS'),
      producto('Crem Helado Chococono Regular', 3500, 'CONOS'),
      producto('Bocatto Cono Fresa', 6000, 'CONOS'),
    ],
    FAMILIARES: [
      producto('Litro Fresa', 14000, 'FAMILIARES'),
    ],
  },
  heladospolar: {
    PALETAS: [
      producto('Paleta Limón Polar', 2000, 'PALETAS', 'Refrescante y ácida.'),
      producto('Paleta Mora', 2500, 'PALETAS'),
    ],
    CONOS: [
      producto('Cono Vainilla Polar', 3000, 'CONOS'),
    ],
  },
};

/* ── Identidad de la distribuidora del usuario ── */

function leerActual() {
  try {
    const guardada = JSON.parse(localStorage.getItem(CLAVE_STORAGE));
    if (guardada?.nombreComercial) return guardada;
  } catch { /* storage no disponible */ }
  return PRESETS.magicosabor;
}

function guardarActual(identidad) {
  try {
    localStorage.setItem(CLAVE_STORAGE, JSON.stringify(identidad));
  } catch { /* storage lleno o bloqueado: el cambio queda solo en memoria */ }
  actual = identidad;
}

let actual = leerActual();

export const obtener = () => esperar(actual);

/** Cambia la identidad simulada por uno de los PRESETS (solo modo simulado). */
export function usarPreset(clave) {
  guardarActual(structuredClone(PRESETS[clave]));
  return esperar(actual);
}

const leerComoDataUrl = (archivo) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(archivo);
  });

const extension = (archivo) => archivo.name.split('.').pop().toLowerCase();

// Mismas validaciones que el backend (FP-15 2.9.6).
async function validarArchivo(archivo, permitidas, maxBytes, etiqueta) {
  if (!permitidas.includes(extension(archivo))) {
    throw errorHttp(400, `El ${etiqueta} debe ser ${permitidas.join(', ').toUpperCase()}`);
  }
  if (archivo.size > maxBytes) {
    throw errorHttp(400, `El ${etiqueta} supera el tamaño máximo permitido`);
  }
  if (extension(archivo) === 'svg') {
    const texto = await archivo.text();
    if (/<script|\son\w+\s*=/i.test(texto)) {
      throw errorHttp(400, 'El SVG contiene código no permitido');
    }
  }
}

export async function actualizar(formData) {
  const nombreComercial = String(formData.get('nombreComercial') ?? '').trim();
  const colorPrimario   = String(formData.get('colorPrimario') ?? '');
  const colorSecundario = String(formData.get('colorSecundario') ?? '');
  const logo    = formData.get('logo');
  const favicon = formData.get('favicon');

  if (!nombreComercial) throw errorHttp(400, 'El nombre comercial es obligatorio');
  if (![colorPrimario, colorSecundario].every((c) => /^#[0-9A-Fa-f]{6}$/.test(c))) {
    throw errorHttp(400, 'Los colores deben estar en formato hexadecimal #RRGGBB');
  }

  const nueva = { ...actual, nombreComercial, colorPrimario, colorSecundario };
  if (logo instanceof File) {
    await validarArchivo(logo, ['png', 'jpg', 'jpeg', 'svg'], 2 * 1024 * 1024, 'logotipo');
    nueva.logoUrl = await leerComoDataUrl(logo);
  }
  if (favicon instanceof File) {
    await validarArchivo(favicon, ['png', 'ico'], 512 * 1024, 'favicon');
    nueva.faviconUrl = await leerComoDataUrl(favicon);
  }
  guardarActual(nueva);
  return esperar(actual);
}

/* ── Landing pública por subdominio ── */

function resolver(subdominio) {
  const clave = (subdominio ?? '').trim().toLowerCase();
  if (!INFO_NEGOCIO[clave]) {
    return Promise.reject(errorHttp(404, 'Distribuidora no encontrada'));
  }
  return Promise.resolve(clave);
}

export const landingInfoNegocio = (subdominio) =>
  resolver(subdominio).then((c) => esperar(INFO_NEGOCIO[c]));

export const landingProductos = (subdominio) =>
  resolver(subdominio).then((c) => esperar(PRODUCTOS[c] ?? {}));

export const landingWhatsapp = (subdominio) =>
  resolver(subdominio).then((c) => esperar({ url: `https://wa.me/${INFO_NEGOCIO[c].whatsapp}` }));

export const landingIdentidad = (subdominio) =>
  resolver(subdominio).then((c) => esperar(PRESETS[c]));
