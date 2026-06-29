# ADR-0001: Monorepo yapısı ve teknoloji stack'i

## Durum

Kabul (EK D bağlayıcı kabul edilerek)

## Bağlam

AYNA; mobil uygulama, salon/uzman paneli, admin paneli ve backend API içeren çok-uygulamalı bir üründür. Bu uygulamalar ortak domain tiplerini, doğrulama şemalarını ve i18n metinlerini paylaşır. Spec Bölüm 21 "RN veya Flutter", EK D ise kesin tercihler sunar.

## Karar

1. **pnpm + Turborepo monorepo** (EK D.1) onaylanır.
2. **`packages/domain`** eklenir: saf, framework-bağımsız domain mantığı (ledger, rating, booking state machine, anonimlik kuralları).
3. Stack: React Native + Expo (mobil, Zustand + TanStack Query), Next.js (web panelleri), NestJS + Prisma + PostgreSQL + Redis + BullMQ (backend), Zod (paylaşımlı doğrulama), REST + OpenAPI.
4. **Flutter elenir** — gerekçe: TypeScript paylaşımı (types/validation/i18n) Flutter ile mümkün değil.
5. **GraphQL şimdilik elenir** — MVP sorgu desenleri REST + cursor pagination ile karşılanır.

## Sonuçlar

- (+) Atomik sözleşme değişiklikleri (API + client tek PR).
- (+) Yoğun test edilebilir saf domain katmanı.
- (+) Turborepo cache ile hızlı CI.
- (−) Monorepo araç zinciri kurulum maliyeti (EPIC 1'de bir kez).
- Migration etkisi: Yeni proje; mevcut kod yok, migration maliyeti sıfır.

## İlgili

[02-monorepo-architecture-review](../../planning/02-monorepo-architecture-review.md)
