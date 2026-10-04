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
      <circle cx="12" cy="12" r="3" />
      <circle cx="12" cy="12" r="1" />
      <path d="M17 12h2M15.5 15.5l1.4 1.4M12 17v2M8.5 15.5l-1.4 1.4M7 12H5M8.5 8.5 7.1 7.1M12 7V5M15.5 8.5l1.4-1.4" />
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
