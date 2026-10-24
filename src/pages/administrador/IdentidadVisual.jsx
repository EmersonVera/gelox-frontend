import { useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import AppLayout from '../../components/AppLayout';
import SuccessToast from '../../components/SuccessToast';
import LogoDistribuidora from '../../components/LogoDistribuidora';
import EncabezadoDocumento from '../../components/EncabezadoDocumento';
import { useIdentidad } from '../../context/IdentidadContext';
import { USAR_MOCK, usarIdentidadDePrueba } from '../../services/distribuidoraService';
import { HEX_REGEX, contrasteConBlanco, esHexValido, iniciales } from '../../context/identidadUtils';
import ContenidoCarga from '../../components/ui/ContenidoCarga';

/* ── Icons ── */
function UploadIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

/* ── Validation schema ── */
const MB = 1024 * 1024;

const archivo = (extensiones, maxBytes, msgTipo, msgPeso) =>
  yup.mixed().nullable()
    .test('tipo', msgTipo, (f) => !f || extensiones.test(f.name))
    .test('peso', msgPeso, (f) => !f || f.size <= maxBytes);

const color = yup.string()
  .required('El color es requerido')
  .matches(HEX_REGEX, 'Usa el formato hexadecimal #RRGGBB');

const schema = yup.object({
  nombreComercial: yup.string().trim()
    .required('El nombre comercial es requerido')
    .max(100, 'Máximo 100 caracteres'),
  colorPrimario:   color,
  colorSecundario: color,
});

// Los archivos se validan aparte: react-hook-form compara valores con deepEqual
// y dos File distintos le parecen iguales, así que no detecta el cambio.
const esquemaArchivo = {
  logo:    archivo(/\.(png|jpe?g|svg)$/i, 2 * MB,
    'El logotipo debe ser PNG, JPG o SVG', 'El logotipo no puede superar 2 MB'),
  favicon: archivo(/\.(png|ico)$/i, 512 * 1024,
    'El favicon debe ser PNG o ICO', 'El favicon no puede superar 512 KB'),
};
const SIN_ARCHIVOS = { logo: null, favicon: null };

const valoresDesde = (identidad) => ({
  nombreComercial: identidad?.nombreComercial ?? '',
  colorPrimario:   (identidad?.colorPrimario ?? '#9E2016').toUpperCase(),
  colorSecundario: (identidad?.colorSecundario ?? '#7C0202').toUpperCase(),
});

/** URL temporal para previsualizar un archivo elegido; se libera al cambiarlo. */
function useUrlArchivo(file) {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  return url;
}

const DONDE_SE_APLICA = [
  'Menú y barra superior',
  'Botones y encabezados',
  'Pestaña del navegador',
  'Página pública',
  'Planilla de comerciante',
  'Excel del pedido a proveedor',
  'Reportes y comprobantes',
];

/* ── Shared class strings ── */
const card     = 'bg-white rounded-2xl border border-border shadow-[0_1px_3px_rgba(0,0,0,0.07),0_1px_2px_rgba(0,0,0,0.04)] p-6';
const subLbl   = 'text-xs font-semibold text-faint uppercase tracking-[0.6px] block';
const ayuda    = 'text-xs text-muted mt-2 leading-[15px]';
const errMsg   = 'text-xs text-error-fg mt-1 animate-slide-down';

function SeccionTitulo({ children }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-2 h-2 rounded-[4px] bg-primary shrink-0" />
      <span className="text-xs font-bold text-ink uppercase tracking-[1.2px]">{children}</span>
    </div>
  );
}

