// The callers provide only known table/key pairs and IDs discovered from this run's fixtures.
export async function fixtureCounts(db, entries) {
  const counts = {};
  for (const [label, [table, key, ids]] of Object.entries(entries)) {
    if (!/^(auth|public)\.[a-z_]+$/.test(table) || !/^[a-z_]+$/.test(key)) {
      throw new Error('Consulta de verificação de fixtures inválida.');
    }
    const result = await db.query(`select count(*)::int as n from ${table} where ${key}=any($1::uuid[])`, [ids]);
    counts[label] = result.rows[0].n;
  }
  return counts;
}
