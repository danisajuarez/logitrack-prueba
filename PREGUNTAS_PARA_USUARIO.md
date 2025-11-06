# PREGUNTAS URGENTES SOBRE LAS TABLAS

## Problema Actual

Los viajes que creamos en la web NO se ven en el sistema principal porque estamos guardando en las tablas equivocadas.

## Tablas Mencionadas

1. `sige_ent_encnegtra` ← Actualmente SÍ guardamos aquí
2. `sige_ecp_enccarpor` ← NO guardamos aquí
3. `sige_icp_intcarpor` ← NO guardamos aquí
4. `SIGE_DCP_DetCarPor` ← NO guardamos aquí
5. `SIGE_OCP_OrdCarPor` ← NO guardamos aquí

## NECESITO SABER:

### 1. ¿De dónde leen los viajes actualmente?

- ¿Cuál es la tabla PRINCIPAL donde el sistema viejo lee los viajes?
- ¿Es `sige_ent_encnegtra` o alguna de las otras?

### 2. ¿Qué representa cada tabla?

Por favor explicar brevemente:

- `sige_ent_encnegtra` = ¿? (encabezado negociación?)
- `sige_ecp_enccarpor` = ¿? (encabezado carta porte?)
- `sige_icp_intcarpor` = ¿? (intermedios?)
- `SIGE_DCP_DetCarPor` = ¿? (detalle?)
- `SIGE_OCP_OrdCarPor` = ¿? (orden de carga?)

### 3. ¿Hay relaciones entre tablas?

- ¿Qué tabla es el "padre" y cuáles son "hijos"?
- ¿Hay foreign keys? ¿Cuáles?

### 4. ¿Podés ejecutar este SQL y pasarme el resultado?

```sql
-- Ver estructura de las tablas
DESCRIBE sige_ent_encnegtra;
DESCRIBE sige_ecp_enccarpor;
DESCRIBE sige_icp_intcarpor;
DESCRIBE SIGE_DCP_DetCarPor;
DESCRIBE SIGE_OCP_OrdCarPor;
```

### 5. ¿Podés mostrarme UN viaje de ejemplo?

Ejecutar esto para ver cómo se ve un viaje completo:

```sql
-- Ejemplo de un viaje que SÍ funciona en el sistema
SELECT * FROM sige_ent_encnegtra LIMIT 1;
SELECT * FROM sige_ecp_enccarpor LIMIT 1;
SELECT * FROM sige_icp_intcarpor LIMIT 1;
SELECT * FROM SIGE_DCP_DetCarPor LIMIT 1;
SELECT * FROM SIGE_OCP_OrdCarPor LIMIT 1;
```

### 6. IMPORTANTE: ¿Cómo crea viajes el sistema viejo?

- ¿Hay un stored procedure que hace los INSERTs?sige_ecp_enccarpor CREATE TABLE `sige_ecp_enccarpor` (
  `ECP_IdEcp` int(11) NOT NULL DEFAULT '0',
  `TCP_IDTipoComp` smallint(6) DEFAULT NULL,
  `ECP_Numero` varchar(100) DEFAULT NULL,
  `ECP_CEE` varchar(20) DEFAULT NULL,
  `ECP_CTG` varchar(20) DEFAULT NULL,
  `ECP_Fecha` datetime DEFAULT NULL,
  `ECP_FechaVencimiento` datetime DEFAULT NULL,
  `EPC_IdEpd` int(11) DEFAULT NULL,
  `TER_IDTerceroEst` int(11) DEFAULT NULL,
  `TER_RazonSocialTerEst` varchar(100) DEFAULT NULL,
  `TER_DomicilioTerEst` varchar(50) DEFAULT NULL,
  `LOC_IDLocalidadEst` varchar(15) DEFAULT NULL,
  `LOC_NomLocalidadEst` varchar(50) DEFAULT NULL,
  `PRO_IDProvinciaEst` smallint(6) DEFAULT NULL,
  `PRO_NomProvinciaEst` varchar(100) DEFAULT NULL,
  `ECP_DirGran` varchar(50) DEFAULT NULL,
  `LOC_IDLocalidadGran` varchar(15) DEFAULT NULL,
  `LOC_NomLocalidadGran` varchar(50) DEFAULT NULL,
  `PRO_IDProvinciaGran` smallint(6) DEFAULT NULL,
  `PRO_NomProvinciaGran` varchar(100) DEFAULT NULL,
  `ECP_PatCamion` varchar(10) DEFAULT NULL,
  `ECP_PatAcoplado` varchar(10) DEFAULT NULL,
  `TER_IDTerceroFlete` int(11) DEFAULT NULL,
  `TER_RazonSocialTerFlete` varchar(100) DEFAULT NULL,
  `ECP_KmRecorrer` double DEFAULT NULL,
  `ECP_TariReferencia` double DEFAULT NULL,
  `ECP_Tarifa` double DEFAULT NULL,
  `ECP_Observaciones` varchar(100) DEFAULT NULL,
  `ECP_CancCompra` char(1) DEFAULT NULL,
  `EFO_IdEfc` int(11) DEFAULT NULL,
  `ECP_CancVenta` char(1) DEFAULT NULL,
  `EFC_IdEfc` int(11) DEFAULT NULL,
  `USU_IdUsuario` smallint(6) DEFAULT '1',
  `EQU_IDEquipo` smallint(6) DEFAULT '1',
  `ECP_PreCartaPorte` char(1) DEFAULT 'N',
  `ECP_TarifaTrans` double DEFAULT NULL,
  `ECP_AdelantoEft` double DEFAULT '0',
  `ECP_Seguro` double DEFAULT '0',
  `TVP_Caracteristicas` varchar(255) DEFAULT '',
  `DEP_IDDeposito` smallint(6) NOT NULL DEFAULT '1',
  `ENT_IdEnt` int(11) DEFAULT '0',
  `ECP_SeguroCarga` double DEFAULT '0',
  `ENT_Tolerancia` double DEFAULT '0',
  `CPE_IdCpeCpra` smallint(6) DEFAULT '1',
  `CPE_IdCpeVta` smallint(6) DEFAULT '1',
  `VEN_IdVendPostula` smallint(6) NOT NULL DEFAULT '0',
  PRIMARY KEY (`ECP_IdEcp`)
  ) ENGINE=MyISAM DEFAULT CHARSET=latin1

- ¿O es código de la aplicación?
- ¿Podés compartir el código/SQL de cómo se crean viajes actualmente?

---

## Por qué necesito esto:

Para crear un viaje correctamente, necesito saber:

1. En qué orden insertar en las tablas
2. Qué campos son obligatorios en cada una
3. Cómo se relacionan entre sí
4. Qué IDs/números usar

**Sin esta información, voy a seguir creando viajes que no se ven en el sistema principal.**
