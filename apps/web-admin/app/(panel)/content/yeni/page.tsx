'use client';
import Link from 'next/link';
import { PageHead, Toolbar } from '@/app/_components/ui';
import { YaziFormu } from '../_YaziFormu';

/**
 * YENİ BLOG YAZISI — "/content/yeni".
 *
 * Form eskiden yazı listesinin ÜSTÜNDE her zaman açık duruyordu; listeyi
 * görmek isteyen herkes önce boş bir formu geçmek zorundaydı. Artık forma
 * girmek bilinçli bir adım ve kendi adresi var.
 *
 * Gövde `_YaziFormu` içinde: "yeni" ile "düzenle" birebir aynı formu
 * kullanıyor, tek fark `mevcut` kaydın olup olmaması.
 */
export default function YeniYaziSayfasi() {
  return (
    <>
      <PageHead
        title="Yeni yazı"
        sub="AYNA Blog — tr (kaynak) zorunlu; kk/ru sekmeleri boş kalırsa tr'ye düşer"
      />
      <Toolbar>
        <Link className="btn-sm" href="/content">
          ← Yazı listesi
        </Link>
      </Toolbar>
      <YaziFormu />
    </>
  );
}
