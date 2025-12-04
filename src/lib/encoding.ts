/**
 * Utilidad para corregir problemas de codificación UTF-8
 * Convierte texto mal codificado (Latin1 interpretado como UTF-8) a UTF-8 correcto
 *
 * Ejemplos:
 * - "CHAÃAR" → "CHAÑAR"
 * - "JosÃ©" → "José"
 * - "EspaÃ±a" → "España"
 */

/**
 * Corrige problemas de codificación UTF-8 mal interpretada como Latin1
 * Funciona tanto en Node.js como en el navegador
 */
export function fixEncoding(text: string | null | undefined): string {
  if (!text) return "";

  // Si el texto no contiene caracteres raros, retornarlo tal cual
  if (!/[Ã]/.test(text)) return text;

  try {
    // En Node.js usamos Buffer
    if (typeof Buffer !== 'undefined') {
      const buffer = Buffer.from(text, 'latin1');
      return buffer.toString('utf8');
    }

    // En el navegador usamos TextEncoder/TextDecoder
    if (typeof TextEncoder !== 'undefined' && typeof TextDecoder !== 'undefined') {
      // Convertir string a bytes usando Latin-1
      const bytes = new Uint8Array(text.length);
      for (let i = 0; i < text.length; i++) {
        bytes[i] = text.charCodeAt(i);
      }
      // Decodificar como UTF-8
      const decoder = new TextDecoder('utf-8');
      return decoder.decode(bytes);
    }

    return text;
  } catch {
    return text;
  }
}

/**
 * Convierte una fecha de MySQL a formato ISO string
 * MySQL devuelve Date objects que pueden no ser compatibles con JSON
 */
export function formatMySQLDate(date: any): string | null {
  if (!date) return null;

  try {
    // Si ya es un string válido, devolverlo
    if (typeof date === 'string') {
      const parsed = new Date(date);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString();
      }
      return date;
    }

    // Si es un objeto Date
    if (date instanceof Date) {
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Aplica fixEncoding a todas las propiedades string de un objeto
 * También formatea fechas de MySQL a ISO string
 */
export function fixEncodingObject<T extends Record<string, any>>(obj: T): T {
  const result = { ...obj };

  for (const key in result) {
    const value = result[key];

    // Formatear fechas (detectar por nombre de campo común)
    if ((key.toLowerCase().includes('fecha') || key.toLowerCase().includes('date')) && value) {
      const formattedDate = formatMySQLDate(value);
      if (formattedDate) {
        result[key] = formattedDate as any;
        continue;
      }
    }

    if (typeof value === 'string') {
      result[key] = fixEncoding(value) as any;
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      // Verificar si NO es una instancia de Date
      if (Object.prototype.toString.call(value) !== '[object Date]') {
        result[key] = fixEncodingObject(value);
      }
    } else if (Array.isArray(value)) {
      result[key] = value.map((item: any) => {
        if (typeof item === 'string') {
          return fixEncoding(item);
        } else if (typeof item === 'object' && item !== null) {
          // Verificar si NO es una instancia de Date
          if (Object.prototype.toString.call(item) !== '[object Date]') {
            return fixEncodingObject(item);
          }
        }
        return item;
      }) as any;
    }
  }

  return result;
}
