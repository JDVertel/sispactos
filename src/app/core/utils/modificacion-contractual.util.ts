/** Meses calendario entre dos fechas YYYY-MM-DD (mínimo 0). */
export function calcularMesesNovedad(inicioYmd: string, finYmd: string): number {
  if (!inicioYmd || !finYmd) {
    return 0;
  }
  const inicio = new Date(`${inicioYmd}T12:00:00`);
  const fin = new Date(`${finYmd}T12:00:00`);
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime()) || fin < inicio) {
    return 0;
  }
  let meses = (fin.getFullYear() - inicio.getFullYear()) * 12 + (fin.getMonth() - inicio.getMonth());
  if (fin.getDate() < inicio.getDate()) {
    meses -= 1;
  }
  return Math.max(0, meses);
}
