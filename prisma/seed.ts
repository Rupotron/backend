import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting seeding...");

  const categories = [
    { name: "Cleaning", description: "Home and office cleaning services" },
    { name: "Plumbing", description: "Expert plumbing and pipe repairs" },
    { name: "Electrical", description: "Wiring, switch, and appliance repairs" },
    { name: "AC Repair", description: "AC servicing, repair, and installation" },
    { name: "Salon at Home", description: "Beauty and grooming services delivered at home" },
  ];

  const createdCategories = [];
  for (const cat of categories) {
    const createdCat = await prisma.serviceCategory.upsert({
      where: { name: cat.name },
      update: {},
      create: {
        name: cat.name,
        description: cat.description,
      },
    });
    createdCategories.push(createdCat);
    console.log(`Upserted Category: ${createdCat.name}`);
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
    // We don't have a unique constraint on service name in the schema, so we check first or just create.
    // For idempotency, we will just create them if they don't exist under this category.
    const existing = await prisma.service.findFirst({
      where: { name: service.name, categoryId: service.categoryId }
    });

    if (!existing) {
      await prisma.service.create({
        data: service
      });
      console.log(`Created Service: ${service.name}`);
    } else {
      console.log(`Service already exists: ${service.name}`);
    }
  }

  console.log("Seeding finished.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
