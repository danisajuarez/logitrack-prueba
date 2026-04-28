const mysql = require('mysql2/promise');

async function check() {
  const conn = await mysql.createConnection({
    host: '190.188.150.107',
    port: 3307,
    user: 'root',
    password: '',
    database: 'lt'
  });

  const [ent] = await conn.query(
    "SELECT ENT_IdEnt, ENT_Numero FROM sige_ent_encnegtra WHERE ENT_Numero = '2173' OR ENT_IdEnt = 2173"
  );
  console.log('ENT:', JSON.stringify(ent));

  if (ent.length > 0) {
    const entId = ent[0].ENT_IdEnt;
    const [ecp] = await conn.query(
      'SELECT ECP_IdEcp, ECP_Numero FROM sige_ecp_enccarpor WHERE ENT_IdEnt = ? ORDER BY ECP_IdEcp',
      [entId]
    );
    console.log('ECPs:', JSON.stringify(ecp));

    for (const e of ecp) {
      const [dcp] = await conn.query(
        'SELECT ecp_idecp, art_idarticulo, art_desarticulo FROM SIGE_DCP_DetCarPor WHERE ecp_idecp = ?',
        [e.ECP_IdEcp]
      );
      console.log('DCP para ECP ' + e.ECP_IdEcp + ':', JSON.stringify(dcp));
    }
  }

  await conn.end();
}

check().catch(console.error);
