import { prisma } from "./prisma";

/** Recomputes the cached rating on an apartment from its approved reviews. Call after approving, hiding or deleting a review. */
export async function refreshApartmentRating(apartmentId: string): Promise<void> {
  const agg = await prisma.review.aggregate({ where: { apartmentId, status: "APPROVED" }, _avg: { rating: true }, _count: { _all: true } });
  await prisma.apartment.update({
    where: { id: apartmentId },
    data: { ratingAvg: agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : 0, ratingCount: agg._count._all },
  });
}
