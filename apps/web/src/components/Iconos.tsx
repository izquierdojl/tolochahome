/** Iconos SVG inline propios (sin dependencias): trazo actual, 24px. */

function base(props: React.SVGProps<SVGSVGElement>, camino: React.ReactNode) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {camino}
    </svg>
  );
}

export function IconoInicio() {
  return base(
    {},
    <>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10.5V20h13v-9.5" />
    </>,
  );
}

export function IconoGestion() {
  return base(
    {},
    <>
      <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
      <circle cx="16" cy="7" r="2.2" />
      <circle cx="10" cy="17" r="2.2" />
    </>,
  );
}

export function IconoUsuario() {
  return base(
    {},
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c1.2-3.2 3.8-5 7-5s5.8 1.8 7 5" />
    </>,
  );
}

export function IconoSol() {
  return base(
    {},
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5 5l1.8 1.8M17.2 17.2 19 19M19 5l-1.8 1.8M6.8 17.2 5 19" />
    </>,
  );
}

export function IconoLuna() {
  return base({}, <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z" />);
}

export function IconoAuto() {
  return base(
    {},
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5" />
      <path d="M4 20h16" strokeDasharray="2 2" />
    </>,
  );
}

export function IconoConfig() {
  return base(
    {},
    <>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </>,
  );
}

export function IconoInfo() {
  return base(
    {},
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <circle cx="12" cy="7.8" r="0.4" fill="currentColor" />
    </>,
  );
}

export function IconoSalir() {
  return base(
    {},
    <>
      <path d="M14 4H6v16h8" />
      <path d="M10 12h11M18 8.5 21.5 12 18 15.5" />
    </>,
  );
}

export function IconoLapiz() {
  return base(
    {},
    <>
      <path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19l-4 1Z" />
    </>,
  );
}

export function IconoPapelera() {
  return base(
    {},
    <>
      <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />
      <path d="M10 11v6M14 11v6" />
    </>,
  );
}

export function IconoMas() {
  return base({}, <path d="M12 5v14M5 12h14" />);
}

export function IconoX() {
  return base({}, <path d="M6 6l12 12M18 6 6 18" />);
}

export function IconoSubir() {
  return base({}, <path d="M6 15l6-6 6 6" />);
}

export function IconoBajar() {
  return base({}, <path d="M6 9l6 6 6-6" />);
}

export function IconoGuardar() {
  return base(
    {},
    <>
      <path d="M4 12.5 9.5 18 20 6.5" />
    </>,
  );
}

export function IconoMenu() {
  return base({}, <path d="M4 7h16M4 12h16M4 17h16" />);
}

export function IconoPlegar() {
  return base({}, <path d="M6 6l6 6 6-6M6 13l6 6 6-6" />);
}

export function IconoDesplegar() {
  return base({}, <path d="M6 18l6-6 6 6M6 11l6-6 6 6" />);
}

export function IconoOjo() {
  return base(
    {},
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>,
  );
}

export function IconoOjoTachado() {
  return base(
    {},
    <>
      <path d="M4 4l16 16" />
      <path d="M10.6 6a15.6 15.6 0 0 1 1.4-.5c6 0 9.5 6.5 9.5 6.5a17.6 17.6 0 0 1-2.7 3.4M6.6 7.9A17 17 0 0 0 2.5 12S6 18.5 12 18.5a9.4 9.4 0 0 0 4.2-1" />
      <path d="M9.9 10.2a3 3 0 0 0 4 4" />
    </>,
  );
}

export function IconoAbrirTodos(props: React.SVGProps<SVGSVGElement>) {
  return base(
    props,
    <>
      <path d="M13 5h6v6" />
      <path d="M19 5l-8 8" />
      <path d="M11 5H6a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5" />
    </>,
  );
}
