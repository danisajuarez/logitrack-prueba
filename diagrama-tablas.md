# Diagrama de Relaciones - Base de Datos del Sistema de Viajes

## Estructura de Tablas y Relaciones

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          MÓDULO DE VIAJES                                    │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────┐
│   viajes_nuevos          │
├──────────────────────────┤
│ • id (PK)                │
│ • numero                 │
│ • fecha                  │
│ • razonSocial            │
│ • origen                 │
│ • destino                │
│ • tarifa                 │
│ • cupos                  │
│ • cuposReservados        │
│ • cuposPendientes        │
│ • usuario                │
│ • equipo                 │
│ • vendedor               │
│ • articulo               │
└────────┬─────────────────┘
         │
         │ 1:N
         │
         ▼
┌──────────────────────────┐
│   viajes_choferes        │◄────────────────┐
├──────────────────────────┤                 │
│ • id (PK)                │                 │
│ • viaje_id (FK)          │                 │
│ • chofer_id (FK)         │────┐            │
│ • vendedor_id (FK)       │────┼────┐       │
│ • pat_chasis             │    │    │       │
│ • pat_acoplado           │    │    │       │
│ • send_email             │    │    │       │
└──────────────────────────┘    │    │       │
                                │    │       │
                                │    │       │
┌───────────────────────────────┼────┼───────┼──────────────────────────────┐
│                    MÓDULO DE TERCEROS Y RELACIONES                         │
└───────────────────────────────┼────┼───────┼──────────────────────────────┘
                                │    │       │
                                │    │       │
                    ┌───────────┘    │       │
                    │                │       │
                    ▼                │       │
         ┌──────────────────────┐   │       │
         │ sige_ter_tercero     │◄──┼───────┘
         ├──────────────────────┤   │
         │ • TER_IDTercero (PK) │   │
         │ • TER_RazonSocialTer │   │
         │ • TER_CUITTer        │   │
         │ • TER_TelefonoTer    │   │
         │ • TER_DomicilioTer   │   │
         │ • TTE_IDTipoTercero  │   │
         │ • CCT_IDCCT          │   │
         └──────┬───────────────┘   │
                │                   │
                │ 1:N               │
                │                   │
                ▼                   │
    ┌────────────────────────────┐ │
    │ sige_tvp_terveipat         │ │
    ├────────────────────────────┤ │
    │ • TER_IDTercero (FK)       │ │  (Transportista)
    │ • TER_IdTerceroAsoc (FK)   │─┘  (Chofer)
    │ • tvp_patente              │
    │ • TVP_PatenteAcoplado      │
    └────────────────────────────┘


┌───────────────────────────────────────────────────────────────────────────┐
│                    MÓDULO DE VENDEDORES                                    │
└───────────────────────────────────────────────────────────────────────────┘

         ┌──────────────────────┐
         │ sige_ven_vendedor    │
         ├──────────────────────┤
         │ • VEN_IDVendedor (PK)│
         │ • VEN_NomVen         │
         └──────────────────────┘
                    ▲
                    │
                    └─────────── Referenciado por viajes_choferes


┌───────────────────────────────────────────────────────────────────────────┐
│                    MÓDULO DE AUTORIZACIONES                                │
└───────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────┐
│ sige_ent_encnegtra       │
├──────────────────────────┤
│ • ENT_IdEnt (PK)         │  (Viaje Legacy)
│ • ENT_Numero             │
│ • ENT_CantCupos          │
│ • ENT_CantCuposReser     │
└────────┬─────────────────┘
         │
         │ 1:N
         │
         ▼
┌──────────────────────────┐
│ SIGE_OCP_OrdCarPor       │
├──────────────────────────┤
│ • ECP_IdEcp (FK)         │  → Viaje
│ • OCP_Renglon (PK)       │
│ • TER_IdTercero (FK)     │──┐  → Estación de Servicio
│ • TER_RazonSocialTer     │  │
│ • ART_IdArticulo         │  │
│ • ART_DesArticulo        │  │  (ADELANTO / COMBUSTIBLE)
│ • OCP_Importe            │  │  ($ para adelantos)
│ • OCP_Cantidad           │  │  (litros para combustible)
│ • OCP_CantPend           │  │
│ • OCP_CantReal           │  │
│ • OCP_CantRealPend       │  │
│ • EFO_IdEfcFac           │  │
│ • EFO_IdEfcRp            │  │
└──────────────────────────┘  │
                              │
                              │
                              ▼
                    ┌──────────────────────┐
                    │ sige_ter_tercero     │
                    │ (Estación Servicio)  │
                    ├──────────────────────┤
                    │ TTE_IDTipoTercero=2  │
                    │ CCT_IDCCT=9          │
                    └──────────────────────┘


┌───────────────────────────────────────────────────────────────────────────┐
│                    OTRAS TABLAS DE REFERENCIA                              │
└───────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────┐   ┌──────────────────────────┐
│ sige_tra_transport       │   │ sige_art_articulo        │
├──────────────────────────┤   ├──────────────────────────┤
│ • TRA_IDTransporte (PK)  │   │ • ART_IdArticulo (PK)    │
│ • TRA_NomTrans           │   │ • ART_DesArticulo        │
└──────────────────────────┘   └──────────────────────────┘


═══════════════════════════════════════════════════════════════════════════
                           FLUJO DE DATOS
═══════════════════════════════════════════════════════════════════════════

1. CREAR VIAJE:
   ┌─────────────┐
   │   Usuario   │
   └──────┬──────┘
          │
          ▼
   ┌──────────────────┐
   │ viajes_nuevos    │  ← Se crea el viaje
   └──────────────────┘

2. ASIGNAR CHOFER:
   ┌─────────────┐
   │   Usuario   │
   └──────┬──────┘
          │
          ▼
   ┌──────────────────────┐
   │ viajes_choferes      │  ← Se postula el chofer al viaje
   │                      │
   │ Valida:              │
   │ • Chofer existe      │
   │ • Vendedor existe    │
   │ • Hay cupos          │
   │ • Relación activa    │
   └──────────────────────┘
          │
          │ Consulta relación
          ▼
   ┌──────────────────────┐
   │ sige_tvp_terveipat   │  ← Obtiene transportista y patentes
   └──────────────────────┘

3. AUTORIZAR ADELANTOS/COMBUSTIBLE:
   ┌─────────────┐
   │   Usuario   │
   └──────┬──────┘
          │
          ▼
   ┌──────────────────────┐
   │ SIGE_OCP_OrdCarPor   │  ← Se crean autorizaciones
   │                      │
   │ • Adelantos ($)      │
   │ • Combustible (lts)  │
   │                      │
   │ Valida:              │
   │ • Chofer postulado   │
   │ • Estación válida    │
   └──────────────────────┘
