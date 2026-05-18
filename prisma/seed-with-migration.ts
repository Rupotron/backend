import { PrismaClient } from "@prisma/client";
import { execSync } from "child_process";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting seeding with migration check...");

  try {
    // Test if tables exist by trying a simple query
    const testQuery = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'ServiceCategory'
      );
    `;
    
    const tableExists = (testQuery as any[])[0]?.exists;
    
    if (!tableExists) {
      console.log("[MIGRATION] ServiceCategory table not found. Running migrations...");
      try {
        execSync("npx prisma migrate deploy --skip-generate", { stdio: "inherit" });
        console.log("[MIGRATION] Migrations completed successfully.");
      } catch (migrationError) {
        console.error("[MIGRATION] Error running migrations:", migrationError);
        console.log("[MIGRATION] Attempting alternative migration approach...");
        // If migrate deploy fails, try resolve
        try {
          execSync("npx prisma migrate resolve --rolled-back 20260518180000_init", { 
            stdio: "inherit",
            env: { ...process.env }
          }).catch(() => {
            // Ignore errors from resolve
            console.log("[MIGRATION] Attempting to mark migration as applied...");
          });
          execSync("npx prisma migrate deploy --skip-generate", { stdio: "inherit" });
        } catch (e) {
          console.error("[MIGRATION] Alternative approach also failed.");
        }
      }
    }
  } catch (err) {
    console.error("[SEED] Database connectivity test failed:", err);
    console.log("[SEED] Continuing anyway as tables might be migrating...");
  }

  // Now proceed with seeding
  console.log("[SEED] Starting seeding data...");

  const categories = [
    { name: "Cleaning", description: "Home and office cleaning services" },
    { name: "Plumbing", description: "Expert plumbing and pipe repairs" },
    { name: "Electrical", description: "Wiring, switch, and appliance repairs" },
    { name: "AC Repair", description: "AC servicing, repair, and installation" },
    { name: "Salon at Home", description: "Beauty and grooming services delivered at home" },
  ];

  const createdCategories = [];
  for (const cat of categories) {
    try {
      const createdCat = await prisma.serviceCategory.upsert({
        where: { name: cat.name },
        update: {},
        create: {
          name: cat.name,
          description: cat.description,
        },
      });
      createdCategories.push(createdCat);
      console.log(`[SEED] Upserted Category: ${createdCat.name}`);
    } catch (err) {
      console.error(`[SEED] Error creating category ${cat.name}:`, err);
      throw err;
    }
  }

  // Find categories by name mapping
  const getCatId = (name: string) => createdCategories.find((c) => c.name === name)?.id;

  const services = [
    // Cleaning
    { name: "Bathroom Cleaning", description: "Deep cleaning of bathroom tiles and fixtures", categoryId: getCatId("Cleaning")!, basePrice: 40, durationMinutes: 60 },
    { name: "Kitchen Cleaning", description: "Complete degreasing and surface cleaning", categoryId: getCatId("Cleaning")!, basePrice: 50, durationMinutes: 90 },
    // Plumbing
    { name: "Pipe Leak Fix", description: "Repairing leaking or broken pipes", categoryId: getCatId("Plumbing")!, basePrice: 60, durationMinutes: 45 },
    { name: "Tap Replacement", description: "Replacing old or broken taps", categoryId: getCatId("Plumbing")!, basePrice: 30, durationMinutes: 30 },
    // Electrical
    { name: "Wiring", description: "General electrical wiring work", categoryId: getCatId("Electrical")!, basePrice: 80, durationMinutes: 120 },
    { name: "Switch Repair", description: "Repairing or replacing electrical switches", categoryId: getCatId("Electrical")!, basePrice: 20, durationMinutes: 30 },
    // AC Repair
    { name: "AC Service", description: "Standard AC cleaning and maintenance", categoryId: getCatId("AC Repair")!, basePrice: 70, durationMinutes: 60 },
    { name: "AC Installation", description: "New AC unit installation", categoryId: getCatId("AC Repair")!, basePrice: 150, durationMinutes: 180 },
    // Salon at Home
    { name: "Haircut", description: "Professional haircut at home", categoryId: getCatId("Salon at Home")!, basePrice: 25, durationMinutes: 40 },
    { name: "Facial", description: "Rejuvenating facial treatment", categoryId: getCatId("Salon at Home")!, basePrice: 45, durationMinutes: 60 },
  ];

  for (const service of services) {
    try {
      const existing = await prisma.service.findFirst({
        where: { name: service.name, categoryId: service.categoryId }
      });

      if (!existing) {
        await prisma.service.create({
          data: service
        });
        console.log(`[SEED] Created Service: ${service.name}`);
      } else {
        console.log(`[SEED] Service already exists: ${service.name}`);
      }
    } catch (err) {
      console.error(`[SEED] Error creating service ${service.name}:`, err);
      throw err;
    }
  }

  console.log("[SEED] Seeding finished successfully.");
}

main()
  .catch((e) => {
    console.error("[SEED] FATAL ERROR:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
