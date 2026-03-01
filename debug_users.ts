import { db } from "./server/db";
import { users, organizations, organizationMembers, projects } from "@shared/schema";
import { eq } from "drizzle-orm";

async function debugUsers() {
  console.log("=== ALL USERS ===");
  const allUsers = await db.select().from(users);
  allUsers.forEach(u => {
    console.log(`ID: ${u.id.substring(0, 8)} | Email: ${u.email} | Google: ${u.googleId || 'null'} | Name: ${u.name}`);
  });

  console.log("\n=== CHECKING FOR DUPLICATE EMAILS (different users) ===");
  const emailMap = new Map<string, typeof allUsers>();
  allUsers.forEach(u => {
    const base = u.email.split('+')[0] + u.email.substring(u.email.indexOf('@'));
    if (!emailMap.has(base)) {
      emailMap.set(base, []);
    }
    emailMap.get(base)!.push(u);
  });
  
  for (const [email, userList] of emailMap.entries()) {
    if (userList.length > 1) {
      console.log(`⚠️  Multiple users for ${email}:`);
      userList.forEach(u => console.log(`   - ${u.id.substring(0, 8)} (google_id: ${u.googleId || 'null'})`));
    }
  }

  console.log("\n=== ORGANIZATION MEMBERSHIPS ===");
  const allMembers = await db
    .select({
      userId: organizationMembers.userId,
      userEmail: users.email,
      orgId: organizationMembers.organizationId,
      orgName: organizations.name,
      role: organizationMembers.role
    })
    .from(organizationMembers)
    .innerJoin(users, eq(organizationMembers.userId, users.id))
    .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id));
  
  allMembers.forEach(m => {
    console.log(`${m.userEmail} (${m.userId.substring(0, 8)}) → ${m.orgName} (${m.orgId.substring(0, 8)}) [${m.role}]`);
  });

  console.log("\n=== PROJECTS ===");
  const allProjects = await db
    .select({
      projectId: projects.id,
      projectName: projects.name,
      domain: projects.domain,
      orgId: projects.organizationId,
      orgName: organizations.name
    })
    .from(projects)
    .innerJoin(organizations, eq(projects.organizationId, organizations.id));
  
  allProjects.forEach(p => {
    console.log(`Project: ${p.projectName} | Domain: ${p.domain} | Org: ${p.orgName} (${p.orgId.substring(0, 8)})`);
  });

  console.log("\n=== USER-TO-PROJECT MAPPING ===");
  for (const user of allUsers) {
    const userOrgs = await db
      .select({ organization: organizations })
      .from(organizationMembers)
      .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
      .where(eq(organizationMembers.userId, user.id));
    
    const userProjects = [];
    for (const orgRecord of userOrgs) {
      const orgProjects = await db
        .select()
        .from(projects)
        .where(eq(projects.organizationId, orgRecord.organization.id));
      userProjects.push(...orgProjects);
    }

    console.log(`\n${user.email} (${user.id.substring(0, 8)}):`);
    console.log(`  Organizations: ${userOrgs.map(o => o.organization.name).join(', ') || 'NONE'}`);
    console.log(`  Projects: ${userProjects.map(p => p.name).join(', ') || 'NONE'}`);
  }

  process.exit(0);
}

debugUsers().catch(console.error);
