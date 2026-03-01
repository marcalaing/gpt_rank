import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL);

async function checkUsers() {
  console.log('=== ALL USERS ===');
  const users = await sql`SELECT id, email, google_id, name, created_at FROM users ORDER BY created_at`;
  users.forEach(u => {
    console.log(`ID: ${u.id} | Email: ${u.email} | Google: ${u.google_id || 'null'} | Name: ${u.name}`);
  });

  console.log('\n=== ORGANIZATION MEMBERSHIPS ===');
  const memberships = await sql`
    SELECT om.user_id, u.email, om.organization_id, o.name as org_name, om.role
    FROM organization_members om
    JOIN users u ON u.id = om.user_id
    JOIN organizations o ON o.id = om.organization_id
    ORDER BY u.email
  `;
  memberships.forEach(m => {
    console.log(`User: ${m.email} (${m.user_id}) → Org: ${m.org_name} (${m.organization_id}) [${m.role}]`);
  });

  console.log('\n=== PROJECTS ===');
  const projects = await sql`
    SELECT p.id, p.name, p.domain, p.organization_id, o.name as org_name
    FROM projects p
    JOIN organizations o ON o.id = p.organization_id
    ORDER BY o.name
  `;
  projects.forEach(p => {
    console.log(`Project: ${p.name} (${p.id}) | Domain: ${p.domain} | Org: ${p.org_name} (${p.organization_id})`);
  });

  await sql.end();
}

checkUsers().catch(console.error);
