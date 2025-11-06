# Cambios para Validación de Eliminación de Postulación

## Archivo: src/app/api/viajes/postular-chofer/route.ts

### Agregar validación de órdenes de carga antes de eliminar

En el método `DELETE`, después de verificar que la postulación existe (línea 309-315) y **ANTES** de eliminarla, agregar:

```typescript
// ============================================
// VALIDACIÓN: Verificar que no tenga órdenes de carga
// ============================================

// Primero obtener el ECP_IdEcp del viaje
const [ecpRows] = await connection.query<RowDataPacket[]>(
  `SELECT ECP_IdEcp FROM sige_ecp_enccarpor WHERE ENT_IdEnt = ? LIMIT 1`,
  [viajeId]
);

if (Array.isArray(ecpRows) && ecpRows.length > 0) {
  const ecpIdEcp = ecpRows[0].ECP_IdEcp;

  // Verificar si existen órdenes de carga para este viaje
  const [ordersRows] = await connection.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM SIGE_OCP_OrdCarPor WHERE ECP_IdEcp = ?`,
    [ecpIdEcp]
  );

  const ordenesCount = normalizeNumber(ordersRows?.[0]?.total);

  if (ordenesCount > 0) {
    await connection.rollback();
    return NextResponse.json(
      { error: `No se puede eliminar la postulación porque tiene ${ordenesCount} orden(es) de carga asociada(s)` },
      { status: 409 }
    );
  }
}
```

Esta validación debe ir **ANTES** de la línea que hace el DELETE:
```typescript
await connection.query(
  `DELETE FROM viajes_choferes WHERE ${whereClause} LIMIT 1`,
  params
);
```

## Propósito

Esta validación asegura que no se puedan eliminar postulaciones de choferes que ya tienen órdenes de carga (autorizaciones) generadas, manteniendo la integridad de los datos del sistema.