function CampoColor({ id, etiqueta, ayudaTexto, valor, error, register, onPick }) {
  return (
    <div>
      <label className={subLbl} htmlFor={id}>{etiqueta}</label>
      <div className={`mt-1.5 h-[50px] rounded-xl bg-surface flex items-center gap-2.5 pl-1.5 pr-3 border transition duration-300
        ${error ? 'border-danger ring-2 ring-danger/20' : 'border-transparent focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20'}`}>
        <input
          type="color"
          aria-label={`Elegir color ${etiqueta.toLowerCase()}`}
          value={esHexValido(valor) ? valor.toLowerCase() : '#000000'}
          onChange={(e) => onPick(e.target.value.toUpperCase())}
          className="w-[38px] h-[38px] shrink-0 rounded-lg border border-black/10 cursor-pointer bg-transparent p-0
            [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch]:rounded-lg
            [&::-moz-color-swatch]:border-0 [&::-moz-color-swatch]:rounded-lg"
        />
        <input
          id={id}
          maxLength={7}
          spellCheck={false}
          className="flex-1 min-w-0 bg-transparent outline-none font-mono text-sm text-ink uppercase"
          {...register(id)}
        />
      </div>
      {error ? <p className={errMsg}>{error.message}</p> : <p className={ayuda}>{ayudaTexto}</p>}
    </div>
  );
}

