import { BadRequestException, Injectable } from '@nestjs/common';
import type { Professional, Quote, ServiceCategory } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateQuoteRequestInput } from './catalog.dto';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async categories() {
    const rows = await this.prisma.serviceCategory.findMany({ orderBy: { sortOrder: 'asc' } });
    return rows.map((c: ServiceCategory) => ({
      id: c.code,
      label: c.nameTr,
      icon: c.icon,
      tone: c.tone,
    }));
  }

  async professionals() {
    const rows = await this.prisma.professional.findMany({ orderBy: { rating: 'desc' } });
    return rows.map(mapPro);
  }

  async quotes() {
    const rows = await this.prisma.quote.findMany({
      include: { professional: true },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((q: Quote & { professional: Professional }) => ({
      id: q.id,
      proId: q.professionalId,
      name: q.professional.name,
      image: q.professional.imageUrl,
      rating: Number(q.professional.rating),
      reviewCount: q.professional.reviewCount,
      friends: q.professional.friends ?? undefined,
      price: Number(q.price),
      etaMin: q.etaMin,
    }));
  }

  async createQuoteRequest(input: CreateQuoteRequestInput) {
    const category = await this.prisma.serviceCategory.findUnique({
      where: { code: input.categoryId },
    });
    if (!category) {
      throw new BadRequestException({ code: 'CATEGORY_NOT_FOUND', message: 'Kategori bulunamadı' });
    }
    const created = await this.prisma.quoteRequest.create({
      data: {
        categoryId: category.id,
        note: input.note ?? null,
        photoUrl: input.photoUrl ?? null,
      },
    });
    return { id: created.id, status: created.status };
  }
}

function mapPro(p: Professional) {
  return {
    id: p.id,
    name: p.name,
    specialty: p.specialty,
    rating: Number(p.rating),
    reviewCount: p.reviewCount,
    friends: p.friends ?? undefined,
    priceFrom: Number(p.priceFrom),
    image: p.imageUrl,
    badge: p.badge,
  };
}
