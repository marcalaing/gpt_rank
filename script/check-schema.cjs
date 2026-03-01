const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkSchema() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'projects'
      ORDER BY ordinal_position
    `);
    
    console.log('Projects table columns:');
    result.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type}`);
    });
    
    const hasDomain = result.rows.some(r => r.column_name === 'domain');
    const hasSynonyms = result.rows.some(r => r.column_name === 'synonyms');
    
    console.log('\n✓ Migration needed:', !hasDomain || !hasSynonyms ? 'YES' : 'NO');
    console.log('  domain exists:', hasDomain);
    console.log('  synonyms exists:', hasSynonyms);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkSchema();
