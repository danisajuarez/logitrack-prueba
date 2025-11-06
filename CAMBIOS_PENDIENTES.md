# Cambios Pendientes para Aplicar

## Archivo: src/app/api/viajes/POST/route.ts

### 1. Agregar ENT_FechaVencimiento

En la línea 82-97, cambiar el INSERT de sige_ent_encnegtra de:

```typescript
const [resultEnt] = await connection.execute(
  `INSERT INTO sige_ent_encnegtra (
    ENT_Numero,
    ENT_Fecha,
    TER_RazonSocialTer,
    ...
  ) VALUES (?, ?, ?, ...)`,
  [
    entNumero,
    fechaSQL,
    razonSocial,
    ...
  ]
);
```

A:

```typescript
const [resultEnt] = await connection.execute(
  `INSERT INTO sige_ent_encnegtra (
    ENT_Numero,
    ENT_Fecha,
    ENT_FechaVencimiento,
    TER_RazonSocialTer,
    ...
  ) VALUES (?, ?, ?, ?, ...)`,
  [
    entNumero,
    fechaSQL,
    fechaSQL, // ENT_FechaVencimiento = ENT_Fecha
    razonSocial,
    ...
  ]
);
```

### 2. Agregar inserción en sige_dnt_detnegtra

Después de `const entIdEnt = resultEnt.insertId;` (línea 115), agregar:

```typescript
// ============================================
// PASO 1.5: Insertar en sige_dnt_detnegtra (Detalle del Negocio)
// ============================================
console.log('[DEBUG] Insertando detalle del negocio en sige_dnt_detnegtra...');

await connection.execute(
  `INSERT INTO sige_dnt_detnegtra (
    ENT_IdEnt,
    DNT_Renglon,
    ART_IdArticulo,
    DNT_Detalle,
    DNT_Cosecha
  ) VALUES (?, ?, ?, ?, ?)`,
  [
    entIdEnt,      // IdInterno (FK a sige_ent_encnegtra)
    1,             // Renglón = 1 (según requisito)
    '7',           // IdArt (mismo que en SIGE_DCP_DetCarPor)
    articulo,      // Detalle
    '',            // Cosecha en blanco (según requisito)
  ]
);

console.log('[DEBUG] Detalle del negocio insertado exitosamente');
```

## Nota

Estos cambios no se pudieron aplicar automáticamente porque parece haber un proceso modificando los archivos (posiblemente yarn dev).
Por favor, aplicar manualmente o detener el servidor de desarrollo y ejecutar los scripts SQL de migración.
