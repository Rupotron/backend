import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const categoriesData = [
  {
    name: "Home Cleaning",
    slug: "home-cleaning",
    description: "Professional home cleaning services",
    icon: "sparkles",
    displayOrder: 1,
  },
  {
    name: "AC & Appliance Repair",
    slug: "ac-appliance-repair",
    description: "AC and appliance repair services",
    icon: "wrench",
    displayOrder: 2,
  },
  {
    name: "Plumbing",
    slug: "plumbing",
    description: "Professional plumbing services",
    icon: "droplet",
    displayOrder: 3,
  },
  {
    name: "Electrical",
    slug: "electrical",
    description: "Electrical installation and repair",
    icon: "bolt",
    displayOrder: 4,
  },
  {
    name: "Salon at Home",
    slug: "salon-at-home",
    description: "Professional salon services at home",
    icon: "scissors",
    displayOrder: 5,
  },
  {
    name: "Pest Control",
    slug: "pest-control",
    description: "Pest control and treatment services",
    icon: "bug",
    displayOrder: 6,
  },
  {
    name: "Painting & Renovation",
    slug: "painting-renovation",
    description: "Painting and home renovation services",
    icon: "paint-roller",
    displayOrder: 7,
  },
  {
    name: "Car Washing & Detailing",
    slug: "car-washing-detailing",
    description: "Car washing and detailing services",
    icon: "car",
    displayOrder: 8,
  },
  {
    name: "Packers & Movers",
    slug: "packers-movers",
    description: "Moving and relocation services",
    icon: "truck",
    displayOrder: 9,
  },
  {
    name: "Home Repairs & Installation",
    slug: "home-repairs-installation",
    description: "Home repair and installation services",
    icon: "hammer",
    displayOrder: 10,
  },
];

