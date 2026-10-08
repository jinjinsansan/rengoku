// 線のアイコン (design/handoff の見本と同じ形)。色は currentColor。
type P = { size?: number; width?: number }

const base = (size: number, width: number) => ({
  width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: width, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
})

export const IconHome = ({ size = 26, width = 1.6 }: P) => <svg {...base(size, width)}><path d="M4 11L12 4l8 7v9h-6v-6h-4v6H4z" /></svg>
export const IconSalon = ({ size = 26, width = 1.6 }: P) => <svg {...base(size, width)}><path d="M4 5h16v11h-9l-5 4v-4H4z" /></svg>
export const IconHistory = ({ size = 26, width = 1.6 }: P) => <svg {...base(size, width)}><path d="M5 6h14M5 12h14M5 18h9" /></svg>
export const IconCoin = ({ size = 26, width = 1.6 }: P) => (
  <svg {...base(size, width)}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5v9M14.5 9.5h-3.5a1.75 1.75 0 0 0 0 3.5h2a1.75 1.75 0 0 1 0 3.5H9.5" /></svg>
)
export const IconPerson = ({ size = 26, width = 1.6 }: P) => <svg {...base(size, width)}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.5 3.6-7 8-7s8 2.5 8 7" /></svg>
export const IconBell = ({ size = 18, width = 1.7 }: P) => <svg {...base(size, width)}><path d="M6 17V11a6 6 0 0 1 12 0v6l2 2H4z" /><path d="M10 21h4" /></svg>
export const IconMenu = ({ size = 18, width = 1.7 }: P) => <svg {...base(size, width)}><path d="M5 8h14M5 12h14M5 16h14" /></svg>
export const IconCheck = ({ size = 22, width = 1.8 }: P) => <svg {...base(size, width)}><circle cx="12" cy="12" r="10" /><path d="M7.5 12.5l3 3 6-7" /></svg>
