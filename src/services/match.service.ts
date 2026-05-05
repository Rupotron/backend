import { prisma } from '../config/prisma';

const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(a));
};

// Simple helper to check if a partner is available right now
// For simplicity, we just check if they are online. In the future, check exact `availabilities`.
const calculateAvailabilityScore = (partner: any) => {
  if (!partner.isOnline || partner.isBusy) return 0;
  // If they have matching time slot -> 1, else -> 0.5. For MVP:
  if (partner.availabilities && partner.availabilities.length > 0) return 1;
  return 0.5; 
};

export const findMatches = async (serviceId: string, lat: number, lon: number, radius: number) => {
  // 1. Fetch eligible partners (DB pre-filter)
  const partners = await prisma.partnerProfile.findMany({
    where: {
      isOnline: true,
      isBusy: false,
      isDeleted: false,
      partnerServices: {
        some: {
          serviceId,
          isActive: true
        }
      }
    },
    include: {
      location: true,
      availabilities: true,
      user: {
        select: { firstName: true, lastName: true }
      }
    },
    take: 100 // Capping initial dataset
  });

  const matches: any[] = [];

  for (const partner of partners) {
    // 2. Handle missing location
    if (!partner.location) continue;

    // 3. Minimum data requirement
    if (partner.totalJobs < 5) continue;

    // Compute distance
    const distance = haversine(lat, lon, partner.location.latitude, partner.location.longitude);

    // Filter radius
    if (distance > radius) continue;

    // 4. Compute Scores
    const distanceScore = 1 / (1 + distance);
    const ratingScore = partner.rating / 5;
    const completionScore = partner.completedJobs / Math.max(1, partner.totalJobs);
    const availabilityScore = calculateAvailabilityScore(partner);

    const score = 
      (0.4 * distanceScore) +
      (0.3 * ratingScore) +
      (0.2 * completionScore) +
      (0.1 * availabilityScore);

    matches.push({
      partnerId: partner.id,
      name: `${partner.user.firstName} ${partner.user.lastName}`,
      distance: parseFloat(distance.toFixed(2)),
      score: parseFloat(score.toFixed(4)),
      rating: partner.rating,
      estimatedArrival: `${Math.ceil(distance * 3 + 10)} mins` // Dummy logic: 3 mins per km + 10 min base
    });
  }

  // 5. Final Sorting & Tie-Breaker
  matches.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score; // Score desc
    if (a.distance !== b.distance) return a.distance - b.distance; // Distance asc
    return b.rating - a.rating; // Rating desc
  });

  // 6. Return top 5
  return {
    partners: matches.slice(0, 5)
  };
};
