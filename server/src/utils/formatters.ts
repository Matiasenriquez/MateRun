/**
 * ==============================================================================
 * UTILIDADES DE FORMATEO Y CÁLCULOS MATEMÁTICOS DE TIEMPOS (MateRun)
 * ==============================================================================
 * Funciones de ayuda para transformar segundos a formatos legibles tipo HH:MM:SS
 * y calcular promedios de distancia y tiempo para las estadísticas de corredores.
 * ==============================================================================
 */

/**
 * Convierte una cantidad de segundos a una cadena legible en formato HH:MM:SS o MM:SS.
 * 
 * @param totalSeconds Cantidad de segundos enteros (ej. 3725)
 * @returns Cadena formateada (ej. "01:02:05")
 */
export const formatSecondsToTime = (totalSeconds: number): string => {
  if (isNaN(totalSeconds) || totalSeconds < 0) {
    return '00:00:00';
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  const pad = (num: number) => num.toString().padStart(2, '0');

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

/**
 * Convierte una cadena de tiempo en formato "HH:MM:SS" a segundos totales.
 * 
 * @param timeStr Cadena en formato "HH:MM:SS" o "MM:SS"
 * @returns Número total de segundos
 */
export const parseTimeToSeconds = (timeStr: string): number => {
  if (!timeStr) return 0;
  const parts = timeStr.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
};