const servicesData = [
  // Home Cleaning
  {
    categorySlug: "home-cleaning",
    name: "Full Home Deep Cleaning",
    slug: "full-home-deep-cleaning",
    description:
      "Complete deep cleaning for bedrooms, bathrooms, kitchen, floors, balconies, and common areas.",
    basePrice: 1499,
    durationMinutes: 240,
    icon: "home",
    isPopular: true,
    displayOrder: 1,
  },
  {
    categorySlug: "home-cleaning",
    name: "Bathroom Cleaning",
    slug: "bathroom-cleaning",
    description:
      "Deep bathroom cleaning including tiles, floor, wash basin, toilet, mirror, and fittings.",
    basePrice: 499,
    durationMinutes: 60,
    icon: "shower-head",
    isPopular: true,
    displayOrder: 2,
  },
  {
    categorySlug: "home-cleaning",
    name: "Kitchen Cleaning",
    slug: "kitchen-cleaning",
    description:
      "Deep kitchen cleaning including platform, sink, tiles, chimney exterior, cabinets exterior, and floor.",
    basePrice: 699,
    durationMinutes: 90,
    icon: "cooking-pot",
    isPopular: true,
    displayOrder: 3,
  },
  {
    categorySlug: "home-cleaning",
    name: "Sofa Cleaning",
    slug: "sofa-cleaning",
    description:
      "Fabric sofa shampooing and vacuum cleaning for dust, stains, and odor removal.",
    basePrice: 599,
    durationMinutes: 75,
    icon: "sofa",
    isPopular: true,
    displayOrder: 4,
  },
  {
    categorySlug: "home-cleaning",
    name: "Carpet Cleaning",
    slug: "carpet-cleaning",
    description:
      "Carpet vacuuming and shampoo cleaning for dirt, dust, and stains.",
    basePrice: 499,
    durationMinutes: 60,
    icon: "carpet",
    isPopular: false,
    displayOrder: 5,
  },
  {
    categorySlug: "home-cleaning",
    name: "Balcony Cleaning",
    slug: "balcony-cleaning",
    description: "Balcony floor, railing, grill, and dust cleaning service.",
    basePrice: 399,
    durationMinutes: 45,
    icon: "building",
    isPopular: false,
    displayOrder: 6,
  },
  {
    categorySlug: "home-cleaning",
    name: "Move-in / Move-out Cleaning",
    slug: "move-in-move-out-cleaning",
    description:
      "Complete empty-house deep cleaning before moving in or after moving out.",
    basePrice: 2499,
    durationMinutes: 360,
    icon: "boxes",
    isPopular: false,
    displayOrder: 7,
  },

  // AC & Appliance Repair
  {
    categorySlug: "ac-appliance-repair",
    name: "AC Service",
    slug: "ac-service",
    description:
      "Wet servicing of split or window AC including filter cleaning and basic performance check.",
    basePrice: 599,
    durationMinutes: 60,
    icon: "air-vent",
    isPopular: true,
    displayOrder: 1,
  },
  {
    categorySlug: "ac-appliance-repair",
    name: "AC Repair",
    slug: "ac-repair",
    description:
      "Inspection and repair support for AC cooling, leakage, noise, or power issues.",
    basePrice: 399,
    durationMinutes: 60,
    icon: "wrench",
    isPopular: true,
    displayOrder: 2,
  },
  {
    categorySlug: "ac-appliance-repair",
    name: "AC Installation",
    slug: "ac-installation",
    description:
      "Professional installation of split or window AC with basic setup.",
    basePrice: 1499,
    durationMinutes: 120,
    icon: "drill",
    isPopular: false,
    displayOrder: 3,
  },
  {
    categorySlug: "ac-appliance-repair",
    name: "Washing Machine Repair",
    slug: "washing-machine-repair",
    description:
      "Inspection and repair support for washing machine drainage, spinning, motor, or leakage issues.",
    basePrice: 399,
    durationMinutes: 60,
    icon: "washing-machine",
    isPopular: false,
    displayOrder: 4,
  },
  {
    categorySlug: "ac-appliance-repair",
    name: "Refrigerator Repair",
    slug: "refrigerator-repair",
    description:
      "Inspection and repair support for refrigerator cooling, compressor, gas leakage, or power issues.",
    basePrice: 399,
    durationMinutes: 60,
    icon: "refrigerator",
    isPopular: false,
    displayOrder: 5,
  },
  {
    categorySlug: "ac-appliance-repair",
    name: "Microwave Repair",
    slug: "microwave-repair",
    description:
      "Diagnosis and repair support for microwave heating, buttons, turntable, or power issues.",
    basePrice: 299,
    durationMinutes: 45,
    icon: "microwave",
    isPopular: false,
    displayOrder: 6,
  },
  {
    categorySlug: "ac-appliance-repair",
    name: "Water Purifier Service",
    slug: "water-purifier-service",
    description:
      "Water purifier filter check, cleaning, servicing, and basic maintenance.",
    basePrice: 499,
    durationMinutes: 60,
    icon: "droplets",
    isPopular: false,
    displayOrder: 7,
  },

  // Plumbing
  {
    categorySlug: "plumbing",
    name: "Tap Repair",
    slug: "tap-repair",
    description: "Repair or replacement support for leaking or damaged taps.",
    basePrice: 249,
    durationMinutes: 45,
    icon: "faucet",
    isPopular: true,
    displayOrder: 1,
  },
  {
    categorySlug: "plumbing",
    name: "Pipe Leakage Repair",
    slug: "pipe-leakage-repair",
    description:
      "Inspection and repair support for visible pipe leakage and seepage issues.",
    basePrice: 399,
    durationMinutes: 60,
    icon: "droplet",
    isPopular: true,
    displayOrder: 2,
  },
  {
    categorySlug: "plumbing",
    name: "Bathroom Fitting Installation",
    slug: "bathroom-fitting-installation",
    description:
      "Installation of shower, health faucet, towel rod, soap holder, and other bathroom fittings.",
    basePrice: 499,
    durationMinutes: 75,
    icon: "shower-head",
    isPopular: false,
    displayOrder: 3,
  },
  {
    categorySlug: "plumbing",
    name: "Water Tank Cleaning",
    slug: "water-tank-cleaning",
    description: "Cleaning and basic sanitization of household water tanks.",
    basePrice: 799,
    durationMinutes: 120,
    icon: "container",
    isPopular: false,
    displayOrder: 4,
  },
  {
    categorySlug: "plumbing",
    name: "Drainage Cleaning",
    slug: "drainage-cleaning",
    description:
      "Cleaning blocked drains, bathroom outlets, and kitchen drainage lines.",
    basePrice: 499,
    durationMinutes: 60,
    icon: "waves",
    isPopular: false,
    displayOrder: 5,
  },
  {
    categorySlug: "plumbing",
    name: "Toilet Repair",
    slug: "toilet-repair",
    description:
      "Repair support for flush tank, leakage, seat cover, and toilet fitting issues.",
    basePrice: 399,
    durationMinutes: 60,
    icon: "toilet",
    isPopular: false,
    displayOrder: 6,
  },
  {
    categorySlug: "plumbing",
    name: "Motor Pump Repair",
    slug: "motor-pump-repair",
    description:
      "Inspection and repair support for domestic water motor pumps.",
    basePrice: 499,
    durationMinutes: 75,
    icon: "settings",
    isPopular: false,
    displayOrder: 7,
  },

  // Electrical
  {
    categorySlug: "electrical",
    name: "Fan Installation",
    slug: "fan-installation",
    description:
      "Ceiling fan installation, replacement, and basic wiring setup.",
    basePrice: 299,
    durationMinutes: 45,
    icon: "fan",
    isPopular: true,
    displayOrder: 1,
  },
  {
    categorySlug: "electrical",
    name: "Light Installation",
    slug: "light-installation",
    description:
      "Installation of LED lights, tube lights, panel lights, or decorative lights.",
    basePrice: 199,
    durationMinutes: 30,
    icon: "lightbulb",
    isPopular: true,
    displayOrder: 2,
  },
  {
    categorySlug: "electrical",
    name: "Switchboard Repair",
    slug: "switchboard-repair",
    description:
      "Repair or replacement support for switches, sockets, and switchboards.",
    basePrice: 249,
    durationMinutes: 45,
    icon: "plug",
    isPopular: false,
    displayOrder: 3,
  },
  {
    categorySlug: "electrical",
    name: "Inverter Installation",
    slug: "inverter-installation",
    description:
      "Installation and basic setup of home inverter and battery connection.",
    basePrice: 799,
    durationMinutes: 90,
    icon: "battery-charging",
    isPopular: false,
    displayOrder: 4,
  },
  {
    categorySlug: "electrical",
    name: "Wiring Repair",
    slug: "wiring-repair",
    description:
      "Inspection and repair support for wiring faults, sparks, or power issues.",
    basePrice: 399,
    durationMinutes: 60,
    icon: "cable",
    isPopular: false,
    displayOrder: 5,
  },
  {
    categorySlug: "electrical",
    name: "Doorbell Installation",
    slug: "doorbell-installation",
    description:
      "Installation or replacement of wired or wireless doorbells.",
    basePrice: 249,
    durationMinutes: 45,
    icon: "bell",
    isPopular: false,
    displayOrder: 6,
  },
  {
    categorySlug: "electrical",
    name: "Geyser Installation",
    slug: "geyser-installation",
    description:
      "Installation or uninstallation of electric water geysers.",
    basePrice: 599,
    durationMinutes: 75,
    icon: "flame",
    isPopular: false,
    displayOrder: 7,
  },

  // Salon at Home
  {
    categorySlug: "salon-at-home",
    name: "Haircut at Home",
    slug: "haircut-at-home",
    description: "Professional haircut service at your home.",
    basePrice: 299,
    durationMinutes: 45,
    icon: "scissors",
    isPopular: true,
    displayOrder: 1,
  },
  {
    categorySlug: "salon-at-home",
    name: "Beard Grooming",
    slug: "beard-grooming",
    description: "Beard trimming, shaping, and grooming service at home.",
    basePrice: 199,
    durationMinutes: 30,
    icon: "razor",
    isPopular: true,
    displayOrder: 2,
  },
  {
    categorySlug: "salon-at-home",
    name: "Facial",
    slug: "facial",
    description:
      "Skin facial service with cleansing, massage, pack, and glow care.",
    basePrice: 799,
    durationMinutes: 75,
    icon: "sparkle",
    isPopular: false,
    displayOrder: 3,
  },
  {
    categorySlug: "salon-at-home",
    name: "Cleanup",
    slug: "cleanup",
    description: "Face cleanup service for freshness, dirt removal, and basic skincare.",
    basePrice: 499,
    durationMinutes: 45,
    icon: "smile",
    isPopular: false,
    displayOrder: 4,
  },
  {
    categorySlug: "salon-at-home",
    name: "Manicure",
    slug: "manicure",
    description: "Nail shaping, cuticle care, hand cleaning, and massage.",
    basePrice: 399,
    durationMinutes: 45,
    icon: "hand",
    isPopular: false,
    displayOrder: 5,
  },
  {
    categorySlug: "salon-at-home",
    name: "Pedicure",
    slug: "pedicure",
    description:
      "Foot cleaning, nail care, dead skin removal, and relaxing massage.",
    basePrice: 499,
    durationMinutes: 60,
    icon: "foot",
    isPopular: false,
    displayOrder: 6,
  },
  {
    categorySlug: "salon-at-home",
    name: "Waxing",
    slug: "waxing",
    description:
      "At-home waxing service for arms, legs, underarms, or full body as selected.",
    basePrice: 699,
    durationMinutes: 90,
    icon: "leaf",
    isPopular: false,
    displayOrder: 7,
  },
  {
    categorySlug: "salon-at-home",
    name: "Bridal Makeup",
    slug: "bridal-makeup",
    description:
      "Premium bridal makeup service with professional finishing.",
    basePrice: 4999,
    durationMinutes: 180,
    icon: "crown",
    isPopular: false,
    displayOrder: 8,
  },

  // Pest Control
  {
    categorySlug: "pest-control",
    name: "Cockroach Pest Control",
    slug: "cockroach-pest-control",
    description:
      "Treatment for cockroach control in kitchen, bathroom, and common areas.",
    basePrice: 799,
    durationMinutes: 90,
    icon: "bug",
    isPopular: true,
    displayOrder: 1,
  },
  {
    categorySlug: "pest-control",
    name: "Termite Treatment",
    slug: "termite-treatment",
    description:
      "Anti-termite treatment for furniture, walls, and affected wooden areas.",
    basePrice: 2499,
    durationMinutes: 180,
    icon: "shield",
    isPopular: false,
    displayOrder: 2,
  },
  {
    categorySlug: "pest-control",
    name: "Bed Bug Treatment",
    slug: "bed-bug-treatment",
    description:
      "Treatment for bed bugs in mattresses, beds, sofas, and hidden corners.",
    basePrice: 1499,
    durationMinutes: 120,
    icon: "bug",
    isPopular: false,
    displayOrder: 3,
  },
  {
    categorySlug: "pest-control",
    name: "Mosquito Control",
    slug: "mosquito-control",
    description:
      "Mosquito control treatment for indoor and outdoor household areas.",
    basePrice: 999,
    durationMinutes: 90,
    icon: "spray-can",
    isPopular: false,
    displayOrder: 4,
  },
  {
    categorySlug: "pest-control",
    name: "General Pest Control",
    slug: "general-pest-control",
    description:
      "General pest control for ants, cockroaches, spiders, and common household pests.",
    basePrice: 1199,
    durationMinutes: 120,
    icon: "shield-check",
    isPopular: false,
    displayOrder: 5,
  },

  // Painting & Renovation
  {
    categorySlug: "painting-renovation",
    name: "Single Room Painting",
    slug: "single-room-painting",
    description:
      "Painting service for one room including wall preparation and finishing.",
    basePrice: 2499,
    durationMinutes: 360,
    icon: "paint-roller",
    isPopular: false,
    displayOrder: 1,
  },
  {
    categorySlug: "painting-renovation",
    name: "Full Home Painting",
    slug: "full-home-painting",
    description:
      "Complete home painting service with wall preparation and professional finish.",
    basePrice: 9999,
    durationMinutes: 1440,
    icon: "paintbrush",
    isPopular: false,
    displayOrder: 2,
  },
  {
    categorySlug: "painting-renovation",
    name: "Wall Putty Work",
    slug: "wall-putty-work",
    description:
      "Wall putty application for smooth wall finishing before painting.",
    basePrice: 1999,
    durationMinutes: 360,
    icon: "layers",
    isPopular: false,
    displayOrder: 3,
  },
  {
    categorySlug: "painting-renovation",
    name: "Waterproofing",
    slug: "waterproofing",
    description:
      "Waterproofing support for damp walls, leakage-prone areas, and seepage issues.",
    basePrice: 2999,
    durationMinutes: 480,
    icon: "shield",
    isPopular: false,
    displayOrder: 4,
  },
  {
    categorySlug: "painting-renovation",
    name: "Minor Civil Repair",
    slug: "minor-civil-repair",
    description:
      "Small household civil repair work for cracks, patches, and minor wall damage.",
    basePrice: 999,
    durationMinutes: 180,
    icon: "hammer",
    isPopular: false,
    displayOrder: 5,
  },
  {
    categorySlug: "painting-renovation",
    name: "Wallpaper Installation",
    slug: "wallpaper-installation",
    description:
      "Professional wallpaper installation for rooms and accent walls.",
    basePrice: 1499,
    durationMinutes: 180,
    icon: "wallpaper",
    isPopular: false,
    displayOrder: 6,
  },

  // Car Washing & Detailing
  {
    categorySlug: "car-washing-detailing",
    name: "Basic Car Wash",
    slug: "basic-car-wash",
    description:
      "Exterior water wash and basic cleaning for hatchback, sedan, and compact cars.",
    basePrice: 299,
    durationMinutes: 45,
    icon: "car",
    isPopular: true,
    displayOrder: 1,
  },
  {
    categorySlug: "car-washing-detailing",
    name: "Premium Car Wash",
    slug: "premium-car-wash",
    description:
      "Exterior foam wash, tyre cleaning, glass cleaning, and basic dashboard wipe.",
    basePrice: 499,
    durationMinutes: 60,
    icon: "car-front",
    isPopular: true,
    displayOrder: 2,
  },
  {
    categorySlug: "car-washing-detailing",
    name: "Interior Vacuum Cleaning",
    slug: "interior-vacuum-cleaning",
    description:
      "Interior vacuum cleaning for seats, mats, dashboard area, and boot space.",
    basePrice: 399,
    durationMinutes: 45,
    icon: "vacuum",
    isPopular: false,
    displayOrder: 3,
  },
  {
    categorySlug: "car-washing-detailing",
    name: "Interior Deep Cleaning",
    slug: "interior-deep-cleaning",
    description:
      "Deep interior cleaning for seats, mats, dashboard, doors, and odor reduction.",
    basePrice: 999,
    durationMinutes: 120,
    icon: "spray-can",
    isPopular: true,
    displayOrder: 4,
  },
  {
    categorySlug: "car-washing-detailing",
    name: "Exterior Foam Wash",
    slug: "exterior-foam-wash",
    description:
      "Foam-based exterior wash for cleaner shine and dust removal.",
    basePrice: 399,
    durationMinutes: 45,
    icon: "bubbles",
    isPopular: false,
    displayOrder: 5,
  },
  {
    categorySlug: "car-washing-detailing",
    name: "Car Polishing",
    slug: "car-polishing",
    description:
      "Exterior car polishing for shine restoration and light surface cleaning.",
    basePrice: 1499,
    durationMinutes: 150,
    icon: "sparkle",
    isPopular: false,
    displayOrder: 6,
  },
  {
    categorySlug: "car-washing-detailing",
    name: "Bike Wash",
    slug: "bike-wash",
    description: "Basic bike wash and dust cleaning for two-wheelers.",
    basePrice: 149,
    durationMinutes: 30,
    icon: "bike",
    isPopular: true,
    displayOrder: 7,
  },
  {
    categorySlug: "car-washing-detailing",
    name: "Monthly Car Wash Subscription",
    slug: "monthly-car-wash-subscription",
    description:
      "Monthly package for regular car washing at your location.",
    basePrice: 1499,
    durationMinutes: 45,
    icon: "calendar-check",
    isPopular: false,
    displayOrder: 8,
  },

  // Packers & Movers
  {
    categorySlug: "packers-movers",
    name: "Local Home Shifting",
    slug: "local-home-shifting",
    description:
      "Local household shifting with packing, loading, transport, and unloading support.",
    basePrice: 2999,
    durationMinutes: 360,
    icon: "truck",
    isPopular: false,
    displayOrder: 1,
  },
  {
    categorySlug: "packers-movers",
    name: "Office Shifting",
    slug: "office-shifting",
    description:
      "Office relocation support including packing, moving, and setup assistance.",
    basePrice: 4999,
    durationMinutes: 480,
    icon: "building",
    isPopular: false,
    displayOrder: 2,
  },
  {
    categorySlug: "packers-movers",
    name: "Furniture Moving",
    slug: "furniture-moving",
    description:
      "Moving support for sofa, bed, cupboard, table, and other household furniture.",
    basePrice: 999,
    durationMinutes: 120,
    icon: "armchair",
    isPopular: false,
    displayOrder: 3,
  },
  {
    categorySlug: "packers-movers",
    name: "Vehicle Transport",
    slug: "vehicle-transport",
    description:
      "Two-wheeler or four-wheeler transport support within or outside city limits.",
    basePrice: 3999,
    durationMinutes: 480,
    icon: "car",
    isPopular: false,
    displayOrder: 4,
  },
  {
    categorySlug: "packers-movers",
    name: "Packing Service Only",
    slug: "packing-service-only",
    description:
      "Professional packing support for household items before shifting.",
    basePrice: 1499,
    durationMinutes: 180,
    icon: "package",
    isPopular: false,
    displayOrder: 5,
  },

  // Home Repairs & Installation
  {
    categorySlug: "home-repairs-installation",
    name: "Furniture Assembly",
    slug: "furniture-assembly",
    description:
      "Assembly support for beds, tables, chairs, cabinets, and other furniture.",
    basePrice: 499,
    durationMinutes: 75,
    icon: "hammer",
    isPopular: false,
    displayOrder: 1,
  },
  {
    categorySlug: "home-repairs-installation",
    name: "Curtain Rod Installation",
    slug: "curtain-rod-installation",
    description:
      "Installation of curtain rods, brackets, and basic drilling support.",
    basePrice: 299,
    durationMinutes: 45,
    icon: "drill",
    isPopular: false,
    displayOrder: 2,
  },
  {
    categorySlug: "home-repairs-installation",
    name: "TV Wall Mounting",
    slug: "tv-wall-mounting",
    description:
      "TV wall mounting with bracket fitting and alignment support.",
    basePrice: 599,
    durationMinutes: 60,
    icon: "tv",
    isPopular: true,
    displayOrder: 3,
  },
  {
    categorySlug: "home-repairs-installation",
    name: "Drill & Hang Service",
    slug: "drill-hang-service",
    description:
      "Drilling and hanging support for frames, clocks, shelves, and wall decor.",
    basePrice: 199,
    durationMinutes: 30,
    icon: "drill",
    isPopular: false,
    displayOrder: 4,
  },
  {
    categorySlug: "home-repairs-installation",
    name: "Door Lock Repair",
    slug: "door-lock-repair",
    description:
      "Door lock repair, replacement, or basic fitting support.",
    basePrice: 399,
    durationMinutes: 60,
    icon: "lock",
    isPopular: false,
    displayOrder: 5,
  },
  {
    categorySlug: "home-repairs-installation",
    name: "Modular Kitchen Repair",
    slug: "modular-kitchen-repair",
    description:
      "Minor repair support for modular kitchen drawers, hinges, shutters, and fittings.",
    basePrice: 799,
    durationMinutes: 90,
    icon: "cabinet",
    isPopular: false,
    displayOrder: 6,
  },
];

