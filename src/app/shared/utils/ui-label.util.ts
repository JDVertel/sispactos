/** Acrónimos que conservan mayúsculas dentro de etiquetas en oración. */
const UI_LABEL_ACRONYMS: Record<string, string> = {
  bpin: 'BPIN',
  mga: 'MGA',
  frpt: 'FRPT',
  conpes: 'CONPES',
  pei: 'PEI',
  cd: 'CD',
  url: 'URL',
  secop: 'SECOP',
  dnp: 'DNP',
  sispactos: 'SISPACTOS',
  sgr: 'SGR',
  ctel: 'CTEL',
  ocad: 'OCAD',
  frcp: 'FRCP',
  cp: 'CP',
  et: 'ET',
  nit: 'NIT'
};

/**
 * Formato de etiqueta UI: solo la primera letra del texto en mayúscula.
 * Restaura acrónimos conocidos (BPIN, MGA, etc.).
 */
export function formatUiLabel(text: string): string {
  const normalized = text.replace(/[-_]+/g, ' ').trim().replace(/\s+/g, ' ');
  if (!normalized) {
    return '';
  }

  const lower = normalized.toLowerCase();
  let result = lower.charAt(0).toUpperCase() + lower.slice(1);

  for (const [key, acronym] of Object.entries(UI_LABEL_ACRONYMS)) {
    result = result.replace(new RegExp(`\\b${key}\\b`, 'g'), acronym);
  }

  return result;
}
