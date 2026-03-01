import { db } from "../server/db";
import { projects, brands } from "@shared/schema";
import { sql, eq } from "drizzle-orm";

async function migrateBrandsToProjects() {
  console.log("Starting migration: copying brand data to projects...");
  
  try {
    // Get all projects
    const allProjects = await db.select().from(projects);
    console.log(`Found ${allProjects.length} projects`);
    
    // For each project, find its first brand and copy domain/synonyms
    for (const project of allProjects) {
      const projectBrands = await db
        .select()
        .from(brands)
        .where(eq(brands.projectId, project.id))
        .orderBy(brands.createdAt);
      
      if (projectBrands.length > 0) {
        const primaryBrand = projectBrands[0];
        console.log(`Project "${project.name}": migrating brand "${primaryBrand.name}" (domain: ${primaryBrand.domain})`);
        
        await db
          .update(projects)
          .set({
            domain: primaryBrand.domain,
            synonyms: primaryBrand.synonyms,
          })
          .where(eq(projects.id, project.id));
        
        if (projectBrands.length > 1) {
          console.log(`  ⚠️  Project has ${projectBrands.length} brands - using first one only`);
        }
      } else {
        console.log(`Project "${project.name}": no brands found, skipping`);
      }
    }
    
    console.log("\n✅ Migration completed successfully!");
    console.log("Note: brands table is still intact. You can verify the migration before dropping it.");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

migrateBrandsToProjects().then(() => process.exit(0));