async function main() {
  console.log("[SEED] Starting seeding with professional service catalog...");

  try {
    const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (adminEmail && adminPassword) {
      if (adminPassword.length < 8) {
        throw new Error("ADMIN_PASSWORD must be at least 8 characters long.");
      }

      await prisma.user.upsert({
        where: { email: adminEmail },
        update: {
          firstName: process.env.ADMIN_FIRST_NAME || "Shom",
          lastName: process.env.ADMIN_LAST_NAME || "Admin",
          passwordHash: await bcrypt.hash(adminPassword, 10),
          role: "ADMIN",
          isDeleted: false,
        },
        create: {
          email: adminEmail,
          passwordHash: await bcrypt.hash(adminPassword, 10),
          firstName: process.env.ADMIN_FIRST_NAME || "Shom",
          lastName: process.env.ADMIN_LAST_NAME || "Admin",
          role: "ADMIN",
        },
      });

      console.log(`[SEED] Admin account ready: ${adminEmail}`);
    } else {
      console.log("[SEED] ADMIN_EMAIL/ADMIN_PASSWORD not set; skipping admin account seed.");
    }

    // Seed categories
    console.log("[SEED] Seeding service categories...");
    const categoryMap: { [key: string]: string } = {};

    for (const category of categoriesData) {
      const upsertedCategory = await prisma.serviceCategory.upsert({
        where: { slug: category.slug },
        update: {
          name: category.name,
          description: category.description,
          icon: category.icon,
          displayOrder: category.displayOrder,
          isActive: true,
        },
        create: {
          name: category.name,
          slug: category.slug,
          description: category.description,
          icon: category.icon,
          displayOrder: category.displayOrder,
          isActive: true,
        },
      });
      categoryMap[category.slug] = upsertedCategory.id;
      console.log(`  ✓ Upserted category: ${category.name}`);
    }

    // Seed services
    console.log("[SEED] Seeding services...");
    for (const service of servicesData) {
      const categoryId = categoryMap[service.categorySlug];
      if (!categoryId) {
        console.error(
          `  ✗ Category not found: ${service.categorySlug} for service ${service.name}`
        );
        continue;
      }

      const upsertedService = await prisma.service.upsert({
        where: { slug: service.slug },
        update: {
          name: service.name,
          description: service.description,
          basePrice: service.basePrice,
          durationMinutes: service.durationMinutes,
          icon: service.icon,
          isPopular: service.isPopular,
          displayOrder: service.displayOrder,
          isActive: true,
          categoryId: categoryId,
        },
        create: {
          name: service.name,
          slug: service.slug,
          description: service.description,
          basePrice: service.basePrice,
          durationMinutes: service.durationMinutes,
          icon: service.icon,
          isPopular: service.isPopular,
          displayOrder: service.displayOrder,
          isActive: true,
          categoryId: categoryId,
        },
      });
      console.log(
        `  ✓ Upserted service: ${service.name} (₹${service.basePrice})`
      );
    }

    console.log("[SEED] ✓ Seeding completed successfully!");
    console.log(
      `[SEED] - ${Object.keys(categoryMap).length} categories seeded`
    );
    console.log(`[SEED] - ${servicesData.length} services seeded`);
  } catch (error) {
    console.error("[SEED] ✗ Seeding error:", error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error("[SEED] FATAL ERROR:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
