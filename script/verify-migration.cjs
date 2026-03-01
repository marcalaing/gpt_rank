const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function verify() {
  try {
    const result = await pool.query(`
      SELECT id, name, domain, synonyms 
      FROM projects
      ORDER BY created_at
    `);
    
    console.log('\n Projects after migration:');
    result.rows.forEach(row => {
      console.log(`\n  ${row.name} (${row.id})`);
      console.log(`    domain: ${row.domain || 'NULL'}`);
      console.log(`    synonyms: ${row.synonyms ? JSON.stringify(row.synonyms) : 'NULL'}`);
    });
    
    console.log('\n✓ Migration verification complete');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

verify();