/* ── Component ── */
export default function IdentidadVisual() {
  const { identidad, cargando, actualizar, establecer } = useIdentidad();

  const [errorGeneral, setErrorGeneral] = useState('');
  const [toast, setToast]               = useState(false);
  const [archivos, setArchivos]         = useState(SIN_ARCHIVOS);
  const [errArchivos, setErrArchivos]   = useState(SIN_ARCHIVOS);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: valoresDesde(identidad),
  });

  /* Sincronizar el formulario cuando la identidad cargue o cambie */
  useEffect(() => {
    if (identidad) reset(valoresDesde(identidad));
  }, [identidad, reset]);

  const [nombre, primario, secundario] = useWatch({
    control,
    name: ['nombreComercial', 'colorPrimario', 'colorSecundario'],
  });
  const { logo: logoFile, favicon: faviconFile } = archivos;

  const logoNuevo    = useUrlArchivo(logoFile);
  const faviconNuevo = useUrlArchivo(faviconFile);

  /* Valores de la vista previa: lo que se está editando, o lo guardado si aún no es válido */
  const prev = {
    nombre:     nombre?.trim() || identidad?.nombreComercial || 'GELOX',
    primario:   esHexValido(primario) ? primario : (identidad?.colorPrimario ?? '#9E2016'),
    secundario: esHexValido(secundario) ? secundario : (identidad?.colorSecundario ?? '#7C0202'),
    logoUrl:    logoNuevo ?? identidad?.logoUrl ?? null,
    faviconUrl: faviconNuevo ?? identidad?.faviconUrl ?? null,
  };

  const contraste     = contrasteConBlanco(prev.primario);
  const bajoContraste = contraste < 4.5;

  const elegirArchivo = (campo) => async (e) => {
    const file = e.target.files?.[0] ?? null;
    e.target.value = '';
    if (!file) return;
    try {
      await esquemaArchivo[campo].validate(file);
      setArchivos((a) => ({ ...a, [campo]: file }));
      setErrArchivos((x) => ({ ...x, [campo]: null }));
    } catch (err) {
      setArchivos((a) => ({ ...a, [campo]: null }));
      setErrArchivos((x) => ({ ...x, [campo]: err.message }));
    }
  };

  const restablecer = () => {
    setErrorGeneral('');
    setArchivos(SIN_ARCHIVOS);
    setErrArchivos(SIN_ARCHIVOS);
    reset(valoresDesde(identidad));
  };

  const pick = (campo) => (hex) => setValue(campo, hex, { shouldValidate: true, shouldDirty: true });

  const onSubmit = async (v) => {
    setErrorGeneral('');
    const fd = new FormData();
    fd.append('nombreComercial', v.nombreComercial.trim());
    fd.append('colorPrimario', v.colorPrimario.toUpperCase());
    fd.append('colorSecundario', v.colorSecundario.toUpperCase());
    if (logoFile) fd.append('logo', logoFile);
    if (faviconFile) fd.append('favicon', faviconFile);
    try {
      const datos = await actualizar(fd);
      setArchivos(SIN_ARCHIVOS);
      reset(valoresDesde(datos));
      setToast(true);
    } catch (err) {
      const data = err?.response?.data;
      setErrorGeneral(data?.mensaje || data?.error || data?.message || 'No se pudo guardar la identidad. Intenta de nuevo.');
    }
  };

  const cargarPrueba = async (clave) => {
    setErrorGeneral('');
    establecer(await usarIdentidadDePrueba(clave));
  };

  const hoy = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const tabBase = 'h-10 px-3 text-sm transition duration-300 -mb-px border-b-2';

  return (
    <AppLayout>
      <div className="max-w-[1120px] mx-auto flex flex-col gap-6">
        {/* Page header */}
        <div className="animate-fade-in-up">
          <p className="text-xs font-semibold text-primary uppercase tracking-[0.6px]">Ajustes</p>
          <h1 className="font-display text-2xl font-extrabold text-ink tracking-[-0.48px] mt-1.5">Identidad visual</h1>
          <p className="text-sm text-muted mt-1 max-w-[641px]">
            Personaliza cómo ven tu distribuidora tu equipo y tus clientes. Los cambios se aplican en la
            aplicación, en tu página pública y en los documentos que generes desde ahora.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border animate-fade-in-up [animation-delay:40ms]">
          <NavLink to="/ajustes" end className={`${tabBase} font-medium text-muted border-transparent hover:text-ink`}>
            Mi perfil
          </NavLink>
          <span className={`${tabBase} px-5 font-semibold text-primary border-primary`} aria-current="page">
            Identidad visual
          </span>
        </div>

        {USAR_MOCK && (
          <p className="text-xs text-[#a8a29e] -mt-2">
            Modo simulado: los datos son de ejemplo hasta que el backend de identidad esté disponible.{' '}
            <button type="button" className="underline hover:text-ink" onClick={() => cargarPrueba('magicosabor')}>
              Usar Mágico Sabor
            </button>
            {' · '}
            <button type="button" className="underline hover:text-ink" onClick={() => cargarPrueba('heladospolar')}>
              Usar distribuidora de prueba (sin logo)
            </button>
          </p>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* ── Formulario ── */}
          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className={`${card} flex flex-col gap-6 animate-fade-in-up [animation-delay:80ms]`}
          >
            {errorGeneral && (
              <div className="px-4 py-3 rounded-xl bg-error-bg border border-[#ffb4a9] text-error-fg text-sm animate-slide-down">
                {errorGeneral}
              </div>
            )}

            {/* Nombre comercial */}
            <div>
              <SeccionTitulo>Nombre comercial</SeccionTitulo>
              <input
                id="nombreComercial"
                aria-label="Nombre comercial"
                disabled={cargando}
                className={`mt-3 w-full h-[43px] px-4 rounded-xl bg-surface text-sm text-ink outline-none border transition duration-300
                  ${errors.nombreComercial ? 'border-danger ring-2 ring-danger/20' : 'border-transparent focus:border-primary focus:ring-2 focus:ring-primary/20'}`}
                placeholder="Nombre de tu distribuidora"
                {...register('nombreComercial')}
              />
              {errors.nombreComercial
                ? <p className={errMsg}>{errors.nombreComercial.message}</p>
                : <p className={ayuda}>Aparece en el menú, en el título de la pestaña, en la página pública y en los documentos.</p>}
            </div>

            {/* Colores */}
            <div>
              <SeccionTitulo>Colores</SeccionTitulo>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <CampoColor
                  id="colorPrimario"
                  etiqueta="Primario"
                  ayudaTexto="Botones, menú activo y encabezados."
                  valor={primario}
                  error={errors.colorPrimario}
                  register={register}
                  onPick={pick('colorPrimario')}
                />
                <CampoColor
                  id="colorSecundario"
                  etiqueta="Secundario"
                  ayudaTexto="Detalles y acentos."
                  valor={secundario}
                  error={errors.colorSecundario}
                  register={register}
                  onPick={pick('colorSecundario')}
                />
              </div>
              <p className={ayuda}>Formato hexadecimal, por ejemplo #9E2016.</p>
              {bajoContraste && (
                <div role="status" className="mt-3 flex items-start gap-2 px-3 py-2.5 rounded-xl bg-[#fffbeb] border border-[#fcd34d] text-[#92400e] text-xs leading-[1.5] animate-slide-down">
                  <span className="shrink-0 mt-px"><AlertIcon /></span>
                  <span>
                    El texto blanco sobre el color primario tiene un contraste de{' '}
                    <strong>{contraste.toFixed(1).replace('.', ',')}:1</strong>, menor al mínimo de 4,5:1.
                    Los botones y encabezados podrían leerse con dificultad.
                  </span>
                </div>
              )}
            </div>

            {/* Logotipo */}
            <div>
              <SeccionTitulo>Logotipo</SeccionTitulo>
              <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-4">
                <LogoDistribuidora
                  nombre={prev.nombre}
                  logoUrl={prev.logoUrl}
                  color={prev.primario}
                  className="w-[88px] h-[88px] rounded-2xl text-[26px] border border-border"
                />
                <label className="flex-1 h-[108px] rounded-xl border-2 border-dashed border-divider flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer hover:border-primary/50 hover:bg-surface/60 transition duration-300">
                  <span className="text-faint"><UploadIcon /></span>
                  <span className="text-xs font-semibold text-faint uppercase tracking-[0.6px]">
                    {logoFile ? logoFile.name : 'Cambiar logotipo'}
                  </span>
                  <span className="text-xs text-muted">PNG, JPG o SVG · máximo 2 MB</span>
                  <input
                    type="file"
                    accept=".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml"
                    className="sr-only"
                    onChange={elegirArchivo('logo')}
                  />
                </label>
              </div>
              {errArchivos.logo && <p className={errMsg}>{errArchivos.logo}</p>}
            </div>

            {/* Favicon */}
            <div>
              <SeccionTitulo>Favicon</SeccionTitulo>
              <div className="mt-3 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-surface flex items-center justify-center shrink-0">
                  {prev.faviconUrl ? (
                    <img src={prev.faviconUrl} alt="Favicon" className="w-6 h-6 object-contain" />
                  ) : (
                    <span
                      className="w-6 h-6 rounded-md text-white font-display font-extrabold text-xs flex items-center justify-center"
                      style={{ backgroundColor: prev.primario }}
                    >
                      {iniciales(prev.nombre)[0]}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <label className="inline-flex items-center h-8 px-3.5 rounded-[10px] bg-border text-[13px] font-semibold text-ink cursor-pointer hover:bg-divider transition duration-300 active:scale-[0.97]">
                    {faviconFile ? faviconFile.name : 'Subir favicon'}
                    <input
                      type="file"
                      accept=".png,.ico,image/png,image/x-icon,image/vnd.microsoft.icon"
                      className="sr-only"
                      onChange={elegirArchivo('favicon')}
                    />
                  </label>
                  {errArchivos.favicon
                    ? <p className={errMsg}>{errArchivos.favicon}</p>
                    : <p className="text-xs text-muted mt-1.5">Imagen cuadrada PNG o ICO de máximo 512 KB. Se muestra en la pestaña del navegador.</p>}
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className="pt-2 border-t border-border flex justify-end gap-3">
              <button
                type="button"
                disabled={isSubmitting || !(isDirty || logoFile || faviconFile || errArchivos.logo || errArchivos.favicon)}
                onClick={restablecer}
                className="h-[41px] px-5 rounded-xl bg-border text-ink text-sm font-semibold hover:bg-divider transition duration-300 active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Restablecer
              </button>
              <button
                type="submit"
                disabled={isSubmitting || cargando}
                className="inline-flex items-center gap-2 h-[41px] px-5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition duration-300 active:scale-[0.97] shadow-[0_2px_4px_rgba(0,0,0,0.15)] disabled:opacity-60"
              >
                <ContenidoCarga cargando={isSubmitting} textoCargando="Guardando...">Guardar cambios</ContenidoCarga>
              </button>
            </div>
          </form>

          {/* ── Vista previa ── */}
          <section className={`${card} flex flex-col gap-5 animate-fade-in-up [animation-delay:120ms]`}>
            <div className="flex items-center justify-between gap-3">
              <SeccionTitulo>Vista previa</SeccionTitulo>
              <span className="text-xs text-muted">Se actualiza mientras editas</span>
            </div>

            {/* Pestaña del navegador + aplicación */}
            <div className="rounded-xl border border-divider overflow-hidden">
              <div className="bg-border h-[39px] px-2.5 pt-2 flex items-end">
                <div className="bg-white h-[31px] rounded-t-lg px-3 flex items-center gap-2 max-w-[190px] min-w-0">
                  {prev.faviconUrl ? (
                    <img src={prev.faviconUrl} alt="" className="w-3.5 h-3.5 object-contain shrink-0" />
                  ) : (
                    <span
                      className="w-3.5 h-3.5 rounded-[4px] text-white font-display font-extrabold text-[8px] flex items-center justify-center shrink-0"
                      style={{ backgroundColor: prev.primario }}
                    >
                      {iniciales(prev.nombre)[0]}
                    </span>
                  )}
                  <span className="text-xs text-ink truncate">{prev.nombre} · GELOX</span>
                </div>
              </div>

              <div className="bg-canvas h-[210px] flex">
                <div className="w-[38%] max-w-[171px] bg-white border-r border-border px-2.5 pt-3.5 flex flex-col">
                  <div className="flex items-center gap-2 pb-2 border-b border-border min-w-0">
                    <LogoDistribuidora
                      nombre={prev.nombre}
                      logoUrl={prev.logoUrl}
                      color={prev.primario}
                      className="w-[22px] h-[22px] rounded-full text-[9px]"
                    />
                    <span className="font-display font-extrabold text-xs truncate" style={{ color: prev.primario }}>
                      {prev.nombre}
                    </span>
                  </div>
                  <span
                    className="mt-2.5 h-[27px] flex items-center px-2 border-r-[3px] font-display font-bold text-[11px]"
                    style={{ color: prev.primario, borderColor: prev.primario }}
                  >
                    Vista General
                  </span>
                  {['Reportes', 'Inventarios', 'Ventas'].map((item) => (
                    <span key={item} className="h-[33px] flex items-center px-2 font-display text-[11px] text-[#78716c]">{item}</span>
                  ))}
                </div>
                <div className="flex-1 min-w-0 p-4 flex flex-col gap-2.5">
                  <span className="font-display font-extrabold text-[15px] text-ink">Vista General</span>
                  <div className="grid grid-cols-2 gap-2">
                    {[0, 1].map((i) => (
                      <div key={i} className="h-[50px] bg-white rounded-lg border-t-2" style={{ borderColor: prev.primario }} />
                    ))}
                  </div>
                  <span
                    className="self-start h-7 px-3 rounded-lg text-white text-[11px] font-semibold flex items-center"
                    style={{ backgroundColor: prev.primario }}
                  >
                    Registrar venta
                  </span>
                </div>
              </div>
            </div>

            {/* Planilla impresa */}
            <div className="rounded-xl border border-divider p-4">
              <p className="text-[11px] font-semibold text-muted uppercase tracking-[0.55px] mb-3">
                Planilla de comerciante impresa
              </p>
              <EncabezadoDocumento
                identidad={{ nombreComercial: prev.nombre, logoUrl: prev.logoUrl, colorPrimario: prev.primario }}
                subtitulo={`Planilla diaria · ${hoy}`}
                detalle="Comerciante: [NOMBRE]"
              />
              <div className="mt-2.5 flex flex-col gap-1.5">
                {['w-[92%]', 'w-[80%]', 'w-[86%]'].map((w) => (
                  <div key={w} className={`${w} h-2 rounded bg-border`} />
                ))}
              </div>
            </div>

            {/* Dónde se aplica */}
            <div>
              <p className={subLbl}>Dónde se aplica</p>
              <ul className="mt-2.5 flex flex-wrap gap-2">
                {DONDE_SE_APLICA.map((item) => (
                  <li key={item} className="h-[27px] px-2.5 rounded-full bg-surface flex items-center gap-1.5 text-xs text-faint">
                    <span style={{ color: prev.secundario }}><CheckIcon /></span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>
      </div>

      <SuccessToast
        message="Identidad visual actualizada"
        show={toast}
        onClose={() => setToast(false)}
      />
    </AppLayout>
  );
}
