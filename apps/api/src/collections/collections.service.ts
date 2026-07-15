import { Injectable, NotFoundException } from '@nestjs/common';
import type { Collection } from '@prisma/client';
import { localizeRow, localizeRows } from '../common/i18n';
import { PrismaService } from '../prisma/prisma.service';

// Kürasyon öğesi: üç modül burada birleşir (kategori + editoryal + kampanya + uzman)
type CollectionItem = {
  type: 'category' | 'article' | 'offer' | 'expert';
  id: string;
  sort?: number;
};

function parseItems(raw: string): CollectionItem[] {
  try {
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr
      .filter(
        (x): x is CollectionItem =>
          !!x &&
          typeof x === 'object' &&
          ['category', 'article', 'offer', 'expert'].includes((x as CollectionItem).type) &&
          typeof (x as CollectionItem).id === 'string',
      )
      .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
  } catch {
    return [];
  }
}

function mapCollection(c: Collection) {
  return {
    id: c.id,
    slug: c.slug,
    title: c.title,
    subtitle: c.subtitle,
    occasion: c.occasion,
    heroImage: c.heroImage,
    tone: c.tone,
    startsAt: c.startsAt,
    endsAt: c.endsAt,
    priority: c.priority,
  };
}

@Injectable()
export class CollectionsService {
  constructor(private readonly prisma: PrismaService) {}

  // §3.3 — tarih penceresi OTOMATİK: aktifler; hero için priority sırasıyla maks 2 mobilde kesilir
  async listActive(locale?: string) {
    const now = new Date();
    const rows = await this.prisma.collection.findMany({
      where: { startsAt: { lte: now }, endsAt: { gt: now } },
      orderBy: [{ priority: 'desc' }, { startsAt: 'desc' }],
      take: 10,
    });
    return localizeRows(rows, locale, ['title', 'subtitle']).map(mapCollection);
  }

  // Koleksiyon sayfası: kürasyonlu karma liste — üç modül burada birleşir
  async detail(idOrSlug: string, locale?: string) {
    // UUID değilse yalnız slug ile ara (uuid kolonuna slug verilirse Prisma P2023 fırlatır)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
    const c = await this.prisma.collection
      .findFirst({
        where: isUuid ? { OR: [{ id: idOrSlug }, { slug: idOrSlug }] } : { slug: idOrSlug },
      })
      .catch(() => null);
    if (!c) {
      throw new NotFoundException({ code: 'COLLECTION_NOT_FOUND', message: 'Koleksiyon yok' });
    }
    const items = parseItems(c.itemsJson);
    const ids = (t: CollectionItem['type']) => items.filter((i) => i.type === t).map((i) => i.id);

    const [categories, articles, offers, experts] = await Promise.all([
      this.prisma.serviceCategory.findMany({ where: { code: { in: ids('category') } } }),
      this.prisma.blogArticle.findMany({ where: { id: { in: ids('article') }, published: true } }),
      this.prisma.offer.findMany({
        where: { id: { in: ids('offer') }, status: 'active', endsAt: { gt: new Date() } },
      }),
      this.prisma.professional.findMany({ where: { id: { in: ids('expert') } } }),
    ]);

    const catBy = new Map(categories.map((x) => [x.code, x]));
    const artBy = new Map(
      localizeRows(articles, locale, ['title', 'tag', 'excerpt']).map((x) => [x.id, x]),
    );
    const offBy = new Map(
      localizeRows(offers, locale, ['title', 'description']).map((x) => [x.id, x]),
    );
    const proBy = new Map(experts.map((x) => [x.id, x]));

    // Sırayı KÜRASYON belirler (items sort'u) — tek dokunuş CTA'lar mobilde tip'e göre çözülür
    const resolved = items
      .map((i) => {
        if (i.type === 'category') {
          const x = catBy.get(i.id);
          return x ? { type: 'category', id: x.code, title: x.nameTr, icon: x.icon } : null;
        }
        if (i.type === 'article') {
          const x = artBy.get(i.id);
          return x
            ? { type: 'article', id: x.id, title: x.title, image: x.image, tag: x.tag }
            : null;
        }
        if (i.type === 'offer') {
          const x = offBy.get(i.id);
          return x
            ? {
                type: 'offer',
                id: x.id,
                title: x.title,
                image: x.imageUrl,
                proId: x.proId,
                basePrice: Number(x.basePrice),
                finalPrice: Number(x.finalPrice),
                discountValue: Number(x.discountValue),
              }
            : null;
        }
        const x = proBy.get(i.id);
        return x
          ? { type: 'expert', id: x.id, title: x.name, image: x.imageUrl, subtitle: x.specialty }
          : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    const base = localizeRow(c, locale, ['title', 'subtitle']);
    return { ...mapCollection(base), items: resolved };
  }

  // ── Admin CRUD ──
  async adminList() {
    const rows = await this.prisma.collection.findMany({ orderBy: { startsAt: 'desc' } });
    return rows.map((c) => ({ ...mapCollection(c), itemsJson: c.itemsJson }));
  }

  async upsert(input: {
    id?: string | undefined;
    slug: string;
    title: string;
    subtitle?: string | undefined;
    i18n?: unknown;
    occasion?: string | undefined;
    heroImage?: string | undefined;
    tone?: string | undefined;
    startsAtMs: number;
    endsAtMs: number;
    priority?: number | undefined;
    itemsJson?: string | undefined;
  }) {
    const data = {
      slug: input.slug,
      title: input.title,
      subtitle: input.subtitle ?? '',
      ...(input.i18n ? { i18n: input.i18n as object } : {}),
      occasion: input.occasion ?? 'custom',
      heroImage: input.heroImage ?? '',
      tone: input.tone ?? 'rose',
      startsAt: new Date(input.startsAtMs),
      endsAt: new Date(input.endsAtMs),
      priority: input.priority ?? 0,
      itemsJson: input.itemsJson ?? '[]',
    };
    if (input.id) {
      const row = await this.prisma.collection.update({ where: { id: input.id }, data });
      return mapCollection(row);
    }
    const row = await this.prisma.collection.create({ data });
    return mapCollection(row);
  }

  async remove(id: string) {
    await this.prisma.collection.delete({ where: { id } }).catch(() => undefined);
    return { ok: true };
  }
}
