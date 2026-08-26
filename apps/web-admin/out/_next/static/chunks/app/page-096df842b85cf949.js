(self.webpackChunk_N_E = self.webpackChunk_N_E || []).push([
  [974],
  {
    2043: (e, a, s) => {
      Promise.resolve().then(s.bind(s, 3813));
    },
    3813: (e, a, s) => {
      'use strict';
      (s.r(a), s.d(a, { default: () => p }));
      var t = s(4568),
        l = s(7620);
      let i = 'https://ayna-app-production.up.railway.app/api/v1',
        n = 'ayna_admin_token',
        r = () => window.localStorage.getItem(n),
        c = () => window.localStorage.removeItem(n);
      async function d(e, a) {
        var s, t, l;
        let n = r(),
          d = await fetch(''.concat(i).concat(e), {
            ...a,
            headers: {
              'Content-Type': 'application/json',
              ...(n ? { Authorization: 'Bearer '.concat(n) } : {}),
              ...(null != (s = null == a ? void 0 : a.headers) ? s : {}),
            },
          });
        if (!d.ok) {
          let a = String(d.status);
          try {
            let e = await d.json();
            a = null != (l = null == e || null == (t = e.error) ? void 0 : t.code) ? l : a;
          } catch (e) {}
          throw (
            401 === d.status && !e.startsWith('/auth/') && r() && (c(), window.location.reload()),
            Error(a)
          );
        }
        return d.json();
      }
      let o = {
          login: (e, a) =>
            d('/auth/login', {
              method: 'POST',
              body: JSON.stringify({ identifier: e, password: a }),
            }),
          overview: () => d('/admin/overview'),
          stats: (e) => d('/admin/stats?days='.concat(e)),
          commissions: () => d('/admin/commissions'),
          setCommissionRate: (e) =>
            d('/admin/settings/commission-rate', {
              method: 'POST',
              body: JSON.stringify({ value: e }),
            }),
          addPayout: (e) =>
            d('/admin/commissions/payouts', { method: 'POST', body: JSON.stringify(e) }),
          commissionInvoices: () => d('/admin/commissions/invoices'),
          closePeriod: (e, a, s) =>
            d('/admin/commissions/close-period', {
              method: 'POST',
              body: JSON.stringify({ periodStart: e, periodEnd: a, ...(s ? { dueDate: s } : {}) }),
            }),
          collectInvoice: (e) =>
            d('/admin/commissions/invoices/'.concat(e, '/collect'), { method: 'POST' }),
          runOverdue: () => d('/admin/commissions/run-overdue', { method: 'POST' }),
          subscriptions: (e) => d('/admin/subscriptions'.concat(e ? '?status='.concat(e) : '')),
          approveSubscription: function (e) {
            let a = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : 1;
            return d('/admin/subscriptions/'.concat(e, '/approve'), {
              method: 'POST',
              body: JSON.stringify({ months: a }),
            });
          },
          rejectSubscription: (e) =>
            d('/admin/subscriptions/'.concat(e, '/reject'), { method: 'POST' }),
          runSubExpire: () => d('/admin/subscriptions/run-expire', { method: 'POST' }),
          profileChanges: (e) => d('/admin/profile-changes'.concat(e ? '?status='.concat(e) : '')),
          approveProfileChange: (e) =>
            d('/admin/profile-changes/'.concat(e, '/approve'), { method: 'POST' }),
          rejectProfileChange: (e) =>
            d('/admin/profile-changes/'.concat(e, '/reject'), { method: 'POST' }),
          supportList: (e) => d('/admin/support'.concat(e ? '?status='.concat(e) : '')),
          supportReply: (e, a) =>
            d('/admin/support/'.concat(e, '/reply'), {
              method: 'POST',
              body: JSON.stringify({ reply: a }),
            }),
          supportClose: (e) =>
            d('/admin/support/'.concat(e, '/close'), { method: 'POST', body: JSON.stringify({}) }),
          kycQueue: (e) => d('/admin/kyc'.concat(e ? '?status='.concat(e) : '')),
          approveKyc: (e) => d('/admin/kyc/'.concat(e, '/approve'), { method: 'POST' }),
          rejectKyc: (e, a) =>
            d('/admin/kyc/'.concat(e, '/reject'), {
              method: 'POST',
              body: JSON.stringify({ note: a }),
            }),
          businesses: (e) => d('/admin/businesses'.concat(e ? '?status='.concat(e) : '')),
          businessDetail: (e) => d('/admin/businesses/'.concat(e)),
          reviews: () => d('/admin/reviews'),
          hideReview: (e) => d('/admin/reviews/'.concat(e, '/hide'), { method: 'POST' }),
          approveBusiness: (e) => d('/admin/businesses/'.concat(e, '/approve'), { method: 'POST' }),
          rejectBusiness: (e, a) =>
            d('/admin/businesses/'.concat(e, '/reject'), {
              method: 'POST',
              body: JSON.stringify({ reason: a }),
            }),
          decisionBusiness: (e, a, s) =>
            d('/admin/businesses/'.concat(e, '/decision'), {
              method: 'POST',
              body: JSON.stringify({ status: a, reason: s }),
            }),
          verifyBusiness: (e, a) =>
            d('/admin/businesses/'.concat(e, '/verify'), {
              method: 'POST',
              body: JSON.stringify(a),
            }),
          specialists: () => d('/admin/specialists'),
          specialistDetail: (e) => d('/admin/specialists/'.concat(e)),
          verifySpecialist: (e, a) =>
            d('/admin/specialists/'.concat(e, '/verify'), {
              method: 'POST',
              body: JSON.stringify(a),
            }),
          users: () => d('/admin/users'),
          setUserRole: (e, a) =>
            d('/admin/users/'.concat(e, '/role'), {
              method: 'POST',
              body: JSON.stringify({ role: a }),
            }),
          setUserStatus: (e, a) =>
            d('/admin/users/'.concat(e, '/status'), {
              method: 'POST',
              body: JSON.stringify({ status: a }),
            }),
          setUserTier: (e, a) =>
            d('/admin/users/'.concat(e, '/tier'), {
              method: 'POST',
              body: JSON.stringify({ tier: a }),
            }),
          setUserPassword: (e, a) =>
            d('/admin/users/'.concat(e, '/password'), {
              method: 'POST',
              body: JSON.stringify({ password: a }),
            }),
          penalties: () => d('/admin/penalties'),
          restrictUser: (e, a) =>
            d('/admin/users/'.concat(e, '/restrict'), {
              method: 'POST',
              body: JSON.stringify({ reason: a }),
            }),
          unrestrictUser: (e) => d('/admin/users/'.concat(e, '/unrestrict'), { method: 'POST' }),
          cancelBooking: (e) =>
            d('/bookings/'.concat(e, '/cancel'), { method: 'POST', body: JSON.stringify({}) }),
          completeBooking: (e) =>
            d('/bookings/'.concat(e, '/complete'), { method: 'POST', body: JSON.stringify({}) }),
          bookings: (e) =>
            d('/admin/bookings'.concat(e && 'all' !== e ? '?status='.concat(e) : '')),
          quoteRequests: () => d('/admin/quote-requests'),
          loyalty: () => d('/admin/loyalty'),
          featureFlags: () => d('/admin/feature-flags'),
          setFeatureFlag: (e, a, s) =>
            d('/admin/feature-flags', {
              method: 'POST',
              body: JSON.stringify(
                void 0 !== s ? { key: e, enabled: a, description: s } : { key: e, enabled: a },
              ),
            }),
          auditLogs: () => d('/admin/audit-logs'),
          campaigns: () => d('/admin/campaigns'),
          createCampaign: (e) => d('/admin/campaigns', { method: 'POST', body: JSON.stringify(e) }),
          setCampaignActive: (e, a) =>
            d('/admin/campaigns/'.concat(e, '/active'), {
              method: 'POST',
              body: JSON.stringify({ active: a }),
            }),
          deleteCampaign: (e) => d('/admin/campaigns/'.concat(e), { method: 'DELETE' }),
          ads: () => d('/admin/ads'),
          createAd: (e) => d('/admin/ads', { method: 'POST', body: JSON.stringify(e) }),
          setAdActive: (e, a) =>
            d('/admin/ads/'.concat(e, '/active'), {
              method: 'POST',
              body: JSON.stringify({ active: a }),
            }),
          deleteAd: (e) => d('/admin/ads/'.concat(e), { method: 'DELETE' }),
          professionals: () => d('/admin/professionals'),
          createProfessional: (e) =>
            d('/admin/professionals', { method: 'POST', body: JSON.stringify(e) }),
          updateProfessional: (e, a) =>
            d('/admin/professionals/'.concat(e), { method: 'PATCH', body: JSON.stringify(a) }),
          deleteProfessional: (e) => d('/admin/professionals/'.concat(e), { method: 'DELETE' }),
          setFeatured: (e, a) =>
            d('/admin/professionals/'.concat(e, '/feature'), {
              method: 'POST',
              body: JSON.stringify({ featured: a }),
            }),
          categories: () => d('/admin/categories'),
          createCategory: (e) =>
            d('/admin/categories', { method: 'POST', body: JSON.stringify(e) }),
          updateCategory: (e, a) =>
            d('/admin/categories/'.concat(e), { method: 'PATCH', body: JSON.stringify(a) }),
          deleteCategory: (e) => d('/admin/categories/'.concat(e), { method: 'DELETE' }),
          marketPrices: () => d('/admin/market-prices'),
          setMarketPrice: (e) =>
            d('/admin/market-prices', { method: 'POST', body: JSON.stringify(e) }),
          blogArticles: () => d('/admin/content/articles'),
          createArticle: (e) =>
            d('/admin/content/articles', { method: 'POST', body: JSON.stringify(e) }),
          updateArticle: (e, a) =>
            d('/admin/content/articles/'.concat(e), { method: 'PATCH', body: JSON.stringify(a) }),
          deleteArticle: (e) => d('/admin/content/articles/'.concat(e), { method: 'DELETE' }),
          blogApplications: () => d('/admin/content/applications'),
          reviewApplication: (e, a) =>
            d('/admin/content/applications/'.concat(e), {
              method: 'PATCH',
              body: JSON.stringify(a),
            }),
          themes: () => d('/admin/content/themes'),
          createTheme: (e) =>
            d('/admin/content/themes', { method: 'POST', body: JSON.stringify(e) }),
          activateTheme: (e) =>
            d('/admin/content/themes/'.concat(e, '/activate'), { method: 'POST' }),
          announcements: () => d('/admin/content/announcements'),
          sendAnnouncement: (e) =>
            d('/admin/content/announcements', { method: 'POST', body: JSON.stringify(e) }),
          circleQueue: () => d('/admin/circle/queue'),
          moderateCircle: (e, a) =>
            d('/admin/circle/posts/'.concat(e, '/moderate'), {
              method: 'POST',
              body: JSON.stringify({ decision: a }),
            }),
          disputes: () => d('/admin/disputes'),
          resolveDispute: (e, a, s) =>
            d('/admin/disputes/'.concat(e, '/resolve'), {
              method: 'POST',
              body: JSON.stringify({ decision: a, ...(s ? { resolution: s } : {}) }),
            }),
          reviewDisputes: () => d('/admin/reviews/disputes'),
          resolveReviewDispute: (e, a) =>
            d('/admin/reviews/'.concat(e, '/resolve'), {
              method: 'POST',
              body: JSON.stringify({ action: a }),
            }),
          systemSettings: () => d('/admin/system'),
          setRate: (e, a) =>
            d('/admin/system/rate', { method: 'POST', body: JSON.stringify({ key: e, value: a }) }),
          setApiKey: (e, a) =>
            d('/admin/system/api-key', {
              method: 'POST',
              body: JSON.stringify({ provider: e, value: a }),
            }),
          testApiKey: (e) => d('/admin/system/api-key/'.concat(e, '/test'), { method: 'POST' }),
          setCities: (e, a) =>
            d('/admin/system/cities', {
              method: 'POST',
              body: JSON.stringify({ active: e, soon: a }),
            }),
          categoryConfig: () => d('/admin/system/categories'),
          setCategoryConfig: (e) =>
            d('/admin/system/categories', { method: 'POST', body: JSON.stringify(e) }),
        },
        m = (e) => '₸' + e.toLocaleString('tr-TR');
      function u(e, a) {
        if (0 === a.length) return;
        let s = Object.keys(a[0]),
          t = new Blob(
            [
              '\uFEFF' +
                [
                  s.join(';'),
                  ...a.map((e) =>
                    s
                      .map((a) => {
                        let s;
                        return (
                          (s = e[a]),
                          '"'.concat(String(null != s ? s : '').replace(/"/g, '""'), '"')
                        );
                      })
                      .join(';'),
                  ),
                ].join('\n'),
            ],
            { type: 'text/csv;charset=utf-8' },
          ),
          l = document.createElement('a');
        ((l.href = URL.createObjectURL(t)),
          (l.download = e),
          l.click(),
          URL.revokeObjectURL(l.href));
      }
      function p() {
        let [e, a] = (0, l.useState)(!1),
          [s, i] = (0, l.useState)(!1),
          [n, d] = (0, l.useState)('overview'),
          [m, u] = (0, l.useState)(null);
        if (
          ((0, l.useEffect)(() => {
            (a(!!r()), i(!0));
          }, []),
          (0, l.useEffect)(() => {
            if (!e) return;
            let a = !0,
              s = () =>
                o
                  .overview()
                  .then((e) => {
                    var s;
                    return a && u(null != (s = e.pending) ? s : null);
                  })
                  .catch(() => void 0);
            s();
            let t = setInterval(s, 3e4);
            return () => {
              ((a = !1), clearInterval(t));
            };
          }, [e, n]),
          !s)
        )
          return null;
        if (!e) return (0, t.jsx)(h, { onDone: () => a(!0) });
        let p = [
          {
            title: 'PANO',
            items: [
              { id: 'overview', label: 'Genel Bakış', icon: '\uD83D\uDCCA' },
              { id: 'stats', label: 'İstatistik', icon: '\uD83D\uDCC8' },
            ],
          },
          {
            title: 'ONAY KUYRUĞU',
            items: [
              {
                id: 'businesses',
                label: 'Salon Onayları',
                icon: '\uD83C\uDFEA',
                badge: null == m ? void 0 : m.businesses,
              },
              { id: 'specialists', label: 'Uzman Doğrulama', icon: '\uD83D\uDC87', badge: void 0 },
              {
                id: 'kyc',
                label: 'Kimlik (KYC)',
                icon: '\uD83E\uDEAA',
                badge: null == m ? void 0 : m.kyc,
              },
              { id: 'support', label: 'Destek Talepleri', icon: '\uD83C\uDD98', badge: void 0 },
              {
                id: 'profileChanges',
                label: 'Profil Değişiklikleri',
                icon: '\uD83D\uDCDD',
                badge: null == m ? void 0 : m.profileChanges,
              },
              {
                id: 'subscriptions',
                label: 'Abonelik Dekontları',
                icon: '\uD83D\uDC8E',
                badge: null == m ? void 0 : m.subscriptions,
              },
              {
                id: 'disputes',
                label: 'Depozito İtirazları',
                icon: '⚖️',
                badge: null == m ? void 0 : m.disputes,
              },
              {
                id: 'reviewDisputes',
                label: 'Yorum İtirazları',
                icon: '\uD83D\uDDE3️',
                badge: null == m ? void 0 : m.reviewDisputes,
              },
              {
                id: 'moderation',
                label: 'W2W Moderasyon',
                icon: '\uD83D\uDEE1️',
                badge: null == m ? void 0 : m.circle,
              },
            ],
          },
          {
            title: '\xdcYELER',
            items: [
              { id: 'users', label: 'T\xfcm \xdcyeler', icon: '\uD83D\uDC65' },
              { id: 'penalties', label: 'Ceza Takibi', icon: '⛔' },
            ],
          },
          {
            title: 'PAZAR',
            items: [
              { id: 'quotes', label: 'Canlı Talepler', icon: '\uD83D\uDCE9' },
              { id: 'professionals', label: 'Keşfet Kataloğu', icon: '\uD83D\uDC87' },
              { id: 'services', label: 'Hizmet Kategorileri', icon: '\uD83D\uDDC2️' },
              { id: 'prices', label: 'Taban Fiyatlar', icon: '\uD83C\uDFF7️' },
            ],
          },
          {
            title: 'İ\xc7ERİK & PAZARLAMA',
            items: [
              { id: 'content', label: 'Blog & Tema', icon: '\uD83D\uDCF0' },
              { id: 'announcements', label: 'Duyurular', icon: '\uD83D\uDCE3' },
              { id: 'campaigns', label: 'Kampanyalar', icon: '\uD83C\uDFAF' },
              { id: 'ads', label: 'Tedarik\xe7i Reklamları', icon: '\uD83D\uDCE2' },
            ],
          },
          {
            title: 'FİNANS',
            items: [
              { id: 'commissions', label: 'Komisyon Takibi', icon: '\uD83D\uDCB0' },
              { id: 'loyalty', label: 'Puan Ekonomisi', icon: '\uD83C\uDF81' },
            ],
          },
          {
            title: 'SİSTEM',
            items: [
              { id: 'system', label: 'Ayarlar & API', icon: '⚙️' },
              { id: 'flags', label: '\xd6zellik Anahtarları', icon: '\uD83D\uDEA9' },
              { id: 'audit', label: 'Denetim Kaydı', icon: '\uD83D\uDCDC' },
            ],
          },
        ];
        return (0, t.jsxs)('div', {
          className: 'shell',
          children: [
            (0, t.jsxs)('aside', {
              className: 'sidebar',
              style: { display: 'flex', flexDirection: 'column', overflowY: 'auto' },
              children: [
                (0, t.jsx)('div', { className: 'side-brand', children: 'AYNA' }),
                p.map((e) =>
                  (0, t.jsxs)(
                    'div',
                    {
                      children: [
                        (0, t.jsx)('div', {
                          style: {
                            padding: '10px 14px 4px',
                            fontSize: 10,
                            fontWeight: 800,
                            letterSpacing: 1,
                            opacity: 0.55,
                          },
                          children: e.title,
                        }),
                        e.items.map((e) =>
                          (0, t.jsxs)(
                            'button',
                            {
                              className: 'nav-item '.concat(n === e.id ? 'active' : ''),
                              onClick: () => d(e.id),
                              children: [
                                (0, t.jsx)('span', { children: e.icon }),
                                ' ',
                                e.label,
                                e.badge
                                  ? (0, t.jsx)('span', {
                                      style: {
                                        marginLeft: 'auto',
                                        background: '#e5484d',
                                        color: '#fff',
                                        borderRadius: 999,
                                        fontSize: 11,
                                        fontWeight: 800,
                                        padding: '1px 7px',
                                      },
                                      children: e.badge,
                                    })
                                  : null,
                              ],
                            },
                            e.id,
                          ),
                        ),
                      ],
                    },
                    e.title,
                  ),
                ),
                (0, t.jsxs)('button', {
                  className: 'nav-item logout',
                  onClick: () => {
                    (c(), a(!1));
                  },
                  children: [(0, t.jsx)('span', { children: '↩' }), ' \xc7ıkış'],
                }),
              ],
            }),
            (0, t.jsxs)('main', {
              className: 'main',
              children: [
                'overview' === n && (0, t.jsx)(S, { onGo: d }),
                'stats' === n && (0, t.jsx)(O, {}),
                'commissions' === n && (0, t.jsx)(A, {}),
                'subscriptions' === n && (0, t.jsx)(f, {}),
                'profileChanges' === n && (0, t.jsx)(k, {}),
                'kyc' === n && (0, t.jsx)(N, {}),
                'support' === n && (0, t.jsx)(b, {}),
                'businesses' === n && (0, t.jsx)(B, {}),
                'specialists' === n && (0, t.jsx)(E, {}),
                'professionals' === n && (0, t.jsx)(H, {}),
                'services' === n && (0, t.jsx)(V, {}),
                'prices' === n && (0, t.jsx)(Q, {}),
                'bookings' === n && (0, t.jsx)(et, {}),
                'disputes' === n && (0, t.jsx)(el, {}),
                'reviewDisputes' === n && (0, t.jsx)(ei, {}),
                'quotes' === n && (0, t.jsx)(en, {}),
                'campaigns' === n && (0, t.jsx)(I, {}),
                'ads' === n && (0, t.jsx)(M, {}),
                'moderation' === n && (0, t.jsx)(Y, {}),
                'content' === n && (0, t.jsx)(J, {}),
                'announcements' === n && (0, t.jsx)(W, {}),
                'users' === n && (0, t.jsx)(ea, {}),
                'penalties' === n && (0, t.jsx)($, {}),
                'loyalty' === n && (0, t.jsx)(er, {}),
                'flags' === n && (0, t.jsx)(ec, {}),
                'system' === n && (0, t.jsx)(ed, {}),
                'audit' === n && (0, t.jsx)(em, {}),
              ],
            }),
          ],
        });
      }
      function h(e) {
        let { onDone: a } = e,
          [s, i] = (0, l.useState)(''),
          [r, c] = (0, l.useState)(''),
          [d, m] = (0, l.useState)(''),
          [u, p] = (0, l.useState)(!1),
          h = async () => {
            (p(!0), m(''));
            try {
              let e,
                t = await o.login(s.trim(), r);
              if ('admin' !== t.user.role) return void m('Bu hesap admin değil.');
              ((e = t.token), window.localStorage.setItem(n, e), a());
            } catch (e) {
              m('Giriş başarısız. Bilgileri kontrol et.');
            } finally {
              p(!1);
            }
          };
        return (0, t.jsx)('div', {
          className: 'login-wrap',
          children: (0, t.jsxs)('div', {
            className: 'login-card',
            children: [
              (0, t.jsxs)('div', {
                className: 'brand',
                children: ['AYNA', (0, t.jsx)('small', { children: 'Y\xd6NETİM PANELİ' })],
              }),
              (0, t.jsxs)('div', {
                className: 'field',
                children: [
                  (0, t.jsx)('label', { children: 'E-posta' }),
                  (0, t.jsx)('input', {
                    className: 'input',
                    value: s,
                    onChange: (e) => i(e.target.value),
                    placeholder: 'admin',
                    autoFocus: !0,
                  }),
                ],
              }),
              (0, t.jsxs)('div', {
                className: 'field',
                children: [
                  (0, t.jsx)('label', { children: 'Şifre' }),
                  (0, t.jsx)('input', {
                    className: 'input',
                    type: 'password',
                    value: r,
                    onChange: (e) => c(e.target.value),
                    onKeyDown: (e) => 'Enter' === e.key && h(),
                  }),
                ],
              }),
              d ? (0, t.jsx)('div', { className: 'err', children: d }) : null,
              (0, t.jsx)('button', {
                className: 'btn',
                onClick: h,
                disabled: u || !s || !r,
                children: u ? '…' : 'Giriş yap',
              }),
            ],
          }),
        });
      }
      function g(e) {
        let a = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : [],
          [s, t] = (0, l.useState)(null),
          [i, n] = (0, l.useState)(!0),
          [r, c] = (0, l.useState)(null),
          d = (0, l.useCallback)(() => {
            (n(!0),
              c(null),
              e()
                .then((e) => {
                  (t(e), c(null));
                })
                .catch((e) => {
                  (t(null), c(e instanceof Error ? e.message : 'Bağlantı hatası'));
                })
                .finally(() => n(!1)));
          }, a);
        return ((0, l.useEffect)(d, [d]), { data: s, loading: i, error: r, reload: d });
      }
      function v(e) {
        let { loading: a, error: s, onRetry: l } = e;
        if (a) return (0, t.jsx)('div', { className: 'empty', children: 'Y\xfckleniyor…' });
        let i = 'UNAUTHENTICATED' === s || '401' === s || 'FORBIDDEN' === s || '403' === s;
        return (0, t.jsxs)('div', {
          className: 'empty',
          children: [
            (0, t.jsx)('div', {
              style: { color: 'var(--danger)', fontWeight: 700, marginBottom: 8 },
              children: i ? 'Oturum ge\xe7ersiz' : 'Veri y\xfcklenemedi',
            }),
            (0, t.jsx)('div', {
              style: { fontSize: 13, marginBottom: 14 },
              children: i
                ? 'Oturumun s\xfcresi dolmuş ya da ge\xe7ersiz. \xc7ıkış yapıp yeniden giriş yap.'
                : 'Failed to fetch' === s
                  ? 'API sunucusuna ulaşılamıyor (http://localhost:3000 \xe7alışıyor mu?).'
                  : 'Hata: '.concat(null != s ? s : 'bilinmiyor'),
            }),
            (0, t.jsx)('div', {
              style: { display: 'flex', gap: 8, justifyContent: 'center' },
              children: i
                ? (0, t.jsx)('button', {
                    className: 'btn-sm',
                    onClick: () => {
                      (c(), window.location.reload());
                    },
                    children: '\xc7ıkış yap & yeniden gir',
                  })
                : l
                  ? (0, t.jsx)('button', {
                      className: 'btn-sm',
                      onClick: l,
                      children: 'Tekrar dene',
                    })
                  : null,
            }),
          ],
        });
      }
      let y = ['tr', 'kk', 'ru'];
      function x(e) {
        let { lang: a, setLang: s, filled: l } = e;
        return (0, t.jsx)('div', {
          className: 'toolbar full',
          style: { marginBottom: 0 },
          children: y.map((e) =>
            (0, t.jsxs)(
              'button',
              {
                type: 'button',
                className: 'chip '.concat(a === e ? 'on' : ''),
                onClick: () => s(e),
                children: [e.toUpperCase(), 'tr' === e ? ' (kaynak)' : l(e) ? ' ✓' : ' —'],
              },
              e,
            ),
          ),
        });
      }
      function j(e) {
        let a = {};
        for (let s of ['kk', 'ru']) {
          let t = {};
          for (let [a, l] of Object.entries(e)) l[s].trim() && (t[a] = l[s].trim());
          Object.keys(t).length && (a[s] = t);
        }
        return Object.keys(a).length ? a : void 0;
      }
      function k() {
        var e;
        let [a, s] = (0, l.useState)('pending'),
          {
            data: i,
            loading: n,
            error: r,
            reload: c,
          } = g(() => o.profileChanges(a || void 0), [a]),
          [d, m] = (0, l.useState)(null),
          u = async (e, a) => {
            m(a);
            try {
              (await e(), c());
            } finally {
              m(null);
            }
          };
        return (0, t.jsxs)(t.Fragment, {
          children: [
            (0, t.jsx)('h1', { className: 'page-title', children: 'Profil Onayları' }),
            (0, t.jsxs)('p', {
              className: 'page-sub',
              children: [
                'Salon/uzman profil değişiklikleri admin onayı olmadan yayınlanmaz (',
                null != (e = null == i ? void 0 : i.length) ? e : 0,
                ' ',
                'kayıt)',
              ],
            }),
            (0, t.jsx)('div', {
              className: 'toolbar',
              children: [
                ['pending', 'Bekleyen'],
                ['approved', 'Onaylanan'],
                ['rejected', 'Reddedilen'],
                ['', 'T\xfcm\xfc'],
              ].map((e) => {
                let [l, i] = e;
                return (0, t.jsx)(
                  'button',
                  {
                    className: 'chip '.concat(a === l ? 'on' : ''),
                    onClick: () => s(l),
                    children: i,
                  },
                  l || 'all',
                );
              }),
            }),
            i
              ? 0 === i.length
                ? (0, t.jsx)('div', {
                    className: 'card',
                    children: (0, t.jsx)('div', { className: 'empty', children: 'Kayıt yok.' }),
                  })
                : (0, t.jsx)('div', {
                    className: 'card',
                    children: i.map((e) =>
                      (0, t.jsxs)(
                        'div',
                        {
                          className: 'list-row',
                          children: [
                            (0, t.jsxs)('div', {
                              className: 'grow',
                              children: [
                                (0, t.jsxs)('div', {
                                  className: 'name',
                                  children: [
                                    e.userName,
                                    ' ',
                                    (0, t.jsx)('span', {
                                      className: 'pill '.concat(
                                        'salon' === e.role ? 'info' : 'accent',
                                      ),
                                      children: 'salon' === e.role ? 'Salon' : 'Uzman',
                                    }),
                                  ],
                                }),
                                (0, t.jsxs)('div', {
                                  className: 'meta',
                                  children: [
                                    ((e) => {
                                      let a = [];
                                      'string' == typeof e.name &&
                                        a.push('İsim → "'.concat(e.name, '"'));
                                      let s = e.salonProfile;
                                      return (
                                        s &&
                                          (s.about && a.push('Hakkında'),
                                          s.address && a.push('Adres'),
                                          s.contact && a.push('İletişim'),
                                          Array.isArray(s.photos) &&
                                            a.push(''.concat(s.photos.length, ' foto')),
                                          Array.isArray(s.areas) && a.push('Hizmet alanları')),
                                        e.social && a.push('Sosyal medya'),
                                        e.hours && a.push('\xc7alışma saatleri'),
                                        Array.isArray(e.certs) &&
                                          a.push(''.concat(e.certs.length, ' sertifika')),
                                        a.length ? a.join(' \xb7 ') : 'Değişiklik'
                                      );
                                    })(e.changes),
                                    ' \xb7 ',
                                    new Date(e.createdAt).toLocaleDateString('tr-TR'),
                                  ],
                                }),
                              ],
                            }),
                            (0, t.jsx)('span', {
                              className: 'pill '.concat(
                                'approved' === e.status
                                  ? 'approved'
                                  : 'pending' === e.status
                                    ? 'pending'
                                    : 'rejected',
                              ),
                              children:
                                'approved' === e.status
                                  ? 'Onaylandı'
                                  : 'pending' === e.status
                                    ? 'Bekliyor'
                                    : 'Reddedildi',
                            }),
                            'pending' === e.status
                              ? (0, t.jsxs)('div', {
                                  className: 'actions',
                                  children: [
                                    (0, t.jsx)('button', {
                                      className: 'btn-sm btn-ok',
                                      disabled: d === e.id,
                                      onClick: () => u(() => o.approveProfileChange(e.id), e.id),
                                      children: 'Onayla',
                                    }),
                                    (0, t.jsx)('button', {
                                      className: 'btn-sm btn-danger',
                                      disabled: d === e.id,
                                      onClick: () => u(() => o.rejectProfileChange(e.id), e.id),
                                      children: 'Reddet',
                                    }),
                                  ],
                                })
                              : null,
                          ],
                        },
                        e.id,
                      ),
                    ),
                  })
              : (0, t.jsx)(v, { loading: n, error: r, onRetry: c }),
          ],
        });
      }
      function b() {
        var e;
        let [a, s] = (0, l.useState)('open'),
          { data: i, loading: n, error: r, reload: c } = g(() => o.supportList(a || void 0), [a]),
          [d, m] = (0, l.useState)(null),
          [u, p] = (0, l.useState)({}),
          h = {
            payment: '\xd6deme',
            booking: 'Randevu',
            safety: 'G\xfcvenlik',
            account: 'Hesap',
            other: 'Diğer',
          },
          y = async (e, a) => {
            m(a);
            try {
              (await e(), c());
            } finally {
              m(null);
            }
          };
        return (0, t.jsxs)(t.Fragment, {
          children: [
            (0, t.jsx)('h1', { className: 'page-title', children: 'Destek Talepleri' }),
            (0, t.jsxs)('p', {
              className: 'page-sub',
              children: [
                'Kullanıcıdan gelen talepler. G\xfcvenlik başlıklı olanlar \xf6nce okunmalı. (',
                null != (e = null == i ? void 0 : i.length) ? e : 0,
                ' ',
                'kayıt)',
              ],
            }),
            (0, t.jsx)('div', {
              className: 'toolbar',
              children: [
                ['open', 'A\xe7ık'],
                ['answered', 'Yanıtlanan'],
                ['closed', 'Kapalı'],
                ['', 'T\xfcm\xfc'],
              ].map((e) => {
                let [l, i] = e;
                return (0, t.jsx)(
                  'button',
                  {
                    className: 'chip '.concat(a === l ? 'on' : ''),
                    onClick: () => s(l),
                    children: i,
                  },
                  l || 'all',
                );
              }),
            }),
            i
              ? 0 === i.length
                ? (0, t.jsx)('div', {
                    className: 'card',
                    children: (0, t.jsx)('div', { className: 'empty', children: 'Talep yok.' }),
                  })
                : (0, t.jsx)('div', {
                    className: 'card',
                    children: i.map((e) => {
                      var a, s, l;
                      return (0, t.jsxs)(
                        'div',
                        {
                          className: 'list-row',
                          children: [
                            (0, t.jsxs)('div', {
                              className: 'grow',
                              children: [
                                (0, t.jsxs)('div', {
                                  className: 'name',
                                  children: [
                                    e.userName,
                                    ' ',
                                    (0, t.jsx)('span', {
                                      className: 'pill '.concat(
                                        'safety' === e.topic ? 'danger' : 'info',
                                      ),
                                      children: null != (a = h[e.topic]) ? a : e.topic,
                                    }),
                                  ],
                                }),
                                (0, t.jsx)('div', {
                                  className: 'meta',
                                  children: new Date(e.createdAt).toLocaleString('tr-TR'),
                                }),
                                (0, t.jsx)('p', {
                                  style: { whiteSpace: 'pre-wrap', margin: '8px 0' },
                                  children: e.body,
                                }),
                                e.reply
                                  ? (0, t.jsxs)('p', {
                                      style: { opacity: 0.75, margin: '4px 0' },
                                      children: ['↳ ', e.reply],
                                    })
                                  : (0, t.jsxs)(t.Fragment, {
                                      children: [
                                        (0, t.jsx)('textarea', {
                                          rows: 3,
                                          style: { width: '100%' },
                                          placeholder: 'Yanıt yaz…',
                                          value: null != (s = u[e.id]) ? s : '',
                                          onChange: (a) =>
                                            p((s) => ({ ...s, [e.id]: a.target.value })),
                                        }),
                                        (0, t.jsx)('button', {
                                          className: 'btn',
                                          disabled:
                                            d === e.id || !(null != (l = u[e.id]) ? l : '').trim(),
                                          onClick: () =>
                                            y(() => {
                                              var a;
                                              return o.supportReply(
                                                e.id,
                                                null != (a = u[e.id]) ? a : '',
                                              );
                                            }, e.id),
                                          children: 'Yanıtla',
                                        }),
                                      ],
                                    }),
                              ],
                            }),
                            'closed' !== e.status
                              ? (0, t.jsx)('button', {
                                  className: 'btn ghost',
                                  disabled: d === e.id,
                                  onClick: () => y(() => o.supportClose(e.id), e.id),
                                  children: 'Kapat',
                                })
                              : null,
                          ],
                        },
                        e.id,
                      );
                    }),
                  })
              : (0, t.jsx)(v, { loading: n, error: r, onRetry: c }),
          ],
        });
      }
      function N() {
        var e;
        let [a, s] = (0, l.useState)('pending'),
          { data: i, loading: n, error: r, reload: c } = g(() => o.kycQueue(a || void 0), [a]),
          [d, m] = (0, l.useState)(null),
          u = async (e, a) => {
            m(a);
            try {
              (await e(), c());
            } finally {
              m(null);
            }
          },
          p = { id_card: 'Kimlik', passport: 'Pasaport', certificate: 'Sertifika' };
        return (0, t.jsxs)(t.Fragment, {
          children: [
            (0, t.jsx)('h1', { className: 'page-title', children: 'Kimlik Doğrulama (KYC)' }),
            (0, t.jsxs)('p', {
              className: 'page-sub',
              children: [
                'Uzman/salon belge doğrulama kuyruğu — onaylanınca profilde "Doğrulanmış" rozeti (',
                null != (e = null == i ? void 0 : i.length) ? e : 0,
                ' kayıt)',
              ],
            }),
            (0, t.jsx)('div', {
              className: 'toolbar',
              children: [
                ['pending', 'Bekleyen'],
                ['approved', 'Onaylanan'],
                ['rejected', 'Reddedilen'],
                ['', 'T\xfcm\xfc'],
              ].map((e) => {
                let [l, i] = e;
                return (0, t.jsx)(
                  'button',
                  {
                    className: 'chip '.concat(a === l ? 'on' : ''),
                    onClick: () => s(l),
                    children: i,
                  },
                  l || 'all',
                );
              }),
            }),
            i
              ? 0 === i.length
                ? (0, t.jsx)('div', {
                    className: 'card',
                    children: (0, t.jsx)('div', { className: 'empty', children: 'Kayıt yok.' }),
                  })
                : (0, t.jsx)('div', {
                    className: 'card',
                    children: i.map((e) => {
                      var a;
                      return (0, t.jsxs)(
                        'div',
                        {
                          className: 'list-row',
                          children: [
                            (0, t.jsxs)('div', {
                              className: 'grow',
                              children: [
                                (0, t.jsxs)('div', {
                                  className: 'name',
                                  children: [
                                    e.userName,
                                    ' ',
                                    (0, t.jsx)('span', {
                                      className: 'pill '.concat(
                                        'salon' === e.userRole ? 'info' : 'accent',
                                      ),
                                      children: 'salon' === e.userRole ? 'Salon' : 'Uzman',
                                    }),
                                  ],
                                }),
                                (0, t.jsxs)('div', {
                                  className: 'meta',
                                  children: [
                                    null != (a = p[e.docType]) ? a : e.docType,
                                    ' \xb7 ',
                                    e.documents.length,
                                    ' belge \xb7',
                                    ' ',
                                    new Date(e.submittedAt).toLocaleDateString('tr-TR'),
                                    'rejected' === e.status && e.note
                                      ? ' \xb7 Ret: '.concat(e.note)
                                      : '',
                                  ],
                                }),
                              ],
                            }),
                            (0, t.jsx)('span', {
                              className: 'pill '.concat(
                                'approved' === e.status
                                  ? 'approved'
                                  : 'pending' === e.status
                                    ? 'pending'
                                    : 'rejected',
                              ),
                              children:
                                'approved' === e.status
                                  ? 'Onaylandı'
                                  : 'pending' === e.status
                                    ? 'Bekliyor'
                                    : 'Reddedildi',
                            }),
                            'pending' === e.status
                              ? (0, t.jsxs)('div', {
                                  className: 'actions',
                                  children: [
                                    (0, t.jsx)('button', {
                                      className: 'btn-sm btn-ok',
                                      disabled: d === e.id,
                                      onClick: () => u(() => o.approveKyc(e.id), e.id),
                                      children: 'Onayla',
                                    }),
                                    (0, t.jsx)('button', {
                                      className: 'btn-sm btn-danger',
                                      disabled: d === e.id,
                                      onClick: () =>
                                        u(() => o.rejectKyc(e.id, 'Belgeler yetersiz'), e.id),
                                      children: 'Reddet',
                                    }),
                                  ],
                                })
                              : null,
                          ],
                        },
                        e.id,
                      );
                    }),
                  })
              : (0, t.jsx)(v, { loading: n, error: r, onRetry: c }),
          ],
        });
      }
      function f() {
        var e;
        let [a, s] = (0, l.useState)('pending'),
          { data: i, loading: n, error: r, reload: c } = g(() => o.subscriptions(a || void 0), [a]),
          [d, u] = (0, l.useState)(null),
          p = async (e, a) => {
            u(a);
            try {
              (await e(), c());
            } finally {
              u(null);
            }
          };
        return (0, t.jsxs)(t.Fragment, {
          children: [
            (0, t.jsx)('h1', { className: 'page-title', children: 'Abonelikler' }),
            (0, t.jsxs)('p', {
              className: 'page-sub',
              children: [
                'Premium / Platinum \xfcyelik dekont onayı (',
                null != (e = null == i ? void 0 : i.length) ? e : 0,
                ' kayıt)',
              ],
            }),
            (0, t.jsxs)('div', {
              className: 'toolbar',
              children: [
                [
                  ['pending', 'Bekleyen'],
                  ['active', 'Aktif'],
                  ['rejected', 'Reddedilen'],
                  ['expired', 'S\xfcresi dolan'],
                  ['', 'T\xfcm\xfc'],
                ].map((e) => {
                  let [l, i] = e;
                  return (0, t.jsx)(
                    'button',
                    {
                      className: 'chip '.concat(a === l ? 'on' : ''),
                      onClick: () => s(l),
                      children: i,
                    },
                    l || 'all',
                  );
                }),
                (0, t.jsx)('button', {
                  className: 'btn-sm btn-ghost',
                  onClick: () => o.runSubExpire().then(c),
                  children: 'S\xfcre dolanları d\xfcş\xfcr',
                }),
              ],
            }),
            i
              ? 0 === i.length
                ? (0, t.jsx)('div', {
                    className: 'card',
                    children: (0, t.jsx)('div', { className: 'empty', children: 'Kayıt yok.' }),
                  })
                : (0, t.jsx)('div', {
                    className: 'card',
                    children: i.map((e) => {
                      let a, s;
                      return (0, t.jsxs)(
                        'div',
                        {
                          className: 'list-row',
                          children: [
                            (0, t.jsxs)('div', {
                              className: 'grow',
                              children: [
                                (0, t.jsxs)('div', {
                                  className: 'name',
                                  children: [
                                    e.userName,
                                    ' ',
                                    (0, t.jsx)('span', {
                                      className: 'pill '.concat(
                                        'platinum' === e.tier ? 'accent' : 'info',
                                      ),
                                      children:
                                        'platinum' === e.tier ? '\uD83D\uDC8E Platinum' : 'Premium',
                                    }),
                                  ],
                                }),
                                (0, t.jsxs)('div', {
                                  className: 'meta',
                                  children: [
                                    m(e.amount),
                                    ' \xb7 ',
                                    new Date(e.createdAt).toLocaleDateString('tr-TR'),
                                    e.periodEnd
                                      ? ' \xb7 bitiş '.concat(
                                          new Date(e.periodEnd).toLocaleDateString('tr-TR'),
                                        )
                                      : '',
                                    e.receiptUri
                                      ? ' \xb7 \uD83D\uDCCE dekont:'
                                      : ' \xb7 ⚠ dekont yok',
                                  ],
                                }),
                              ],
                            }),
                            e.receiptUri
                              ? (0, t.jsx)('img', {
                                  src: e.receiptUri,
                                  alt: 'dekont',
                                  style: {
                                    width: 72,
                                    height: 72,
                                    objectFit: 'cover',
                                    borderRadius: 8,
                                    cursor: 'zoom-in',
                                  },
                                  onClick: (e) => {
                                    let a = e.currentTarget;
                                    ((a.style.width = '72px' === a.style.width ? '360px' : '72px'),
                                      (a.style.height = 'auto'));
                                  },
                                })
                              : null,
                            (0, t.jsx)('span', {
                              className: 'pill '.concat(
                                'active' === (a = e.status)
                                  ? 'approved'
                                  : 'pending' === a
                                    ? 'pending'
                                    : 'rejected',
                              ),
                              children:
                                'active' === (s = e.status)
                                  ? 'Aktif'
                                  : 'pending' === s
                                    ? 'Bekliyor'
                                    : 'rejected' === s
                                      ? 'Reddedildi'
                                      : 'S\xfcresi doldu',
                            }),
                            'pending' === e.status
                              ? (0, t.jsxs)('div', {
                                  className: 'actions',
                                  children: [
                                    (0, t.jsx)('button', {
                                      className: 'btn-sm btn-ok',
                                      disabled: d === e.id,
                                      onClick: () => p(() => o.approveSubscription(e.id, 1), e.id),
                                      children: 'Onayla (1 ay)',
                                    }),
                                    (0, t.jsx)('button', {
                                      className: 'btn-sm btn-danger',
                                      disabled: d === e.id,
                                      onClick: () => p(() => o.rejectSubscription(e.id), e.id),
                                      children: 'Reddet',
                                    }),
                                  ],
                                })
                              : null,
                          ],
                        },
                        e.id,
                      );
                    }),
                  })
              : (0, t.jsx)(v, { loading: n, error: r, onRetry: c }),
          ],
        });
      }
      function S(e) {
        let { onGo: a } = e,
          { data: s, loading: l, error: i, reload: n } = g(() => o.overview(), []),
          r = null == s ? void 0 : s.pending;
        return (0, t.jsxs)(t.Fragment, {
          children: [
            (0, t.jsx)('h1', { className: 'page-title', children: 'Genel Bakış' }),
            (0, t.jsx)('p', { className: 'page-sub', children: 'Platform geneli canlı metrikler' }),
            s
              ? (0, t.jsxs)(t.Fragment, {
                  children: [
                    (0, t.jsx)('div', { className: 'section-title', children: 'Bekleyen İşler' }),
                    (0, t.jsx)('div', {
                      className: 'stat-grid',
                      children: [
                        { key: 'businesses', label: 'Salon Onayı', tab: 'businesses' },
                        { key: 'kyc', label: 'Kimlik (KYC)', tab: 'kyc' },
                        {
                          key: 'profileChanges',
                          label: 'Profil Değişikliği',
                          tab: 'profileChanges',
                        },
                        { key: 'subscriptions', label: 'Abonelik Dekontu', tab: 'subscriptions' },
                        { key: 'disputes', label: 'Depozito İtirazı', tab: 'disputes' },
                        { key: 'reviewDisputes', label: 'Yorum İtirazı', tab: 'reviewDisputes' },
                        { key: 'circle', label: 'W2W Moderasyon', tab: 'moderation' },
                      ].map((e) => {
                        var s;
                        let l = null != (s = null == r ? void 0 : r[e.key]) ? s : 0;
                        return (0, t.jsxs)(
                          'button',
                          {
                            onClick: () => a(e.tab),
                            className: 'stat',
                            style: {
                              cursor: 'pointer',
                              textAlign: 'left',
                              border: l > 0 ? '1.5px solid #e5484d' : void 0,
                            },
                            children: [
                              (0, t.jsx)('div', {
                                className: 'stat-v',
                                style: { color: l > 0 ? '#e5484d' : void 0 },
                                children: l,
                              }),
                              (0, t.jsx)('div', { className: 'stat-l', children: e.label }),
                            ],
                          },
                          e.key,
                        );
                      }),
                    }),
                    (0, t.jsx)('div', { className: 'section-title', children: 'Platform' }),
                    (0, t.jsxs)('div', {
                      className: 'stat-grid',
                      children: [
                        (0, t.jsx)(C, { v: String(s.users), l: 'Kullanıcı' }),
                        (0, t.jsx)(C, { v: String(s.professionals), l: 'İşletme / Uzman' }),
                        (0, t.jsx)(C, { v: String(s.bookings.upcoming), l: 'Yaklaşan randevu' }),
                        (0, t.jsx)(C, { v: m(s.bookings.revenue), l: 'Tamamlanan gelir' }),
                      ],
                    }),
                    (0, t.jsx)('div', { className: 'section-title', children: 'Randevu durumu' }),
                    (0, t.jsxs)('div', {
                      className: 'stat-grid',
                      children: [
                        (0, t.jsx)(C, { v: String(s.bookings.completed), l: 'Tamamlanan' }),
                        (0, t.jsx)(C, { v: String(s.bookings.cancelled), l: 'İptal' }),
                        (0, t.jsx)(C, {
                          v: '%'.concat(s.bookings.noShowRate),
                          l: 'Gelmeyen oranı',
                        }),
                        (0, t.jsx)(C, { v: String(s.activeCampaigns), l: 'Aktif kampanya' }),
                      ],
                    }),
                    (0, t.jsx)('div', { className: 'section-title', children: '\xdcyelik durumu' }),
                    (0, t.jsxs)('div', {
                      className: 'stat-grid',
                      children: [
                        (0, t.jsx)(C, { v: String(s.businesses.pending), l: 'Onay bekleyen' }),
                        (0, t.jsx)(C, { v: String(s.businesses.approved), l: 'Onaylı' }),
                        (0, t.jsx)(C, { v: String(s.businesses.rejected), l: 'Reddedilen' }),
                        (0, t.jsx)(C, { v: String(s.bookings.total), l: 'Toplam randevu' }),
                      ],
                    }),
                  ],
                })
              : (0, t.jsx)(v, { loading: l, error: i, onRetry: n }),
          ],
        });
      }
      function C(e) {
        let { v: a, l: s } = e;
        return (0, t.jsxs)('div', {
          className: 'stat',
          children: [
            (0, t.jsx)('div', { className: 'v', children: a }),
            (0, t.jsx)('div', { className: 'l', children: s }),
          ],
        });
      }
      let w = {
          hair: 'Sa\xe7',
          nails: 'Tırnak',
          skincare: 'Cilt bakımı',
          makeup: 'Makyaj',
          lashes: 'Kirpik',
          brows: 'Kaş',
          spa: 'Spa',
          epilation: 'Epilasyon',
        },
        T = [
          { key: 'users', label: 'Kayıt', color: '#cc6b86' },
          { key: 'bookings', label: 'Randevu', color: '#6f9f86' },
          { key: 'revenue', label: 'Gelir', color: '#c2a06a' },
        ];
      function O() {
        let [e, a] = (0, l.useState)(30),
          [s, i] = (0, l.useState)('bookings'),
          { data: n } = g(() => o.stats(e), [e]),
          r = T.find((e) => e.key === s);
        return (0, t.jsxs)(t.Fragment, {
          children: [
            (0, t.jsx)('h1', { className: 'page-title', children: 'İstatistik' }),
            (0, t.jsxs)('p', {
              className: 'page-sub',
              children: [
                'Zaman serisi — kayıt, randevu ve gelir ',
                n ? '\xb7 '.concat(n.timezone) : '',
              ],
            }),
            (0, t.jsx)('div', {
              className: 'toolbar',
              children: [7, 30, 90].map((s) =>
                (0, t.jsxs)(
                  'button',
                  {
                    className: 'chip '.concat(e === s ? 'on' : ''),
                    onClick: () => a(s),
                    children: ['Son ', s, ' g\xfcn'],
                  },
                  s,
                ),
              ),
            }),
            n
              ? (0, t.jsxs)(t.Fragment, {
                  children: [
                    (0, t.jsxs)('div', {
                      className: 'stat-grid',
                      style: { marginBottom: 8 },
                      children: [
                        (0, t.jsx)(C, {
                          v: String(n.totals.users),
                          l: 'Yeni kayıt ('.concat(e, 'g)'),
                        }),
                        (0, t.jsx)(C, {
                          v: String(n.totals.bookings),
                          l: 'Randevu ('.concat(e, 'g)'),
                        }),
                        (0, t.jsx)(C, { v: m(n.totals.revenue), l: 'Gelir ('.concat(e, 'g)') }),
                      ],
                    }),
                    (0, t.jsx)('div', {
                      className: 'section-title',
                      children: 'G\xfcnl\xfck seyir',
                    }),
                    (0, t.jsx)('div', {
                      className: 'toolbar',
                      children: T.map((e) =>
                        (0, t.jsx)(
                          'button',
                          {
                            className: 'chip '.concat(s === e.key ? 'on' : ''),
                            onClick: () => i(e.key),
                            children: e.label,
                          },
                          e.key,
                        ),
                      ),
                    }),
                    (0, t.jsx)('div', {
                      className: 'card',
                      style: { padding: 20 },
                      children: (0, t.jsx)(R, {
                        points: n.series.map((e) => ({ label: e.date, value: e[s] })),
                        color: r.color,
                        format: 'revenue' === s ? m : (e) => String(e),
                      }),
                    }),
                    (0, t.jsx)('div', {
                      className: 'section-title',
                      children: 'Kategori dağılımı (uzman havuzu)',
                    }),
                    (0, t.jsx)('div', {
                      className: 'card',
                      style: { padding: 20 },
                      children: (0, t.jsx)(z, { items: n.categories }),
                    }),
                  ],
                })
              : (0, t.jsx)('div', { className: 'empty', children: 'Y\xfckleniyor…' }),
          ],
        });
      }
      function R(e) {
        let { points: a, color: s, format: l } = e,
          i = Math.max(1, ...a.map((e) => e.value)),
          n = 884,
          r = 178,
          c = a.length,
          d = c > 40 ? 1 : 3,
          o = n / c - d,
          m = Math.ceil(c / 8);
        return (0, t.jsxs)('svg', {
          viewBox: '0 0 '.concat(900, ' ').concat(220),
          width: '100%',
          role: 'img',
          'aria-label': 'G\xfcnl\xfck grafik',
          children: [
            [0, 0.5, 1].map((e) => {
              let a = 16 + r * (1 - e);
              return (0, t.jsxs)(
                'g',
                {
                  children: [
                    (0, t.jsx)('line', {
                      x1: 8,
                      y1: a,
                      x2: 892,
                      y2: a,
                      stroke: '#ebe6e3',
                      strokeWidth: 1,
                    }),
                    (0, t.jsx)('text', {
                      x: 892,
                      y: a - 3,
                      fontSize: 10,
                      fill: '#8b8479',
                      textAnchor: 'end',
                      children: l(Math.round(i * e)),
                    }),
                  ],
                },
                e,
              );
            }),
            a.map((e, a) => {
              let u = (e.value / i) * r,
                p = 8 + (n / c) * a + d / 2;
              return (0, t.jsxs)(
                'g',
                {
                  children: [
                    (0, t.jsx)('rect', {
                      x: p,
                      y: 16 + r - u,
                      width: Math.max(o, 1),
                      height: u,
                      rx: 2,
                      fill: s,
                      children: (0, t.jsxs)('title', { children: [e.label, ': ', l(e.value)] }),
                    }),
                    a % m == 0
                      ? (0, t.jsx)('text', {
                          x: p + o / 2,
                          y: 212,
                          fontSize: 10,
                          fill: '#8b8479',
                          textAnchor: 'middle',
                          children: e.label,
                        })
                      : null,
                  ],
                },
                a,
              );
            }),
          ],
        });
      }
      function z(e) {
        let { items: a } = e,
          s = Math.max(1, ...a.map((e) => e.count));
        return 0 === a.length
          ? (0, t.jsx)('div', { className: 'empty', children: 'Veri yok' })
          : (0, t.jsx)('div', {
              style: { display: 'flex', flexDirection: 'column', gap: 12 },
              children: a.map((e) => {
                var a, l;
                return (0, t.jsxs)(
                  'div',
                  {
                    style: { display: 'flex', alignItems: 'center', gap: 12 },
                    children: [
                      (0, t.jsx)('div', {
                        style: { width: 96, fontSize: 13, fontWeight: 600 },
                        children: null != (l = w[(a = e.sector)]) ? l : a,
                      }),
                      (0, t.jsx)('div', {
                        style: { flex: 1, background: '#f2eff1', borderRadius: 999, height: 14 },
                        children: (0, t.jsx)('div', {
                          style: {
                            width: ''.concat((e.count / s) * 100, '%'),
                            background: '#cc6b86',
                            borderRadius: 999,
                            height: 14,
                            minWidth: 6,
                          },
                        }),
                      }),
                      (0, t.jsx)('div', {
                        style: { width: 28, textAlign: 'right', fontSize: 13, fontWeight: 700 },
                        children: e.count,
                      }),
                    ],
                  },
                  e.sector,
                );
              }),
            });
      }
      function K() {
        let { data: e, reload: a } = g(() => o.commissionInvoices(), []),
          [s, i] = (0, l.useState)(''),
          [n, r] = (0, l.useState)(''),
          [c, d] = (0, l.useState)(''),
          [u, p] = (0, l.useState)(null),
          h = async () => {
            if (!s || !n) return;
            let e = await o.closePeriod(s, n, c || void 0);
            (p(
              'D\xf6nem kapandı — '
                .concat(e.created, ' fatura \xfcretildi (son \xf6deme: ')
                .concat(e.dueDate.slice(0, 10), ')'),
            ),
              i(''),
              r(''),
              d(''),
              a());
          },
          v = async () => {
            let e = await o.runOverdue();
            (p(
              'Gecikme taraması — '
                .concat(e.markedOverdue, ' gecikti, ')
                .concat(e.restricted, ' hesap kısıtlandı'),
            ),
              a());
          };
        return (0, t.jsxs)(t.Fragment, {
          children: [
            (0, t.jsx)('div', {
              className: 'section-title',
              children: 'D\xf6nem faturaları — tahsilat d\xf6ng\xfcs\xfc (\xa712.8)',
            }),
            (0, t.jsx)('div', {
              className: 'card',
              style: { marginBottom: 16 },
              children: (0, t.jsxs)('div', {
                className: 'form-inline',
                children: [
                  (0, t.jsxs)('label', {
                    className: 'meta',
                    children: [
                      'D\xf6nem başı',
                      (0, t.jsx)('input', {
                        className: 'input',
                        type: 'date',
                        value: s,
                        onChange: (e) => i(e.target.value),
                      }),
                    ],
                  }),
                  (0, t.jsxs)('label', {
                    className: 'meta',
                    children: [
                      'D\xf6nem sonu',
                      (0, t.jsx)('input', {
                        className: 'input',
                        type: 'date',
                        value: n,
                        onChange: (e) => r(e.target.value),
                      }),
                    ],
                  }),
                  (0, t.jsxs)('label', {
                    className: 'meta',
                    children: [
                      'Son \xf6deme (ops.)',
                      (0, t.jsx)('input', {
                        className: 'input',
                        type: 'date',
                        value: c,
                        onChange: (e) => d(e.target.value),
                      }),
                    ],
                  }),
                  (0, t.jsx)('button', {
                    className: 'btn-sm btn-ok',
                    onClick: h,
                    children: 'D\xf6nemi kapat → fatura \xfcret',
                  }),
                  (0, t.jsx)('button', {
                    className: 'btn-sm',
                    onClick: v,
                    children: 'Gecikmeleri işle (7g → kısıt)',
                  }),
                  u &&
                    (0, t.jsx)('div', {
                      className: 'meta full',
                      style: { color: 'var(--success)' },
                      children: u,
                    }),
                ],
              }),
            }),
            (0, t.jsx)('div', {
              className: 'card',
              children:
                e && 0 !== e.length
                  ? e.map((e) => {
                      let s, l;
                      return (0, t.jsxs)(
                        'div',
                        {
                          className: 'list-row',
                          children: [
                            (0, t.jsxs)('div', {
                              className: 'grow',
                              children: [
                                (0, t.jsxs)('div', {
                                  className: 'name',
                                  children: [e.proName, ' \xb7 ', m(e.commissionAmount)],
                                }),
                                (0, t.jsxs)('div', {
                                  className: 'meta',
                                  children: [
                                    e.periodStart.slice(0, 10),
                                    ' – ',
                                    e.periodEnd.slice(0, 10),
                                    ' \xb7',
                                    ' ',
                                    e.bookingsCount,
                                    ' randevu \xb7 ciro ',
                                    m(e.grossRevenue),
                                    ' \xb7 son \xf6deme',
                                    ' ',
                                    e.dueDate.slice(0, 10),
                                    'collected' !== e.status && e.overdueDays > 0
                                      ? ' \xb7 '.concat(e.overdueDays, 'g gecikme')
                                      : '',
                                    e.receiptUri ? ' \xb7 \uD83E\uDDFE dekont var' : '',
                                  ],
                                }),
                              ],
                            }),
                            (0, t.jsx)('span', {
                              className: 'pill '.concat(
                                'collected' === (s = e.status)
                                  ? 'approved'
                                  : 'overdue' === s
                                    ? 'rejected'
                                    : 'pending',
                              ),
                              children:
                                'collected' === (l = e.status)
                                  ? '\xd6dendi'
                                  : 'overdue' === l
                                    ? 'Gecikti'
                                    : 'Bekliyor',
                            }),
                            e.receiptUri
                              ? (0, t.jsx)('a', {
                                  className: 'btn-sm',
                                  href: e.receiptUri,
                                  target: '_blank',
                                  rel: 'noreferrer',
                                  style: { textDecoration: 'none' },
                                  children: 'Dekont',
                                })
                              : null,
                            'collected' !== e.status
                              ? (0, t.jsx)('button', {
                                  className: 'btn-sm btn-ok',
                                  onClick: async () => {
                                    confirm(
                                      ''.concat(
                                        e.proName,
                                        ' faturası tahsil edildi olarak işaretlensin mi?',
                                      ),
                                    ) && (await o.collectInvoice(e.id), a());
                                  },
                                  children: 'Tahsil edildi',
                                })
                              : null,
                          ],
                        },
                        e.id,
                      );
                    })
                  : (0, t.jsx)('div', {
                      className: 'empty',
                      children: 'Fatura yok — bir d\xf6nem kapatın',
                    }),
            }),
          ],
        });
      }
      function A() {
        let { data: e, loading: a, reload: s } = g(() => o.commissions(), []),
          [i, n] = (0, l.useState)(''),
          [r, c] = (0, l.useState)(!1),
          d = async () => {
            let e = parseInt(i, 10);
            if (Number.isFinite(e) && !(e < 0) && !(e > 100)) {
              c(!0);
              try {
                (await o.setCommissionRate(e), n(''), s());
              } finally {
                c(!1);
              }
            }
          };
        return (0, t.jsxs)(t.Fragment, {
          children: [
            (0, t.jsxs)('h1', {
              className: 'page-title',
              children: [
                'Komisyon',
                ' ',
                e
                  ? (0, t.jsx)('button', {
                      className: 'btn-sm',
                      style: { marginLeft: 8, verticalAlign: 'middle' },
                      onClick: () =>
                        u(
                          'ayna-komisyon.csv',
                          e.salons.map((e) => ({
                            uzman_salon: e.proName,
                            randevu: e.count,
                            ciro: e.gmv,
                            komisyon: e.earned,
                            bekleyen: e.pending,
                            tahsil: e.collected,
                            kalan: e.outstanding,
                          })),
                        ),
                      children: '⬇ Excel',
                    })
                  : null,
              ],
            }),
            (0, t.jsx)('p', {
              className: 'page-sub',
              children:
                'App \xfczerinden alınan online randevulardan platform komisyonu (offline salon kayıtları hari\xe7)',
            }),
            a || !e
              ? (0, t.jsx)('div', { className: 'empty', children: 'Y\xfckleniyor…' })
              : (0, t.jsxs)(t.Fragment, {
                  children: [
                    (0, t.jsxs)('div', {
                      className: 'stat-grid',
                      children: [
                        (0, t.jsx)(C, { v: m(e.totals.earned), l: 'Kazanılan komisyon' }),
                        (0, t.jsx)(C, { v: m(e.totals.collected), l: 'Tahsil edilen' }),
                        (0, t.jsx)(C, { v: m(e.totals.outstanding), l: 'A\xe7ık alacak' }),
                        (0, t.jsx)(C, {
                          v: '%'.concat(e.rate),
                          l: 'Oran \xb7 '.concat(e.totals.count, ' online randevu'),
                        }),
                      ],
                    }),
                    (0, t.jsx)('div', { className: 'section-title', children: 'Komisyon oranı' }),
                    (0, t.jsx)('div', {
                      className: 'card',
                      children: (0, t.jsxs)('div', {
                        className: 'list-row',
                        children: [
                          (0, t.jsxs)('div', {
                            className: 'grow',
                            children: [
                              (0, t.jsxs)('div', {
                                className: 'name',
                                children: ['G\xfcncel oran: %', e.rate],
                              }),
                              (0, t.jsxs)('div', {
                                className: 'meta',
                                children: [
                                  'Her online randevu tutarının %',
                                  e.rate,
                                  "'i platforma kalır (GMV:",
                                  ' ',
                                  m(e.totals.gmv),
                                  ')',
                                ],
                              }),
                            ],
                          }),
                          (0, t.jsx)('input', {
                            className: 'input',
                            style: { width: 90, height: 34 },
                            type: 'number',
                            min: 0,
                            max: 100,
                            placeholder: String(e.rate),
                            value: i,
                            onChange: (e) => n(e.target.value),
                          }),
                          (0, t.jsx)('button', {
                            className: 'btn-sm btn-ok',
                            onClick: d,
                            disabled: r || !i,
                            children: 'Kaydet',
                          }),
                        ],
                      }),
                    }),
                    (0, t.jsx)('div', {
                      className: 'section-title',
                      children: 'Salon bazında — alacak & tahsilat',
                    }),
                    (0, t.jsx)('div', {
                      className: 'card',
                      children:
                        0 === e.salons.length
                          ? (0, t.jsx)('div', {
                              className: 'empty',
                              children: 'Online randevu yok',
                            })
                          : e.salons.map((e) =>
                              (0, t.jsxs)(
                                'div',
                                {
                                  className: 'list-row',
                                  children: [
                                    (0, t.jsxs)('div', {
                                      className: 'grow',
                                      children: [
                                        (0, t.jsx)('div', {
                                          className: 'name',
                                          children: e.proName,
                                        }),
                                        (0, t.jsxs)('div', {
                                          className: 'meta',
                                          children: [
                                            'Kazanılan ',
                                            m(e.earned),
                                            ' \xb7 Tahsil ',
                                            m(e.collected),
                                            e.pending > 0
                                              ? ' \xb7 +'.concat(m(e.pending), ' bekleyen randevu')
                                              : '',
                                          ],
                                        }),
                                      ],
                                    }),
                                    e.outstanding > 0
                                      ? (0, t.jsxs)('span', {
                                          className: 'pill rejected',
                                          children: [m(e.outstanding), ' alacak'],
                                        })
                                      : e.earned > 0
                                        ? (0, t.jsx)('span', {
                                            className: 'pill approved',
                                            children: 'Tahsil edildi',
                                          })
                                        : (0, t.jsx)('span', {
                                            className: 'pill',
                                            style: {
                                              background: 'var(--line)',
                                              color: 'var(--muted)',
                                            },
                                            children: 'Alacak yok',
                                          }),
                                    e.outstanding > 0
                                      ? (0, t.jsx)('button', {
                                          className: 'btn-sm btn-ok',
                                          onClick: async () => {
                                            let a = prompt(
                                              ''.concat(
                                                e.proName,
                                                ' — tahsil edilecek tutar (KZT):',
                                              ),
                                              String(e.outstanding),
                                            );
                                            if (null == a) return;
                                            let t = Number(a);
                                            Number.isFinite(t) &&
                                              !(t <= 0) &&
                                              (await o.addPayout({
                                                proId: e.proId || e.proName,
                                                proName: e.proName,
                                                amount: t,
                                              }),
                                              s());
                                          },
                                          children: 'Tahsil et',
                                        })
                                      : null,
                                  ],
                                },
                                e.proId || e.proName,
                              ),
                            ),
                    }),
                    e.payouts.length > 0
                      ? (0, t.jsxs)(t.Fragment, {
                          children: [
                            (0, t.jsx)('div', {
                              className: 'section-title',
                              children: 'Tahsilat ge\xe7mişi',
                            }),
                            (0, t.jsx)('div', {
                              className: 'card',
                              children: e.payouts.map((e) =>
                                (0, t.jsxs)(
                                  'div',
                                  {
                                    className: 'list-row',
                                    children: [
                                      (0, t.jsxs)('div', {
                                        className: 'grow',
                                        children: [
                                          (0, t.jsx)('div', {
                                            className: 'name',
                                            children: e.proName,
                                          }),
                                          (0, t.jsxs)('div', {
                                            className: 'meta',
                                            children: [
                                              new Date(e.createdAt).toLocaleDateString('tr-TR'),
                                              e.note ? ' \xb7 '.concat(e.note) : '',
                                            ],
                                          }),
                                        ],
                                      }),
                                      (0, t.jsx)('div', {
                                        className: 'kv-v',
                                        style: { color: 'var(--success)' },
                                        children: m(e.amount),
                                      }),
                                    ],
                                  },
                                  e.id,
                                ),
                              ),
                            }),
                          ],
                        })
                      : null,
                    (0, t.jsx)(K, {}),
                    (0, t.jsxs)('div', {
                      className: 'section-title',
                      children: ['Randevu kayıtları (', e.items.length, ')'],
                    }),
                    (0, t.jsx)('div', {
                      className: 'card',
                      children:
                        0 === e.items.length
                          ? (0, t.jsx)('div', { className: 'empty', children: 'Kayıt yok' })
                          : e.items.map((e) => {
                              let a, s;
                              return (0, t.jsxs)(
                                'div',
                                {
                                  className: 'list-row',
                                  children: [
                                    (0, t.jsxs)('div', {
                                      className: 'grow',
                                      children: [
                                        (0, t.jsxs)('div', {
                                          className: 'name',
                                          children: [e.proName, ' \xb7 ', e.service],
                                        }),
                                        (0, t.jsxs)('div', {
                                          className: 'meta',
                                          children: [e.dateLabel, ' \xb7 Tutar ', m(e.price)],
                                        }),
                                      ],
                                    }),
                                    (0, t.jsx)('div', {
                                      className: 'kv-v',
                                      children: m(e.commission),
                                    }),
                                    (0, t.jsx)('span', {
                                      className: 'pill '.concat(
                                        'earned' === (a = e.state)
                                          ? 'approved'
                                          : 'pending' === a
                                            ? 'pending'
                                            : 'rejected',
                                      ),
                                      children:
                                        'earned' === (s = e.state)
                                          ? 'Kazanıldı'
                                          : 'pending' === s
                                            ? 'Bekliyor'
                                            : 'İptal/Gelmedi',
                                    }),
                                  ],
                                },
                                e.id,
                              );
                            }),
                    }),
                  ],
                }),
          ],
        });
      }
      let P = {
          llp: 'ТОО / LLP (t\xfczel kişi)',
          ip: 'ИП (bireysel girişimci)',
          freelance: 'Serbest uzman',
          branch: 'Salon şubesi',
        },
        D = [
          { key: 'identity', label: 'Kimlik' },
          { key: 'business', label: 'İşletme' },
          { key: 'bin', label: 'BİN' },
          { key: 'address', label: 'Adres' },
          { key: 'social', label: 'Sosyal medya' },
        ];
      function B() {
        var e, a;
        let [s, i] = (0, l.useState)('pending'),
          [n, r] = (0, l.useState)(null),
          { data: c, reload: d } = g(() => o.businesses(s), [s]),
          m = async (e, a) => {
            var s;
            ('approve' === a
              ? await o.approveBusiness(e)
              : await o.rejectBusiness(e, null != (s = prompt('Red sebebi:')) ? s : ''),
              r(null),
              d());
          },
          u = async (e, a, s) => {
            var t;
            let l =
              'needs_docs' === a
                ? null != (t = prompt('Hangi belge/eksik?', s))
                  ? t
                  : ''
                : void 0;
            (await o.decisionBusiness(e, a, l), r(null), d());
          },
          p = async (e, a) => {
            if (!n) return;
            let s = await o.verifyBusiness(n.id, { [e]: a });
            r({ ...n, verification: s.verification });
          },
          h = async (e) => r(await o.businessDetail(e));
        return (0, t.jsxs)(t.Fragment, {
          children: [
            (0, t.jsx)('h1', { className: 'page-title', children: 'Salon Onay' }),
            (0, t.jsx)('p', {
              className: 'page-sub',
              children: 'Salon (işletme) kayıt onayları ve durum y\xf6netimi',
            }),
            (0, t.jsx)('div', {
              className: 'toolbar',
              children: ['pending', 'approved', 'rejected'].map((e) =>
                (0, t.jsx)(
                  'button',
                  {
                    className: 'chip '.concat(s === e ? 'on' : ''),
                    onClick: () => i(e),
                    children:
                      'pending' === e
                        ? 'Onay bekleyen'
                        : 'approved' === e
                          ? 'Onaylı'
                          : 'Reddedilen',
                  },
                  e,
                ),
              ),
            }),
            (0, t.jsx)('div', {
              className: 'card',
              children:
                c && 0 !== c.length
                  ? c.map((e) =>
                      (0, t.jsxs)(
                        'div',
                        {
                          className: 'list-row',
                          children: [
                            (0, t.jsxs)('div', {
                              className: 'grow',
                              style: { cursor: 'pointer' },
                              onClick: () => h(e.id),
                              children: [
                                (0, t.jsx)('div', { className: 'name', children: e.name }),
                                (0, t.jsxs)('div', {
                                  className: 'meta',
                                  children: [
                                    e.ownerName,
                                    ' \xb7 ',
                                    e.sector,
                                    ' \xb7 ',
                                    e.city,
                                    e.district ? ' / '.concat(e.district) : '',
                                    ' \xb7 ',
                                    e.phone,
                                  ],
                                }),
                              ],
                            }),
                            (0, t.jsx)('button', {
                              className: 'btn-sm btn-ghost',
                              onClick: () => h(e.id),
                              children: 'Detay',
                            }),
                            'approved' !== e.status
                              ? (0, t.jsx)('button', {
                                  className: 'btn-sm btn-ok',
                                  onClick: () => m(e.id, 'approve'),
                                  children: 'Onayla',
                                })
                              : null,
                            'rejected' !== e.status
                              ? (0, t.jsx)('button', {
                                  className: 'btn-sm btn-danger',
                                  onClick: () => m(e.id, 'reject'),
                                  children: 'Reddet',
                                })
                              : null,
                          ],
                        },
                        e.id,
                      ),
                    )
                  : (0, t.jsx)('div', { className: 'empty', children: 'Kayıt yok' }),
            }),
            n
              ? (0, t.jsx)('div', {
                  className: 'modal-backdrop',
                  onClick: () => r(null),
                  children: (0, t.jsxs)('div', {
                    className: 'modal',
                    onClick: (e) => e.stopPropagation(),
                    children: [
                      (0, t.jsxs)('div', {
                        className: 'modal-head',
                        children: [
                          (0, t.jsxs)('div', {
                            children: [
                              (0, t.jsx)('div', {
                                className: 'page-title',
                                style: { fontSize: 20 },
                                children: n.name,
                              }),
                              (0, t.jsx)('span', {
                                className: 'pill '.concat(n.status),
                                children:
                                  'pending' === n.status
                                    ? 'Onay bekliyor'
                                    : 'approved' === n.status
                                      ? 'Onaylı'
                                      : 'Reddedildi',
                              }),
                            ],
                          }),
                          (0, t.jsx)('button', {
                            className: 'btn-sm btn-ghost',
                            onClick: () => r(null),
                            children: 'Kapat',
                          }),
                        ],
                      }),
                      (0, t.jsxs)('div', {
                        className: 'kv-grid',
                        children: [
                          (0, t.jsx)(L, {
                            k: 'İşletme t\xfcr\xfc',
                            v: null != (a = P[null != (e = n.entityType) ? e : '']) ? a : '—',
                          }),
                          (0, t.jsx)(L, { k: 'BİN / IIN', v: n.bin || '—' }),
                          (0, t.jsx)(L, { k: 'Resm\xee ad', v: n.legalName || '—' }),
                          (0, t.jsx)(L, { k: 'Y\xf6netici', v: n.managerName || '—' }),
                          (0, t.jsx)(L, { k: 'OKED', v: n.oked || '—' }),
                          (0, t.jsx)(L, {
                            k: 'KDV m\xfckellefi',
                            v: n.vatPayer ? 'Evet' : 'Hayır',
                          }),
                          (0, t.jsx)(L, { k: 'Sahip', v: n.ownerName }),
                          (0, t.jsx)(L, { k: 'Sekt\xf6r', v: n.sector }),
                          (0, t.jsx)(L, { k: 'Telefon', v: n.phone }),
                          (0, t.jsx)(L, { k: 'E-posta', v: n.email || '—' }),
                          (0, t.jsx)(L, { k: 'Instagram', v: n.socialInstagram || '—' }),
                          (0, t.jsx)(L, { k: '\xc7alışma saatleri', v: n.workingHours || '—' }),
                          (0, t.jsx)(L, {
                            k: 'Adres',
                            v: ''
                              .concat(n.city, ' / ')
                              .concat(n.district, ' ')
                              .concat(n.address)
                              .trim(),
                          }),
                          (0, t.jsx)(L, { k: 'Kategoriler', v: n.categories.join(', ') || '—' }),
                          (0, t.jsx)(L, { k: 'Ekip (uzman)', v: String(n.specialistCount) }),
                          (0, t.jsx)(L, {
                            k: 'Belge',
                            v: n.docUrl
                              ? 'Y\xfcklendi'.concat(n.docType ? ' \xb7 ' + n.docType : '')
                              : 'Yok',
                          }),
                        ],
                      }),
                      (0, t.jsx)('h3', {
                        className: 'section-head',
                        style: { marginTop: 14 },
                        children: 'Doğrulama kontrol listesi',
                      }),
                      (0, t.jsx)('div', {
                        className: 'verify-grid',
                        children: D.map((e) => {
                          var a, s;
                          let l =
                            null != (s = null == (a = n.verification) ? void 0 : a[e.key]) && s;
                          return (0, t.jsxs)(
                            'button',
                            {
                              className: 'verify-chip '.concat(l ? 'on' : ''),
                              onClick: () => p(e.key, !l),
                              children: [l ? '✓' : '○', ' ', e.label],
                            },
                            e.key,
                          );
                        }),
                      }),
                      n.docUrl
                        ? (0, t.jsx)('a', {
                            className: 'btn-sm btn-ghost',
                            href: n.docUrl,
                            target: '_blank',
                            rel: 'noreferrer',
                            style: { marginTop: 8, display: 'inline-block' },
                            children: 'Belgeyi a\xe7 ↗',
                          })
                        : null,
                      n.reviewNote
                        ? (0, t.jsxs)('p', {
                            className: 'page-sub',
                            children: ['Not: ', n.reviewNote],
                          })
                        : null,
                      n.about ? (0, t.jsx)('p', { className: 'about', children: n.about }) : null,
                      n.rejectReason
                        ? (0, t.jsxs)('p', {
                            className: 'err',
                            children: ['Red sebebi: ', n.rejectReason],
                          })
                        : null,
                      (0, t.jsxs)('div', {
                        className: 'modal-actions',
                        children: [
                          'approved' !== n.status
                            ? (0, t.jsx)('button', {
                                className: 'btn-sm btn-ok',
                                onClick: () => m(n.id, 'approve'),
                                children: 'Onayla',
                              })
                            : null,
                          (0, t.jsx)('button', {
                            className: 'btn-sm btn-ghost',
                            onClick: () => u(n.id, 'needs_docs', 'Ek belge gerekli'),
                            children: 'Ek belge iste',
                          }),
                          (0, t.jsx)('button', {
                            className: 'btn-sm btn-ghost',
                            onClick: () => u(n.id, 'under_review'),
                            children: 'İncelemeye al',
                          }),
                          'rejected' !== n.status
                            ? (0, t.jsx)('button', {
                                className: 'btn-sm btn-danger',
                                onClick: () => m(n.id, 'reject'),
                                children: 'Reddet',
                              })
                            : null,
                        ],
                      }),
                    ],
                  }),
                })
              : null,
          ],
        });
      }
      let U = { freelance: 'Serbest \xe7alışan', ip: 'ИП (kayıtlı bireysel girişimci)' },
        F = [
          { key: 'cert', label: 'Sertifika' },
          { key: 'social', label: 'Sosyal medya' },
        ];
      function E() {
        var e;
        let [a, s] = (0, l.useState)(null),
          { data: i } = g(() => o.specialists(), []),
          n = async (e) => s(await o.specialistDetail(e)),
          r = async (e, t) => {
            if (!a) return;
            let l = await o.verifySpecialist(a.id, { [e]: t });
            s({
              ...a,
              verification: {
                ...a.verification,
                cert: l.verification.cert,
                social: l.verification.social,
              },
              aynaVerified:
                a.verification.identity && (l.verification.cert || l.verification.social),
            });
          };
        return (0, t.jsxs)(t.Fragment, {
          children: [
            (0, t.jsx)('h1', { className: 'page-title', children: 'Uzman Doğrulama' }),
            (0, t.jsx)('p', {
              className: 'page-sub',
              children:
                'Bağımsız uzman katmanlı doğrulama — kimlik (KYC), sertifika, sosyal medya → AYNA Onaylı',
            }),
            (0, t.jsx)('div', {
              className: 'card',
              children:
                i && 0 !== i.length
                  ? i.map((e) => {
                      var a;
                      return (0, t.jsxs)(
                        'div',
                        {
                          className: 'list-row',
                          children: [
                            (0, t.jsxs)('div', {
                              className: 'grow',
                              style: { cursor: 'pointer' },
                              onClick: () => n(e.id),
                              children: [
                                (0, t.jsxs)('div', {
                                  className: 'name',
                                  children: [e.name, ' ', e.aynaVerified ? '\uD83D\uDEE1️' : ''],
                                }),
                                (0, t.jsxs)('div', {
                                  className: 'meta',
                                  children: [
                                    null != (a = U[e.entityType]) ? a : e.entityType,
                                    ' \xb7 ',
                                    e.city || '—',
                                    ' \xb7 KYC:',
                                    ' ',
                                    e.kycStatus,
                                    e.verification.cert ? ' \xb7 ✓Sertifika' : '',
                                    e.verification.social ? ' \xb7 ✓Sosyal' : '',
                                  ],
                                }),
                              ],
                            }),
                            (0, t.jsx)('button', {
                              className: 'btn-sm btn-ghost',
                              onClick: () => n(e.id),
                              children: 'Detay',
                            }),
                          ],
                        },
                        e.id,
                      );
                    })
                  : (0, t.jsx)('div', { className: 'empty', children: 'Kayıt yok' }),
            }),
            a
              ? (0, t.jsx)('div', {
                  className: 'modal-backdrop',
                  onClick: () => s(null),
                  children: (0, t.jsxs)('div', {
                    className: 'modal',
                    onClick: (e) => e.stopPropagation(),
                    children: [
                      (0, t.jsxs)('div', {
                        className: 'modal-head',
                        children: [
                          (0, t.jsxs)('div', {
                            children: [
                              (0, t.jsxs)('div', {
                                className: 'page-title',
                                style: { fontSize: 20 },
                                children: [
                                  a.name,
                                  ' ',
                                  a.aynaVerified ? '\uD83D\uDEE1️ AYNA Onaylı' : '',
                                ],
                              }),
                              (0, t.jsxs)('span', {
                                className: 'pill '.concat(
                                  'approved' === a.kycStatus ? 'approved' : 'pending',
                                ),
                                children: ['KYC: ', a.kycStatus],
                              }),
                            ],
                          }),
                          (0, t.jsx)('button', {
                            className: 'btn-sm btn-ghost',
                            onClick: () => s(null),
                            children: 'Kapat',
                          }),
                        ],
                      }),
                      (0, t.jsxs)('div', {
                        className: 'kv-grid',
                        children: [
                          (0, t.jsx)(L, {
                            k: 'Uzman t\xfcr\xfc',
                            v: null != (e = U[a.entityType]) ? e : a.entityType,
                          }),
                          (0, t.jsx)(L, { k: 'IIN', v: a.iin || '—' }),
                          (0, t.jsx)(L, { k: 'Şehir', v: a.city || '—' }),
                          (0, t.jsx)(L, {
                            k: 'Sertifika sayısı',
                            v: String(a.certificates.length),
                          }),
                          (0, t.jsx)(L, { k: 'Instagram', v: a.socialInstagram || '—' }),
                          (0, t.jsx)(L, {
                            k: 'Sosyal doğrulama kodu',
                            v: a.socialVerifyCode || '—',
                          }),
                          (0, t.jsx)(L, { k: 'Bio', v: a.bio || '—' }),
                        ],
                      }),
                      (0, t.jsx)('h3', {
                        className: 'section-head',
                        style: { marginTop: 14 },
                        children: 'Doğrulama kontrol listesi',
                      }),
                      (0, t.jsx)('p', {
                        className: 'page-sub',
                        style: { marginTop: 0 },
                        children:
                          'Kimlik, KYC kuyruğundan onaylanır. Sertifika ve sosyal medyayı burada işaretle.',
                      }),
                      (0, t.jsxs)('div', {
                        className: 'verify-grid',
                        children: [
                          (0, t.jsxs)('div', {
                            className: 'verify-chip '.concat(a.verification.identity ? 'on' : ''),
                            children: [a.verification.identity ? '✓' : '○', ' Kimlik (KYC)'],
                          }),
                          F.map((e) => {
                            let s = a.verification[e.key];
                            return (0, t.jsxs)(
                              'button',
                              {
                                className: 'verify-chip '.concat(s ? 'on' : ''),
                                onClick: () => r(e.key, !s),
                                children: [s ? '✓' : '○', ' ', e.label],
                              },
                              e.key,
                            );
                          }),
                        ],
                      }),
                      a.certificates.length > 0
                        ? (0, t.jsx)('div', {
                            className: 'cert-thumbs',
                            style: { display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' },
                            children: a.certificates.map((e, a) =>
                              (0, t.jsx)(
                                'a',
                                {
                                  href: e,
                                  target: '_blank',
                                  rel: 'noreferrer',
                                  children: (0, t.jsx)('img', {
                                    src: e,
                                    alt: 'sertifika '.concat(a + 1),
                                    style: {
                                      width: 72,
                                      height: 72,
                                      objectFit: 'cover',
                                      borderRadius: 8,
                                    },
                                  }),
                                },
                                a,
                              ),
                            ),
                          })
                        : null,
                    ],
                  }),
                })
              : null,
          ],
        });
      }
      function L(e) {
        let { k: a, v: s } = e;
        return (0, t.jsxs)('div', {
          className: 'kv',
          children: [
            (0, t.jsx)('div', { className: 'kv-k', children: a }),
            (0, t.jsx)('div', { className: 'kv-v', children: s }),
          ],
        });
      }
      function Y() {
        var e;
        let { data: a, reload: s } = g(() => o.reviews(), []),
          { data: l, reload: i } = g(() => o.circleQueue(), []),
          n = async (e) => {
            confirm('Bu yorumu gizle? (moderasyon)') && (await o.hideReview(e), s());
          },
          r = async (e, a) => {
            (await o.moderateCircle(e, a), i());
          };
        return (0, t.jsxs)(t.Fragment, {
          children: [
            (0, t.jsx)('h1', { className: 'page-title', children: 'Moderasyon Merkezi' }),
            (0, t.jsx)('p', {
              className: 'page-sub',
              children:
                'W2W onay kuyruğu (otomatik filtre + şik\xe2yet) \xb7 g\xf6r\xfcn\xfcr yorumlar. Sabit ilke: d\xfcr\xfcst eleştiri silinmez.',
            }),
            (0, t.jsxs)('h2', {
              className: 'section-head',
              children: ['W2W kuyruğu (', null != (e = null == l ? void 0 : l.length) ? e : 0, ')'],
            }),
            (0, t.jsx)('div', {
              className: 'card',
              style: { marginBottom: 24 },
              children:
                l && 0 !== l.length
                  ? l.map((e) =>
                      (0, t.jsxs)(
                        'div',
                        {
                          className: 'list-col',
                          children: [
                            (0, t.jsxs)('div', {
                              className: 'name',
                              children: [
                                e.category,
                                ' \xb7 ',
                                e.authorLabel,
                                ' ',
                                (0, t.jsx)('span', {
                                  className: 'pill '.concat(
                                    'hidden' === e.status ? 'rejected' : 'pending',
                                  ),
                                  children:
                                    'hidden' === e.status
                                      ? ''.concat(e.reports, ' şik\xe2yet')
                                      : 'moderasyon',
                                }),
                              ],
                            }),
                            (0, t.jsx)('div', {
                              className: 'meta',
                              style: { marginTop: 4 },
                              children: e.text,
                            }),
                            e.moderationReason
                              ? (0, t.jsxs)('div', {
                                  className: 'meta',
                                  style: { marginTop: 2 },
                                  children: ['Sebep: ', e.moderationReason],
                                })
                              : null,
                            (0, t.jsxs)('div', {
                              className: 'form-inline',
                              style: { marginTop: 10 },
                              children: [
                                (0, t.jsx)('button', {
                                  className: 'btn-sm btn-ok',
                                  onClick: () => r(e.id, 'approve'),
                                  children: 'Onayla (yayınla)',
                                }),
                                (0, t.jsx)('button', {
                                  className: 'btn-sm btn-danger',
                                  onClick: () => r(e.id, 'hide'),
                                  children: 'Gizle',
                                }),
                              ],
                            }),
                          ],
                        },
                        e.id,
                      ),
                    )
                  : (0, t.jsx)('div', {
                      className: 'empty',
                      children: 'Bekleyen W2W i\xe7eriği yok',
                    }),
            }),
            (0, t.jsx)('h2', { className: 'section-head', children: 'G\xf6r\xfcn\xfcr yorumlar' }),
            (0, t.jsx)('div', {
              className: 'card',
              children:
                a && 0 !== a.length
                  ? a.map((e) =>
                      (0, t.jsxs)(
                        'div',
                        {
                          className: 'list-row',
                          children: [
                            (0, t.jsxs)('div', {
                              className: 'grow',
                              children: [
                                (0, t.jsxs)('div', {
                                  className: 'name',
                                  children: [
                                    '★'.repeat(e.score),
                                    e.serviceTag ? ' \xb7 '.concat(e.serviceTag) : '',
                                  ],
                                }),
                                (0, t.jsxs)('div', {
                                  className: 'meta',
                                  children: [e.comment || '—', ' — ', e.authorLabel],
                                }),
                                e.reply
                                  ? (0, t.jsxs)('div', {
                                      className: 'meta',
                                      children: ['↳ Salon: ', e.reply],
                                    })
                                  : null,
                              ],
                            }),
                            (0, t.jsx)('button', {
                              className: 'btn-sm btn-danger',
                              onClick: () => n(e.id),
                              children: 'Gizle',
                            }),
                          ],
                        },
                        e.id,
                      ),
                    )
                  : (0, t.jsx)('div', {
                      className: 'empty',
                      children: 'G\xf6r\xfcn\xfcr yorum yok',
                    }),
            }),
          ],
        });
      }
      function I() {
        let { data: e, reload: a } = g(() => o.campaigns(), []),
          s = {
            title: '',
            subtitle: '',
            titleKk: '',
            subtitleKk: '',
            titleRu: '',
            subtitleRu: '',
            badge: '',
            image: '',
            category: '',
          },
          [i, n] = (0, l.useState)(s),
          [r, c] = (0, l.useState)('tr'),
          d = 'tr' === r ? 'title' : 'kk' === r ? 'titleKk' : 'titleRu',
          m = 'tr' === r ? 'subtitle' : 'kk' === r ? 'subtitleKk' : 'subtitleRu',
          u = async () => {
            !(i.title.length < 2) &&
              i.image &&
              (await o.createCampaign({
                title: i.title,
                subtitle: i.subtitle || void 0,
                i18n: j({
                  title: { kk: i.titleKk, ru: i.titleRu },
                  subtitle: { kk: i.subtitleKk, ru: i.subtitleRu },
                }),
                badge: i.badge || void 0,
                image: i.image,
                category: i.category || void 0,
              }),
              n(s),
              c('tr'),
              a());
          };
        return (0, t.jsxs)(t.Fragment, {
          children: [
            (0, t.jsx)('h1', { className: 'page-title', children: 'Kampanya & Banner' }),
            (0, t.jsx)('p', {
              className: 'page-sub',
              children: 'Keşif vitrinindeki kampanyaları y\xf6net',
            }),
            (0, t.jsx)('div', {
              className: 'card',
              style: { marginBottom: 20 },
              children: (0, t.jsxs)('div', {
                className: 'form-inline',
                children: [
                  (0, t.jsx)(x, {
                    lang: r,
                    setLang: c,
                    filled: (e) =>
                      'kk' === e ? !!i.titleKk || !!i.subtitleKk : !!i.titleRu || !!i.subtitleRu,
                  }),
                  (0, t.jsx)('input', {
                    className: 'input',
                    placeholder:
                      'tr' === r ? 'Başlık (TR — kaynak)' : 'Başlık ('.concat(r.toUpperCase(), ')'),
                    value: i[d],
                    onChange: (e) => n({ ...i, [d]: e.target.value }),
                  }),
                  (0, t.jsx)('input', {
                    className: 'input',
                    placeholder:
                      'tr' === r ? 'Alt başlık (TR)' : 'Alt başlık ('.concat(r.toUpperCase(), ')'),
                    value: i[m],
                    onChange: (e) => n({ ...i, [m]: e.target.value }),
                  }),
                  (0, t.jsx)('input', {
                    className: 'input',
                    placeholder: 'Rozet (\xf6rn. %25) — dilden bağımsız',
                    value: i.badge,
                    onChange: (e) => n({ ...i, badge: e.target.value }),
                  }),
                  (0, t.jsx)('input', {
                    className: 'input',
                    placeholder: 'Kategori kodu (\xf6rn. hair)',
                    value: i.category,
                    onChange: (e) => n({ ...i, category: e.target.value }),
                  }),
                  (0, t.jsx)('input', {
                    className: 'input full',
                    placeholder: 'G\xf6rsel URL (https://...)',
                    value: i.image,
                    onChange: (e) => n({ ...i, image: e.target.value }),
                  }),
                  (0, t.jsx)('button', {
                    className: 'btn-sm btn-ok full',
                    onClick: u,
                    children: '+ Kampanya ekle',
                  }),
                ],
              }),
            }),
            (0, t.jsx)('div', {
              className: 'card',
              children:
                e && 0 !== e.length
                  ? e.map((e) =>
                      (0, t.jsxs)(
                        'div',
                        {
                          className: 'list-row',
                          children: [
                            e.image
                              ? (0, t.jsx)('img', { className: 'thumb', src: e.image, alt: '' })
                              : (0, t.jsx)('div', { className: 'thumb' }),
                            (0, t.jsxs)('div', {
                              className: 'grow',
                              children: [
                                (0, t.jsxs)('div', {
                                  className: 'name',
                                  children: [e.badge ? ''.concat(e.badge, ' \xb7 ') : '', e.title],
                                }),
                                (0, t.jsxs)('div', {
                                  className: 'meta',
                                  children: [
                                    e.subtitle,
                                    e.category ? ' \xb7 '.concat(e.category) : '',
                                  ],
                                }),
                              ],
                            }),
                            (0, t.jsx)('button', {
                              className: 'switch '.concat(e.active ? 'on' : 'off'),
                              onClick: async () => {
                                (await o.setCampaignActive(e.id, !e.active), a());
                              },
                              children: e.active ? 'Aktif' : 'Pasif',
                            }),
                            (0, t.jsx)('button', {
                              className: 'btn-sm btn-danger',
                              onClick: async () => {
                                confirm('Kampanya silinsin mi?') &&
                                  (await o.deleteCampaign(e.id), a());
                              },
                              children: 'Sil',
                            }),
                          ],
                        },
                        e.id,
                      ),
                    )
                  : (0, t.jsx)('div', { className: 'empty', children: 'Kampanya yok' }),
            }),
          ],
        });
      }
      function J() {
        var e, a, s, i, n;
        let { data: r, reload: c } = g(() => o.blogArticles(), []),
          { data: d, reload: m } = g(() => o.blogApplications(), []),
          { data: u, reload: p } = g(() => o.themes(), []),
          h = {
            title: '',
            tag: '',
            categoryCode: '',
            contentType: 'guide',
            readMin: 3,
            image: '',
            excerpt: '',
            body: [''],
            published: !0,
          },
          [v, y] = (0, l.useState)(h),
          [k, b] = (0, l.useState)(null),
          N = {
            kk: { title: '', tag: '', excerpt: '', body: '' },
            ru: { title: '', tag: '', excerpt: '', body: '' },
          },
          [f, S] = (0, l.useState)(N),
          [C, w] = (0, l.useState)('tr'),
          T = (e) => {
            var a, s;
            return 'tr' === C
              ? 'body' === e
                ? (null != (a = v.body) ? a : []).join('\n')
                : null != (s = v[e])
                  ? s
                  : ''
              : f[C][e];
          },
          O = (e, a) => {
            'tr' === C
              ? 'body' === e
                ? y({ ...v, body: a.split('\n') })
                : y({ ...v, [e]: a })
              : S({ ...f, [C]: { ...f[C], [e]: a } });
          },
          R = () => {
            (y(h), S(N), w('tr'), b(null));
          },
          z = async () => {
            var e;
            let a = (null != (e = v.body) ? e : []).map((e) => e.trim()).filter(Boolean);
            if (v.title.length < 3 || !v.tag || !v.excerpt || 0 === a.length) return;
            let s = {
              ...v,
              body: a,
              i18n: (() => {
                let e = {};
                for (let a of ['kk', 'ru']) {
                  let s = f[a],
                    t = {};
                  (s.title.trim() && (t.title = s.title.trim()),
                    s.tag.trim() && (t.tag = s.tag.trim()),
                    s.excerpt.trim() && (t.excerpt = s.excerpt.trim()));
                  let l = s.body
                    .split('\n')
                    .map((e) => e.trim())
                    .filter(Boolean);
                  (l.length && (t.body = l), Object.keys(t).length && (e[a] = t));
                }
                return Object.keys(e).length ? e : void 0;
              })(),
              categoryCode: v.categoryCode || null,
              contentType: v.contentType || 'guide',
            };
            (k ? await o.updateArticle(k, s) : await o.createArticle(s), R(), c());
          },
          K = {
            title: '',
            prompt: '',
            titleKk: '',
            promptKk: '',
            titleRu: '',
            promptRu: '',
            weekStart: '',
          },
          [A, P] = (0, l.useState)(K),
          [D, B] = (0, l.useState)('tr'),
          U = 'tr' === D ? 'title' : 'kk' === D ? 'titleKk' : 'titleRu',
          F = 'tr' === D ? 'prompt' : 'kk' === D ? 'promptKk' : 'promptRu',
          E = async () => {
            A.title.length < 2 ||
              A.prompt.length < 2 ||
              (await o.createTheme({
                title: A.title,
                prompt: A.prompt,
                weekStart: A.weekStart || new Date().toISOString(),
                i18n: j({
                  title: { kk: A.titleKk, ru: A.titleRu },
                  prompt: { kk: A.promptKk, ru: A.promptRu },
                }),
              }),
              P(K),
              B('tr'),
              p());
          },
          L = (null != d ? d : []).filter((e) => 'pending' === e.status),
          Y = (null != d ? d : []).filter((e) => 'pending' !== e.status);
        return (0, t.jsxs)(t.Fragment, {
          children: [
            (0, t.jsx)('h1', { className: 'page-title', children: 'İ\xe7erik & Blog' }),
            (0, t.jsx)('p', {
              className: 'page-sub',
              children:
                'AYNA Blog edit\xf6r\xfc \xb7 kullanıcı başvuruları (onayla → puan) \xb7 haftalık W2W teması',
            }),
            (0, t.jsxs)('div', {
              className: 'card',
              style: { marginBottom: 20 },
              children: [
                (0, t.jsx)('div', {
                  className: 'section-title',
                  children: k ? 'Yazıyı d\xfczenle' : 'Yeni yazı',
                }),
                (0, t.jsxs)('div', {
                  className: 'form-inline',
                  children: [
                    (0, t.jsx)(x, {
                      lang: C,
                      setLang: w,
                      filled: (e) => 'tr' !== e && Object.values(f[e]).some((e) => !!e.trim()),
                    }),
                    (0, t.jsx)('input', {
                      className: 'input',
                      placeholder:
                        'tr' === C
                          ? 'Başlık (TR — kaynak)'
                          : 'Başlık ('.concat(C.toUpperCase(), ')'),
                      value: T('title'),
                      onChange: (e) => O('title', e.target.value),
                    }),
                    (0, t.jsx)('input', {
                      className: 'input',
                      placeholder:
                        'tr' === C
                          ? 'Etiket (\xf6rn. Bakım)'
                          : 'Etiket ('.concat(C.toUpperCase(), ')'),
                      value: T('tag'),
                      onChange: (e) => O('tag', e.target.value),
                    }),
                    (0, t.jsx)('input', {
                      className: 'input',
                      placeholder: 'Kategori kodu → Teklif al CTA (\xf6rn. hair)',
                      value: null != (e = v.categoryCode) ? e : '',
                      onChange: (e) => y({ ...v, categoryCode: e.target.value }),
                    }),
                    (0, t.jsxs)('select', {
                      value: null != (a = v.contentType) ? a : 'guide',
                      onChange: (e) => y({ ...v, contentType: e.target.value }),
                      children: [
                        (0, t.jsx)('option', { value: 'guide', children: 'Rehber' }),
                        (0, t.jsx)('option', { value: 'trend', children: 'Trend (Keşfet bandı)' }),
                        (0, t.jsx)('option', { value: 'care_plan', children: 'Bakım planı' }),
                        (0, t.jsx)('option', {
                          value: 'expert_spotlight',
                          children: 'Uzman vitrini',
                        }),
                        (0, t.jsx)('option', { value: 'listicle', children: 'Listicle' }),
                      ],
                    }),
                    (0, t.jsx)('input', {
                      className: 'input',
                      type: 'number',
                      placeholder: 'Okuma dk',
                      value: null != (s = v.readMin) ? s : 3,
                      onChange: (e) => y({ ...v, readMin: Number(e.target.value) }),
                    }),
                    (0, t.jsx)('input', {
                      className: 'input full',
                      placeholder: 'G\xf6rsel URL (https://...)',
                      value: null != (i = v.image) ? i : '',
                      onChange: (e) => y({ ...v, image: e.target.value }),
                    }),
                    (0, t.jsx)('input', {
                      className: 'input full',
                      placeholder:
                        'tr' === C
                          ? '\xd6zet (kart altında g\xf6r\xfcn\xfcr)'
                          : '\xd6zet ('.concat(C.toUpperCase(), ')'),
                      value: T('excerpt'),
                      onChange: (e) => O('excerpt', e.target.value),
                    }),
                    (0, t.jsx)('textarea', {
                      className: 'input full',
                      placeholder:
                        'tr' === C
                          ? 'İ\xe7erik — her satır bir paragraf'
                          : 'İ\xe7erik ('.concat(C.toUpperCase(), ') — her satır bir paragraf'),
                      rows: 6,
                      value: T('body'),
                      onChange: (e) => O('body', e.target.value),
                    }),
                    (0, t.jsxs)('label', {
                      className: 'check',
                      children: [
                        (0, t.jsx)('input', {
                          type: 'checkbox',
                          checked: null != (n = v.published) && n,
                          onChange: (e) => y({ ...v, published: e.target.checked }),
                        }),
                        'Yayında',
                      ],
                    }),
                    (0, t.jsx)('button', {
                      className: 'btn-sm btn-ok',
                      onClick: z,
                      children: k ? 'Kaydet' : '+ Yazı ekle',
                    }),
                    k &&
                      (0, t.jsx)('button', {
                        className: 'btn-sm',
                        onClick: R,
                        children: 'Vazge\xe7',
                      }),
                  ],
                }),
              ],
            }),
            (0, t.jsx)('div', {
              className: 'card',
              style: { marginBottom: 28 },
              children:
                r && 0 !== r.length
                  ? r.map((e) =>
                      (0, t.jsxs)(
                        'div',
                        {
                          className: 'list-row',
                          children: [
                            e.image
                              ? (0, t.jsx)('img', { className: 'thumb', src: e.image, alt: '' })
                              : (0, t.jsx)('div', { className: 'thumb' }),
                            (0, t.jsxs)('div', {
                              className: 'grow',
                              children: [
                                (0, t.jsxs)('div', {
                                  className: 'name',
                                  children: [e.tag, ' \xb7 ', e.title],
                                }),
                                (0, t.jsxs)('div', {
                                  className: 'meta',
                                  children: [
                                    e.excerpt,
                                    e.categoryCode ? ' \xb7 CTA: '.concat(e.categoryCode) : '',
                                    ' \xb7 ',
                                    e.readMin,
                                    ' dk',
                                  ],
                                }),
                              ],
                            }),
                            (0, t.jsx)('button', {
                              className: 'switch '.concat(e.published ? 'on' : 'off'),
                              onClick: async () => {
                                (await o.updateArticle(e.id, { published: !e.published }), c());
                              },
                              children: e.published ? 'Yayında' : 'Taslak',
                            }),
                            (0, t.jsx)('button', {
                              className: 'btn-sm',
                              onClick: () =>
                                ((e) => {
                                  var a, s, t, l, i, n, r, c, d, o, m;
                                  (b(e.id),
                                    y({
                                      title: e.title,
                                      tag: e.tag,
                                      categoryCode: null != (d = e.categoryCode) ? d : '',
                                      contentType: null != (o = e.contentType) ? o : 'guide',
                                      readMin: e.readMin,
                                      image: e.image,
                                      excerpt: e.excerpt,
                                      body: e.body.length ? e.body : [''],
                                      published: e.published,
                                    }));
                                  let u = null != (m = e.i18n) ? m : {},
                                    p = (e) =>
                                      Array.isArray(e)
                                        ? e.join('\n')
                                        : 'string' == typeof e
                                          ? e
                                          : '';
                                  (S({
                                    kk: {
                                      title: p(null == (a = u.kk) ? void 0 : a.title),
                                      tag: p(null == (s = u.kk) ? void 0 : s.tag),
                                      excerpt: p(null == (t = u.kk) ? void 0 : t.excerpt),
                                      body: p(null == (l = u.kk) ? void 0 : l.body),
                                    },
                                    ru: {
                                      title: p(null == (i = u.ru) ? void 0 : i.title),
                                      tag: p(null == (n = u.ru) ? void 0 : n.tag),
                                      excerpt: p(null == (r = u.ru) ? void 0 : r.excerpt),
                                      body: p(null == (c = u.ru) ? void 0 : c.body),
                                    },
                                  }),
                                    w('tr'));
                                })(e),
                              children: 'D\xfczenle',
                            }),
                            (0, t.jsx)('button', {
                              className: 'btn-sm btn-danger',
                              onClick: async () => {
                                confirm('Yazı silinsin mi?') && (await o.deleteArticle(e.id), c());
                              },
                              children: 'Sil',
                            }),
                          ],
                        },
                        e.id,
                      ),
                    )
                  : (0, t.jsx)('div', { className: 'empty', children: 'Yazı yok' }),
            }),
            (0, t.jsx)('h2', { className: 'section-head', children: 'Kullanıcı blog başvuruları' }),
            (0, t.jsx)('p', {
              className: 'page-sub',
              children: 'Onaylanan başvuru otomatik yayına alınır ve yazara 200 puan verilir.',
            }),
            (0, t.jsxs)('div', {
              className: 'card',
              style: { marginBottom: 28 },
              children: [
                0 === L.length
                  ? (0, t.jsx)('div', { className: 'empty', children: 'Bekleyen başvuru yok' })
                  : L.map((e) => {
                      var a;
                      return (0, t.jsxs)(
                        'div',
                        {
                          className: 'list-col',
                          children: [
                            (0, t.jsx)('div', { className: 'name', children: e.title }),
                            (0, t.jsxs)('div', {
                              className: 'meta',
                              children: [
                                e.authorName,
                                ' \xb7 ',
                                e.tag || 'Topluluk',
                                ' \xb7',
                                ' ',
                                new Date(e.createdAt).toLocaleDateString('tr-TR'),
                              ],
                            }),
                            (0, t.jsx)('div', {
                              className: 'meta',
                              style: { marginTop: 6 },
                              children:
                                e.excerpt || (null == (a = e.body[0]) ? void 0 : a.slice(0, 140)),
                            }),
                            (0, t.jsxs)('div', {
                              className: 'form-inline',
                              style: { marginTop: 10 },
                              children: [
                                (0, t.jsx)('input', {
                                  className: 'input',
                                  placeholder: 'Kategori kodu (opsiyonel)',
                                  id: 'cat-'.concat(e.id),
                                }),
                                (0, t.jsx)('input', {
                                  className: 'input',
                                  placeholder: 'G\xf6rsel URL (opsiyonel)',
                                  id: 'img-'.concat(e.id),
                                }),
                                (0, t.jsx)('button', {
                                  className: 'btn-sm btn-ok',
                                  onClick: async () => {
                                    var a, s;
                                    let t =
                                        null == (a = document.getElementById('cat-'.concat(e.id)))
                                          ? void 0
                                          : a.value,
                                      l =
                                        null == (s = document.getElementById('img-'.concat(e.id)))
                                          ? void 0
                                          : s.value,
                                      i = { decision: 'approve' };
                                    (t && (i.categoryCode = t),
                                      l && (i.image = l),
                                      await o.reviewApplication(e.id, i),
                                      m(),
                                      c());
                                  },
                                  children: 'Onayla → yayınla + 200 puan',
                                }),
                                (0, t.jsx)('button', {
                                  className: 'btn-sm btn-danger',
                                  onClick: async () => {
                                    var a;
                                    let s =
                                      null != (a = prompt('Red gerek\xe7esi (opsiyonel):'))
                                        ? a
                                        : '';
                                    (await o.reviewApplication(e.id, {
                                      decision: 'reject',
                                      note: s,
                                    }),
                                      m());
                                  },
                                  children: 'Reddet',
                                }),
                              ],
                            }),
                          ],
                        },
                        e.id,
                      );
                    }),
                Y.length > 0 &&
                  (0, t.jsx)('div', {
                    style: { marginTop: 12, opacity: 0.7 },
                    children: Y.map((e) =>
                      (0, t.jsx)(
                        'div',
                        {
                          className: 'list-row',
                          children: (0, t.jsxs)('div', {
                            className: 'grow',
                            children: [
                              (0, t.jsx)('div', { className: 'name', children: e.title }),
                              (0, t.jsxs)('div', {
                                className: 'meta',
                                children: [
                                  e.authorName,
                                  ' \xb7',
                                  ' ',
                                  'approved' === e.status
                                    ? 'onaylandı (+'.concat(e.points, ' puan)')
                                    : 'reddedildi',
                                  e.note ? ' \xb7 '.concat(e.note) : '',
                                ],
                              }),
                            ],
                          }),
                        },
                        e.id,
                      ),
                    ),
                  }),
              ],
            }),
            (0, t.jsx)('h2', { className: 'section-head', children: 'Haftalık W2W teması' }),
            (0, t.jsx)('p', {
              className: 'page-sub',
              children: "App'te haftanın sorusu/teması. Tek tema aktif olabilir.",
            }),
            (0, t.jsx)('div', {
              className: 'card',
              style: { marginBottom: 20 },
              children: (0, t.jsxs)('div', {
                className: 'form-inline',
                children: [
                  (0, t.jsx)(x, {
                    lang: D,
                    setLang: B,
                    filled: (e) =>
                      'kk' === e ? !!A.titleKk || !!A.promptKk : !!A.titleRu || !!A.promptRu,
                  }),
                  (0, t.jsx)('input', {
                    className: 'input',
                    placeholder:
                      'tr' === D
                        ? 'Tema başlığı (TR — kaynak)'
                        : 'Tema başlığı ('.concat(D.toUpperCase(), ')'),
                    value: A[U],
                    onChange: (e) => P({ ...A, [U]: e.target.value }),
                  }),
                  (0, t.jsx)('input', {
                    className: 'input full',
                    placeholder:
                      'tr' === D
                        ? 'Soru / y\xf6nlendirme metni'
                        : 'Soru / y\xf6nlendirme ('.concat(D.toUpperCase(), ')'),
                    value: A[F],
                    onChange: (e) => P({ ...A, [F]: e.target.value }),
                  }),
                  (0, t.jsx)('input', {
                    className: 'input',
                    type: 'date',
                    value: A.weekStart,
                    onChange: (e) => P({ ...A, weekStart: e.target.value }),
                  }),
                  (0, t.jsx)('button', {
                    className: 'btn-sm btn-ok',
                    onClick: E,
                    children: '+ Tema ekle',
                  }),
                ],
              }),
            }),
            (0, t.jsx)('div', {
              className: 'card',
              children:
                u && 0 !== u.length
                  ? u.map((e) =>
                      (0, t.jsxs)(
                        'div',
                        {
                          className: 'list-row',
                          children: [
                            (0, t.jsxs)('div', {
                              className: 'grow',
                              children: [
                                (0, t.jsx)('div', { className: 'name', children: e.title }),
                                (0, t.jsxs)('div', {
                                  className: 'meta',
                                  children: [
                                    e.prompt,
                                    ' \xb7 ',
                                    new Date(e.weekStart).toLocaleDateString('tr-TR'),
                                  ],
                                }),
                              ],
                            }),
                            e.active
                              ? (0, t.jsx)('span', { className: 'switch on', children: 'Aktif' })
                              : (0, t.jsx)('button', {
                                  className: 'btn-sm',
                                  onClick: async () => {
                                    (await o.activateTheme(e.id), p());
                                  },
                                  children: 'Aktifleştir',
                                }),
                          ],
                        },
                        e.id,
                      ),
                    )
                  : (0, t.jsx)('div', { className: 'empty', children: 'Tema yok' }),
            }),
          ],
        });
      }
      let G = [
        { id: 'all', label: 'T\xfcm kullanıcılar' },
        { id: 'premium', label: 'Premium \xfcyeler' },
        { id: 'platinum', label: '\uD83D\uDC8E Platinum \xfcyeler' },
        { id: 'professionals', label: 'Uzmanlar' },
        { id: 'salons', label: 'Salonlar' },
        { id: 'city', label: 'Şehir bazlı' },
      ];
      function W() {
        let { data: e, reload: a } = g(() => o.announcements(), []),
          s = {
            title: '',
            body: '',
            titleKk: '',
            bodyKk: '',
            titleRu: '',
            bodyRu: '',
            segment: 'all',
            city: '',
          },
          [i, n] = (0, l.useState)(s),
          [r, c] = (0, l.useState)('tr'),
          [d, m] = (0, l.useState)(null),
          u = 'tr' === r ? 'title' : 'kk' === r ? 'titleKk' : 'titleRu',
          p = 'tr' === r ? 'body' : 'kk' === r ? 'bodyKk' : 'bodyRu',
          h = async () => {
            if (
              i.title.length < 2 ||
              i.body.length < 2 ||
              ('city' === i.segment && !i.city) ||
              !confirm('"'.concat(i.title, '" duyurusu g\xf6nderilsin mi?'))
            )
              return;
            let e = j({
                title: { kk: i.titleKk, ru: i.titleRu },
                body: { kk: i.bodyKk, ru: i.bodyRu },
              }),
              t = await o.sendAnnouncement({
                title: i.title,
                body: i.body,
                i18n: e,
                segment: i.segment,
                city: 'city' === i.segment ? i.city : void 0,
              });
            (m('G\xf6nderildi — '.concat(t.recipientCount, ' alıcı')), n(s), c('tr'), a());
          };
        return (0, t.jsxs)(t.Fragment, {
          children: [
            (0, t.jsx)('h1', { className: 'page-title', children: 'Bildirimler' }),
            (0, t.jsx)('p', {
              className: 'page-sub',
              children: 'Segment bazlı toplu duyuru — app bildirim listesine d\xfcşer',
            }),
            (0, t.jsx)('div', {
              className: 'card',
              style: { marginBottom: 20 },
              children: (0, t.jsxs)('div', {
                className: 'form-inline',
                children: [
                  (0, t.jsx)(x, {
                    lang: r,
                    setLang: c,
                    filled: (e) =>
                      'kk' === e ? !!i.titleKk || !!i.bodyKk : !!i.titleRu || !!i.bodyRu,
                  }),
                  (0, t.jsx)('input', {
                    className: 'input full',
                    placeholder:
                      'tr' === r
                        ? 'Duyuru başlığı (TR — kaynak)'
                        : 'Başlık ('.concat(r.toUpperCase(), ')'),
                    value: i[u],
                    onChange: (e) => n({ ...i, [u]: e.target.value }),
                  }),
                  (0, t.jsx)('textarea', {
                    className: 'input full',
                    placeholder:
                      'tr' === r
                        ? 'Duyuru metni (TR — kaynak)'
                        : 'Metin ('.concat(r.toUpperCase(), ')'),
                    rows: 3,
                    value: i[p],
                    onChange: (e) => n({ ...i, [p]: e.target.value }),
                  }),
                  (0, t.jsx)('select', {
                    className: 'input',
                    value: i.segment,
                    onChange: (e) => n({ ...i, segment: e.target.value }),
                    children: G.map((e) =>
                      (0, t.jsx)('option', { value: e.id, children: e.label }, e.id),
                    ),
                  }),
                  'city' === i.segment &&
                    (0, t.jsx)('input', {
                      className: 'input',
                      placeholder: 'Şehir (\xf6rn. Almatı)',
                      value: i.city,
                      onChange: (e) => n({ ...i, city: e.target.value }),
                    }),
                  (0, t.jsx)('button', {
                    className: 'btn-sm btn-ok full',
                    onClick: h,
                    children: '\uD83D\uDCE3 Duyuruyu g\xf6nder',
                  }),
                  d &&
                    (0, t.jsx)('div', {
                      className: 'meta full',
                      style: { color: 'var(--success)' },
                      children: d,
                    }),
                ],
              }),
            }),
            (0, t.jsx)('h2', { className: 'section-head', children: 'G\xf6nderim ge\xe7mişi' }),
            (0, t.jsx)('div', {
              className: 'card',
              children:
                e && 0 !== e.length
                  ? e.map((e) => {
                      var a, s, l;
                      return (0, t.jsxs)(
                        'div',
                        {
                          className: 'list-col',
                          children: [
                            (0, t.jsx)('div', { className: 'name', children: e.title }),
                            (0, t.jsx)('div', {
                              className: 'meta',
                              style: { marginTop: 4 },
                              children: e.body,
                            }),
                            (0, t.jsxs)('div', {
                              className: 'meta',
                              style: { marginTop: 6 },
                              children: [
                                ((a = e.segment),
                                null !=
                                (l = null == (s = G.find((e) => e.id === a)) ? void 0 : s.label)
                                  ? l
                                  : a),
                                e.city ? ' \xb7 '.concat(e.city) : '',
                                ' \xb7 ',
                                e.recipientCount,
                                ' alıcı \xb7',
                                ' ',
                                new Date(e.createdAt).toLocaleString('tr-TR'),
                              ],
                            }),
                          ],
                        },
                        e.id,
                      );
                    })
                  : (0, t.jsx)('div', {
                      className: 'empty',
                      children: 'Hen\xfcz duyuru g\xf6nderilmedi',
                    }),
            }),
          ],
        });
      }
      function M() {
        let { data: e, reload: a } = g(() => o.ads(), []),
          { data: s } = g(() => o.professionals(), []),
          i = {
            proId: '',
            title: '',
            subtitle: '',
            titleKk: '',
            subtitleKk: '',
            titleRu: '',
            subtitleRu: '',
            image: '',
          },
          [n, r] = (0, l.useState)(i),
          [c, d] = (0, l.useState)('tr'),
          m = 'tr' === c ? 'title' : 'kk' === c ? 'titleKk' : 'titleRu',
          u = 'tr' === c ? 'subtitle' : 'kk' === c ? 'subtitleKk' : 'subtitleRu',
          p = async () => {
            n.proId &&
              !(n.title.length < 2) &&
              n.image &&
              (await o.createAd({
                proId: n.proId,
                title: n.title,
                subtitle: n.subtitle || void 0,
                i18n: j({
                  title: { kk: n.titleKk, ru: n.titleRu },
                  subtitle: { kk: n.subtitleKk, ru: n.subtitleRu },
                }),
                image: n.image,
              }),
              r(i),
              d('tr'),
              a());
          };
        return (0, t.jsxs)(t.Fragment, {
          children: [
            (0, t.jsx)('h1', { className: 'page-title', children: 'Reklamlar' }),
            (0, t.jsx)('p', {
              className: 'page-sub',
              children: 'Keşif ekranındaki sponsorlu reklam şeridi',
            }),
            (0, t.jsx)('div', {
              className: 'card',
              style: { marginBottom: 20 },
              children: (0, t.jsxs)('div', {
                className: 'form-inline',
                children: [
                  (0, t.jsxs)('select', {
                    className: 'input',
                    value: n.proId,
                    onChange: (e) => {
                      var a;
                      let t = null == s ? void 0 : s.find((a) => a.id === e.target.value);
                      r({
                        ...n,
                        proId: e.target.value,
                        title: n.title || (null != (a = null == t ? void 0 : t.name) ? a : ''),
                      });
                    },
                    children: [
                      (0, t.jsx)('option', { value: '', children: 'İşletme se\xe7…' }),
                      (null != s ? s : []).map((e) =>
                        (0, t.jsxs)(
                          'option',
                          { value: e.id, children: [e.name, ' \xb7 ', e.sector] },
                          e.id,
                        ),
                      ),
                    ],
                  }),
                  (0, t.jsx)(x, {
                    lang: c,
                    setLang: d,
                    filled: (e) =>
                      'kk' === e ? !!n.titleKk || !!n.subtitleKk : !!n.titleRu || !!n.subtitleRu,
                  }),
                  (0, t.jsx)('input', {
                    className: 'input',
                    placeholder:
                      'tr' === c ? 'Başlık (TR — kaynak)' : 'Başlık ('.concat(c.toUpperCase(), ')'),
                    value: n[m],
                    onChange: (e) => r({ ...n, [m]: e.target.value }),
                  }),
                  (0, t.jsx)('input', {
                    className: 'input',
                    placeholder:
                      'tr' === c ? 'Alt başlık (TR)' : 'Alt başlık ('.concat(c.toUpperCase(), ')'),
                    value: n[u],
                    onChange: (e) => r({ ...n, [u]: e.target.value }),
                  }),
                  (0, t.jsx)('input', {
                    className: 'input',
                    placeholder: 'G\xf6rsel URL (https://...)',
                    value: n.image,
                    onChange: (e) => r({ ...n, image: e.target.value }),
                  }),
                  (0, t.jsx)('button', {
                    className: 'btn-sm btn-ok full',
                    onClick: p,
                    children: '+ Reklam ekle',
                  }),
                ],
              }),
            }),
            (0, t.jsx)('div', {
              className: 'card',
              children:
                e && 0 !== e.length
                  ? e.map((e) => {
                      var l, i, n;
                      return (0, t.jsxs)(
                        'div',
                        {
                          className: 'list-row',
                          children: [
                            e.image
                              ? (0, t.jsx)('img', { className: 'thumb', src: e.image, alt: '' })
                              : (0, t.jsx)('div', { className: 'thumb' }),
                            (0, t.jsxs)('div', {
                              className: 'grow',
                              children: [
                                (0, t.jsx)('div', { className: 'name', children: e.title }),
                                (0, t.jsxs)('div', {
                                  className: 'meta',
                                  children: [
                                    e.subtitle,
                                    ' \xb7 ',
                                    ((l = e.proId),
                                    null !=
                                    (n =
                                      null == s || null == (i = s.find((e) => e.id === l))
                                        ? void 0
                                        : i.name)
                                      ? n
                                      : l),
                                  ],
                                }),
                              ],
                            }),
                            (0, t.jsx)('button', {
                              className: 'switch '.concat(e.active ? 'on' : 'off'),
                              onClick: async () => {
                                (await o.setAdActive(e.id, !e.active), a());
                              },
                              children: e.active ? 'Aktif' : 'Pasif',
                            }),
                            (0, t.jsx)('button', {
                              className: 'btn-sm btn-danger',
                              onClick: async () => {
                                confirm('Reklam silinsin mi?') && (await o.deleteAd(e.id), a());
                              },
                              children: 'Sil',
                            }),
                          ],
                        },
                        e.id,
                      );
                    })
                  : (0, t.jsx)('div', { className: 'empty', children: 'Reklam yok' }),
            }),
          ],
        });
      }
      let _ = {
        name: '',
        sector: 'hair',
        specialty: '',
        kind: 'salon',
        district: '',
        about: '',
        experienceYears: 0,
        priceFrom: 0,
        imageUrl: '',
      };
      function H() {
        var e, a, s, i, n, r, c;
        let { data: d, reload: u } = g(() => o.professionals(), []),
          { data: p } = g(() => o.categories(), []),
          [h, v] = (0, l.useState)(null),
          [y, x] = (0, l.useState)(''),
          j = (null != d ? d : []).filter(
            (e) =>
              !y ||
              e.name.toLowerCase().includes(y.toLowerCase()) ||
              e.sector.includes(y.toLowerCase()),
          ),
          k = async () => {
            if (!h || !h.form.name || h.form.name.length < 2 || !h.form.sector) return;
            let e = { ...h.form };
            (e.imageUrl || delete e.imageUrl,
              e.specialty || delete e.specialty,
              e.district || delete e.district,
              e.about || delete e.about,
              h.id ? await o.updateProfessional(h.id, e) : await o.createProfessional(e),
              v(null),
              u());
          },
          b = async (e) => {
            confirm('Uzman silinsin mi? (ilişkili teklifler de silinir)') &&
              (await o.deleteProfessional(e), u());
          };
        return (0, t.jsxs)(t.Fragment, {
          children: [
            (0, t.jsx)('h1', { className: 'page-title', children: 'Uzmanlar' }),
            (0, t.jsx)('p', {
              className: 'page-sub',
              children:
                'Keşif listesindeki uzman/salonlar — ekle, d\xfczenle, fiyat, \xf6ne \xe7ıkar, sil',
            }),
            (0, t.jsxs)('div', {
              className: 'toolbar',
              children: [
                (0, t.jsx)('button', {
                  className: 'btn-sm btn-ok',
                  onClick: () => v({ form: { ..._ } }),
                  children: '+ Yeni uzman',
                }),
                (0, t.jsx)('input', {
                  className: 'input',
                  style: { height: 34, maxWidth: 240 },
                  placeholder: 'Ara (isim / sekt\xf6r)',
                  value: y,
                  onChange: (e) => x(e.target.value),
                }),
                (0, t.jsxs)('span', {
                  className: 'page-sub',
                  style: { margin: 0 },
                  children: [j.length, ' kayıt'],
                }),
              ],
            }),
            (0, t.jsx)('div', {
              className: 'card',
              children: d
                ? 0 === j.length
                  ? (0, t.jsx)('div', { className: 'empty', children: 'Uzman yok' })
                  : j.map((e) =>
                      (0, t.jsxs)(
                        'div',
                        {
                          className: 'list-row',
                          children: [
                            e.imageUrl
                              ? (0, t.jsx)('img', { className: 'thumb', src: e.imageUrl, alt: '' })
                              : (0, t.jsx)('div', { className: 'thumb' }),
                            (0, t.jsxs)('div', {
                              className: 'grow',
                              children: [
                                (0, t.jsxs)('div', {
                                  className: 'name',
                                  children: [e.name, e.featured ? ' \xb7 ⭐' : ''],
                                }),
                                (0, t.jsxs)('div', {
                                  className: 'meta',
                                  children: [
                                    e.sector,
                                    ' \xb7 ',
                                    e.district || '—',
                                    ' \xb7',
                                    ' ',
                                    e.priceFrom > 0 ? m(e.priceFrom) + '+' : 'fiyat yok',
                                    ' \xb7 ★ ',
                                    e.rating.toFixed(1),
                                    ' ',
                                    '(',
                                    e.reviewCount,
                                    ')',
                                  ],
                                }),
                              ],
                            }),
                            (0, t.jsx)('button', {
                              className: 'switch '.concat(e.featured ? 'on' : 'off'),
                              onClick: async () => {
                                (await o.setFeatured(e.id, !e.featured), u());
                              },
                              children: e.featured ? '\xd6ne \xe7ıkan' : 'Normal',
                            }),
                            (0, t.jsx)('button', {
                              className: 'btn-sm btn-ghost',
                              onClick: () =>
                                v({
                                  id: e.id,
                                  form: {
                                    name: e.name,
                                    sector: e.sector,
                                    specialty: e.specialty,
                                    kind: e.kind,
                                    district: e.district,
                                    about: e.about,
                                    experienceYears: e.experienceYears,
                                    priceFrom: e.priceFrom,
                                    imageUrl: e.imageUrl,
                                  },
                                }),
                              children: 'D\xfczenle',
                            }),
                            (0, t.jsx)('button', {
                              className: 'btn-sm btn-danger',
                              onClick: () => b(e.id),
                              children: 'Sil',
                            }),
                          ],
                        },
                        e.id,
                      ),
                    )
                : (0, t.jsx)('div', { className: 'empty', children: 'Y\xfckleniyor…' }),
            }),
            h
              ? (0, t.jsx)('div', {
                  className: 'modal-backdrop',
                  onClick: () => v(null),
                  children: (0, t.jsxs)('div', {
                    className: 'modal',
                    onClick: (e) => e.stopPropagation(),
                    children: [
                      (0, t.jsxs)('div', {
                        className: 'modal-head',
                        children: [
                          (0, t.jsx)('div', {
                            className: 'page-title',
                            style: { fontSize: 20 },
                            children: h.id ? 'Uzmanı d\xfczenle' : 'Yeni uzman',
                          }),
                          (0, t.jsx)('button', {
                            className: 'btn-sm btn-ghost',
                            onClick: () => v(null),
                            children: 'Kapat',
                          }),
                        ],
                      }),
                      (0, t.jsxs)('div', {
                        className: 'form-inline',
                        children: [
                          (0, t.jsx)(q, {
                            label: 'Ad *',
                            children: (0, t.jsx)('input', {
                              className: 'input',
                              value: h.form.name,
                              onChange: (e) =>
                                v({ ...h, form: { ...h.form, name: e.target.value } }),
                            }),
                          }),
                          (0, t.jsx)(q, {
                            label: 'Sekt\xf6r *',
                            children: (0, t.jsx)('select', {
                              className: 'input',
                              value: h.form.sector,
                              onChange: (e) =>
                                v({ ...h, form: { ...h.form, sector: e.target.value } }),
                              children: (null != p ? p : []).map((e) =>
                                (0, t.jsxs)(
                                  'option',
                                  { value: e.code, children: [e.nameTr, ' (', e.code, ')'] },
                                  e.id,
                                ),
                              ),
                            }),
                          }),
                          (0, t.jsx)(q, {
                            label: 'Uzmanlık',
                            children: (0, t.jsx)('input', {
                              className: 'input',
                              value: null != (e = h.form.specialty) ? e : '',
                              onChange: (e) =>
                                v({ ...h, form: { ...h.form, specialty: e.target.value } }),
                            }),
                          }),
                          (0, t.jsx)(q, {
                            label: 'T\xfcr',
                            children: (0, t.jsxs)('select', {
                              className: 'input',
                              value: null != (a = h.form.kind) ? a : 'salon',
                              onChange: (e) =>
                                v({ ...h, form: { ...h.form, kind: e.target.value } }),
                              children: [
                                (0, t.jsx)('option', { value: 'salon', children: 'Salon' }),
                                (0, t.jsx)('option', {
                                  value: 'independent',
                                  children: 'Bağımsız uzman',
                                }),
                              ],
                            }),
                          }),
                          (0, t.jsx)(q, {
                            label: 'İl\xe7e/B\xf6lge',
                            children: (0, t.jsx)('input', {
                              className: 'input',
                              value: null != (s = h.form.district) ? s : '',
                              onChange: (e) =>
                                v({ ...h, form: { ...h.form, district: e.target.value } }),
                            }),
                          }),
                          (0, t.jsx)(q, {
                            label: 'Başlangı\xe7 fiyatı (KZT)',
                            children: (0, t.jsx)('input', {
                              className: 'input',
                              type: 'number',
                              value: null != (i = h.form.priceFrom) ? i : 0,
                              onChange: (e) =>
                                v({ ...h, form: { ...h.form, priceFrom: Number(e.target.value) } }),
                            }),
                          }),
                          (0, t.jsx)(q, {
                            label: 'Deneyim (yıl)',
                            children: (0, t.jsx)('input', {
                              className: 'input',
                              type: 'number',
                              value: null != (n = h.form.experienceYears) ? n : 0,
                              onChange: (e) =>
                                v({
                                  ...h,
                                  form: { ...h.form, experienceYears: Number(e.target.value) },
                                }),
                            }),
                          }),
                          (0, t.jsx)(q, {
                            label: 'G\xf6rsel URL',
                            children: (0, t.jsx)('input', {
                              className: 'input',
                              value: null != (r = h.form.imageUrl) ? r : '',
                              onChange: (e) =>
                                v({ ...h, form: { ...h.form, imageUrl: e.target.value } }),
                            }),
                          }),
                          (0, t.jsx)(q, {
                            label: 'Hakkında',
                            full: !0,
                            children: (0, t.jsx)('input', {
                              className: 'input',
                              value: null != (c = h.form.about) ? c : '',
                              onChange: (e) =>
                                v({ ...h, form: { ...h.form, about: e.target.value } }),
                            }),
                          }),
                          (0, t.jsx)('button', {
                            className: 'btn-sm btn-ok full',
                            onClick: k,
                            children: h.id ? 'Kaydet' : 'Uzman ekle',
                          }),
                        ],
                      }),
                    ],
                  }),
                })
              : null,
          ],
        });
      }
      function q(e) {
        let { label: a, children: s, full: l } = e;
        return (0, t.jsxs)('div', {
          className: l ? 'full' : '',
          children: [
            (0, t.jsx)('div', { className: 'kv-k', style: { marginBottom: 6 }, children: a }),
            s,
          ],
        });
      }
      function V() {
        let { data: e, reload: a } = g(() => o.categories(), []),
          [s, i] = (0, l.useState)({
            code: '',
            nameTr: '',
            icon: '✨',
            tone: 'rose',
            sortOrder: '',
          }),
          n = async () => {
            s.code &&
              s.nameTr &&
              (await o.createCategory({
                code: s.code,
                nameTr: s.nameTr,
                icon: s.icon,
                tone: s.tone,
                sortOrder: s.sortOrder ? Number(s.sortOrder) : void 0,
              }),
              i({ code: '', nameTr: '', icon: '✨', tone: 'rose', sortOrder: '' }),
              a());
          };
        return (0, t.jsxs)(t.Fragment, {
          children: [
            (0, t.jsx)('h1', { className: 'page-title', children: 'Hizmetler' }),
            (0, t.jsx)('p', {
              className: 'page-sub',
              children:
                'Keşif kategorileri (sa\xe7, tırnak, makyaj…) — ekle, d\xfczenle, sırala, sil',
            }),
            (0, t.jsx)('div', {
              className: 'card',
              style: { marginBottom: 20 },
              children: (0, t.jsxs)('div', {
                className: 'form-inline',
                children: [
                  (0, t.jsx)('input', {
                    className: 'input',
                    placeholder: 'Kod (\xf6rn. hair)',
                    value: s.code,
                    onChange: (e) => i({ ...s, code: e.target.value }),
                  }),
                  (0, t.jsx)('input', {
                    className: 'input',
                    placeholder: 'Ad (TR)',
                    value: s.nameTr,
                    onChange: (e) => i({ ...s, nameTr: e.target.value }),
                  }),
                  (0, t.jsx)('input', {
                    className: 'input',
                    placeholder: 'İkon (emoji)',
                    value: s.icon,
                    onChange: (e) => i({ ...s, icon: e.target.value }),
                  }),
                  (0, t.jsx)('input', {
                    className: 'input',
                    placeholder: 'Sıra',
                    type: 'number',
                    value: s.sortOrder,
                    onChange: (e) => i({ ...s, sortOrder: e.target.value }),
                  }),
                  (0, t.jsx)('button', {
                    className: 'btn-sm btn-ok full',
                    onClick: n,
                    children: '+ Hizmet ekle',
                  }),
                ],
              }),
            }),
            (0, t.jsx)('div', {
              className: 'card',
              children: e
                ? 0 === e.length
                  ? (0, t.jsx)('div', { className: 'empty', children: 'Hizmet yok' })
                  : e.map((e) => (0, t.jsx)(Z, { cat: e, onChanged: a }, e.id))
                : (0, t.jsx)('div', { className: 'empty', children: 'Y\xfckleniyor…' }),
            }),
          ],
        });
      }
      function Z(e) {
        let { cat: a, onChanged: s } = e,
          [i, n] = (0, l.useState)(a.nameTr),
          [r, c] = (0, l.useState)(a.icon),
          [d, m] = (0, l.useState)(String(a.sortOrder)),
          u = i !== a.nameTr || r !== a.icon || d !== String(a.sortOrder);
        return (0, t.jsxs)('div', {
          className: 'list-row',
          children: [
            (0, t.jsx)('input', {
              className: 'input',
              style: { height: 34, maxWidth: 150 },
              value: r,
              placeholder: 'ikon',
              onChange: (e) => c(e.target.value),
            }),
            (0, t.jsx)('input', {
              className: 'input',
              style: { height: 34, flex: 1 },
              value: i,
              onChange: (e) => n(e.target.value),
            }),
            (0, t.jsx)('span', {
              className: 'pill',
              style: { background: 'var(--line)', color: 'var(--muted)' },
              children: a.code,
            }),
            (0, t.jsx)('input', {
              className: 'input',
              style: { height: 34, maxWidth: 70 },
              type: 'number',
              value: d,
              onChange: (e) => m(e.target.value),
            }),
            u
              ? (0, t.jsx)('button', {
                  className: 'btn-sm btn-ok',
                  onClick: async () => {
                    (await o.updateCategory(a.id, { nameTr: i, icon: r, sortOrder: Number(d) }),
                      s());
                  },
                  children: 'Kaydet',
                })
              : null,
            (0, t.jsx)('button', {
              className: 'btn-sm btn-danger',
              onClick: async () => {
                confirm('"'.concat(a.nameTr, '" hizmeti silinsin mi?')) &&
                  (await o.deleteCategory(a.id), s());
              },
              children: 'Sil',
            }),
          ],
        });
      }
      function Q() {
        let { data: e, reload: a } = g(() => o.marketPrices(), []),
          { data: s } = g(() => o.categories(), []),
          [i, n] = (0, l.useState)({ category: '', city: '', basePrice: '' }),
          r = async () => {
            i.category &&
              i.basePrice &&
              (await o.setMarketPrice({
                category: i.category,
                city: i.city || void 0,
                basePrice: Number(i.basePrice),
              }),
              n({ category: '', city: '', basePrice: '' }),
              a());
          };
        return (0, t.jsxs)(t.Fragment, {
          children: [
            (0, t.jsx)('h1', { className: 'page-title', children: 'Fiyatlar' }),
            (0, t.jsx)('p', {
              className: 'page-sub',
              children:
                'Piyasa taban fiyatları (kategori \xd7 şehir) — teklif tabanı ve %40-altı uyarısı i\xe7in. Uzman başlangı\xe7 fiyatları "Uzmanlar" b\xf6l\xfcm\xfcnden d\xfczenlenir.',
            }),
            (0, t.jsx)('div', {
              className: 'card',
              style: { marginBottom: 20 },
              children: (0, t.jsxs)('div', {
                className: 'form-inline',
                children: [
                  (0, t.jsxs)('select', {
                    className: 'input',
                    value: i.category,
                    onChange: (e) => n({ ...i, category: e.target.value }),
                    children: [
                      (0, t.jsx)('option', { value: '', children: 'Kategori se\xe7…' }),
                      (null != s ? s : []).map((e) =>
                        (0, t.jsx)('option', { value: e.code, children: e.nameTr }, e.id),
                      ),
                    ],
                  }),
                  (0, t.jsx)('input', {
                    className: 'input',
                    placeholder: 'Şehir (boş = genel)',
                    value: i.city,
                    onChange: (e) => n({ ...i, city: e.target.value }),
                  }),
                  (0, t.jsx)('input', {
                    className: 'input',
                    placeholder: 'Taban fiyat (KZT)',
                    type: 'number',
                    value: i.basePrice,
                    onChange: (e) => n({ ...i, basePrice: e.target.value }),
                  }),
                  (0, t.jsx)('button', {
                    className: 'btn-sm btn-ok full',
                    onClick: r,
                    children: 'Kaydet / g\xfcncelle',
                  }),
                ],
              }),
            }),
            (0, t.jsx)('div', {
              className: 'card',
              children: e
                ? 0 === e.length
                  ? (0, t.jsx)('div', { className: 'empty', children: 'Fiyat kaydı yok' })
                  : e.map((e) => {
                      var a, l, i;
                      return (0, t.jsxs)(
                        'div',
                        {
                          className: 'list-row',
                          children: [
                            (0, t.jsxs)('div', {
                              className: 'grow',
                              children: [
                                (0, t.jsx)('div', {
                                  className: 'name',
                                  children:
                                    ((a = e.category),
                                    null !=
                                    (i =
                                      null == s || null == (l = s.find((e) => e.code === a))
                                        ? void 0
                                        : l.nameTr)
                                      ? i
                                      : a),
                                }),
                                (0, t.jsxs)('div', {
                                  className: 'meta',
                                  children: [e.category, ' \xb7 ', e.city || 'Genel'],
                                }),
                              ],
                            }),
                            (0, t.jsx)('div', { className: 'kv-v', children: m(e.basePrice) }),
                          ],
                        },
                        e.id,
                      );
                    })
                : (0, t.jsx)('div', { className: 'empty', children: 'Y\xfckleniyor…' }),
            }),
          ],
        });
      }
      let X = {
        user: 'Kullanıcı',
        professional: 'Uzman',
        salon: 'Salon',
        moderator: 'Moderat\xf6r',
        admin: 'Admin',
      };
      function $() {
        let { data: e, reload: a } = g(() => o.penalties(), []);
        return (0, t.jsxs)(t.Fragment, {
          children: [
            (0, t.jsx)('h1', { className: 'page-title', children: 'Ceza Takip' }),
            (0, t.jsx)('p', {
              className: 'page-sub',
              children:
                'Kısıtlı hesaplar (yeni talep g\xf6remez) \xb7 7 g\xfcn sayacı dolunca kalıcı engel adayı',
            }),
            (0, t.jsx)('div', {
              className: 'card',
              children: e
                ? 0 === e.length
                  ? (0, t.jsx)('div', { className: 'empty', children: 'Kısıtlı hesap yok' })
                  : e.map((e) => {
                      var s;
                      return (0, t.jsxs)(
                        'div',
                        {
                          className: 'list-row',
                          children: [
                            (0, t.jsxs)('div', {
                              className: 'grow',
                              children: [
                                (0, t.jsxs)('div', {
                                  className: 'name',
                                  children: [
                                    e.name || '—',
                                    ' \xb7 ',
                                    null != (s = X[e.role]) ? s : e.role,
                                    e.banEligible ? ' \xb7 ⚠️ s\xfcre doldu' : '',
                                  ],
                                }),
                                (0, t.jsxs)('div', {
                                  className: 'meta',
                                  children: [
                                    e.restrictReason || 'gerek\xe7e yok',
                                    e.city ? ' \xb7 '.concat(e.city) : '',
                                    ' \xb7 ge\xe7en ',
                                    e.daysElapsed,
                                    'g \xb7 kalan',
                                    ' ',
                                    (0, t.jsxs)('strong', {
                                      style: {
                                        color: e.banEligible ? 'var(--danger)' : 'var(--gold)',
                                      },
                                      children: [e.daysRemaining, 'g'],
                                    }),
                                  ],
                                }),
                              ],
                            }),
                            (0, t.jsx)('button', {
                              className: 'btn-sm btn-ok',
                              onClick: async () => {
                                (await o.unrestrictUser(e.id), a());
                              },
                              children: 'Kısıtı kaldır',
                            }),
                            (0, t.jsx)('button', {
                              className: 'btn-sm btn-danger',
                              onClick: async () => {
                                confirm(
                                  ''.concat(e.name || 'Hesap', ' kalıcı olarak engellensin mi?'),
                                ) && (await o.setUserStatus(e.id, 'suspended'), a());
                              },
                              children: 'Kalıcı engel',
                            }),
                          ],
                        },
                        e.id,
                      );
                    })
                : (0, t.jsx)('div', { className: 'empty', children: 'Y\xfckleniyor…' }),
            }),
          ],
        });
      }
      function ee(e) {
        var a;
        let { user: s, onSaved: i } = e,
          n = null != (a = s.membershipTier) ? a : s.isPremium ? 'premium' : 'free',
          [r, c] = (0, l.useState)(n),
          [d, m] = (0, l.useState)(!1);
        (0, l.useEffect)(() => c(n), [n]);
        let u = r !== n;
        return (0, t.jsxs)('div', {
          style: { display: 'flex', gap: 6, alignItems: 'center' },
          children: [
            (0, t.jsxs)('select', {
              className: 'input',
              style: { height: 32, maxWidth: 120 },
              value: r,
              onChange: (e) => c(e.target.value),
              children: [
                (0, t.jsx)('option', { value: 'free', children: 'Normal' }),
                (0, t.jsx)('option', { value: 'premium', children: 'Premium' }),
                (0, t.jsx)('option', { value: 'platinum', children: 'Platinum' }),
              ],
            }),
            (0, t.jsx)('button', {
              className: 'btn-sm',
              disabled: !u || d,
              style: { opacity: u && !d ? 1 : 0.5, fontWeight: 700 },
              onClick: async () => {
                m(!0);
                try {
                  (await o.setUserTier(s.id, r), i());
                } finally {
                  m(!1);
                }
              },
              children: d ? '…' : 'Kaydet',
            }),
          ],
        });
      }
      function ea() {
        var e;
        let { data: a, reload: s } = g(() => o.users(), []),
          [i, n] = (0, l.useState)(''),
          [r, c] = (0, l.useState)('all'),
          d = (null != a ? a : []).filter((e) => {
            var a;
            return (
              ('all' === r || e.role === r) &&
              (!i ||
                e.name.toLowerCase().includes(i.toLowerCase()) ||
                (null != (a = e.email) ? a : '').toLowerCase().includes(i.toLowerCase()))
            );
          });
        return (0, t.jsxs)(t.Fragment, {
          children: [
            (0, t.jsx)('h1', { className: 'page-title', children: '\xdcyeler' }),
            (0, t.jsxs)('p', {
              className: 'page-sub',
              children: [
                'Uygulamaya kayıtlı herkes — kullanıcı, uzman, salon. \xdcyelik seviyesi + parola y\xf6netimi (',
                null != (e = null == a ? void 0 : a.length) ? e : 0,
                ' kayıt)',
              ],
            }),
            (0, t.jsxs)('div', {
              className: 'toolbar',
              children: [
                ['all', 'user', 'salon', 'professional', 'moderator', 'admin'].map((e) =>
                  (0, t.jsx)(
                    'button',
                    {
                      className: 'chip '.concat(r === e ? 'on' : ''),
                      onClick: () => c(e),
                      children: 'all' === e ? 'Hepsi' : X[e],
                    },
                    e,
                  ),
                ),
                (0, t.jsx)('input', {
                  className: 'input',
                  style: { height: 34, maxWidth: 220 },
                  placeholder: 'Ara (isim / e-posta)',
                  value: i,
                  onChange: (e) => n(e.target.value),
                }),
                (0, t.jsx)('button', {
                  className: 'btn-sm',
                  onClick: () =>
                    u(
                      'ayna-uyeler.csv',
                      d.map((e) => {
                        var a, s, t;
                        return {
                          isim: e.name,
                          rol: e.role,
                          sehir: null != (a = e.city) ? a : '',
                          eposta: null != (s = e.email) ? s : '',
                          uyelik: null != (t = e.membershipTier) ? t : 'free',
                          durum: e.status,
                        };
                      }),
                    ),
                  children: '⬇ Excel',
                }),
              ],
            }),
            (0, t.jsx)('div', {
              className: 'card',
              children:
                0 === d.length
                  ? (0, t.jsx)('div', { className: 'empty', children: 'Kullanıcı yok' })
                  : d.map((e) => {
                      var a, l;
                      return (0, t.jsxs)(
                        'div',
                        {
                          className: 'list-row',
                          children: [
                            (0, t.jsxs)('div', {
                              className: 'grow',
                              children: [
                                (0, t.jsxs)('div', {
                                  className: 'name',
                                  children: [
                                    e.name || '—',
                                    'platinum' === e.membershipTier
                                      ? ' \xb7 \uD83D\uDC8E'
                                      : 'premium' === e.membershipTier || e.isPremium
                                        ? ' \xb7 ⭐'
                                        : '',
                                    'active' !== e.status ? ' \xb7 ⛔' : '',
                                  ],
                                }),
                                (0, t.jsxs)('div', {
                                  className: 'meta',
                                  children: [
                                    null != (a = e.email) ? a : '—',
                                    ' \xb7 ',
                                    null != (l = e.city) ? l : '—',
                                    e.phoneVerified ? ' \xb7 ✓ telefon' : '',
                                    'female' === e.gender ? ' \xb7 Kadın' : '',
                                  ],
                                }),
                              ],
                            }),
                            (0, t.jsx)('select', {
                              className: 'input',
                              style: { height: 32, maxWidth: 130 },
                              value: e.role,
                              onChange: async (a) => {
                                (await o.setUserRole(e.id, a.target.value), s());
                              },
                              children: ['user', 'salon', 'professional', 'moderator', 'admin'].map(
                                (e) => (0, t.jsx)('option', { value: e, children: X[e] }, e),
                              ),
                            }),
                            (0, t.jsx)(ee, { user: e, onSaved: s }),
                            (0, t.jsx)('button', {
                              className: 'btn-sm',
                              onClick: async () => {
                                let a = prompt(
                                  ''.concat(
                                    e.name || '\xdcye',
                                    ' i\xe7in yeni parola (en az 6 karakter):',
                                  ),
                                );
                                if (null !== a) {
                                  if (a.trim().length < 6)
                                    return void alert('Parola en az 6 karakter olmalı.');
                                  (await o.setUserPassword(e.id, a.trim()),
                                    alert('Parola g\xfcncellendi ✓'));
                                }
                              },
                              children: 'Şifre',
                            }),
                            'active' === e.status &&
                              'admin' !== e.role &&
                              (0, t.jsx)('button', {
                                className: 'btn-sm',
                                onClick: async () => {
                                  let a = prompt(
                                    'Kısıtlama gerek\xe7esi (7 g\xfcn saya\xe7lı kısıtlı mod):',
                                  );
                                  a && a.trim() && (await o.restrictUser(e.id, a.trim()), s());
                                },
                                children: 'Kısıtla',
                              }),
                            'active' === e.status
                              ? (0, t.jsx)('button', {
                                  className: 'btn-sm btn-danger',
                                  onClick: async () => {
                                    if ('admin' === e.role) return alert('Admin askıya alınamaz.');
                                    confirm(
                                      ''.concat(e.name || 'Kullanıcı', ' askıya alınsın mı?'),
                                    ) && (await o.setUserStatus(e.id, 'suspended'), s());
                                  },
                                  children: 'Askıya al',
                                })
                              : (0, t.jsx)('button', {
                                  className: 'btn-sm btn-ok',
                                  onClick: async () => {
                                    (await o.setUserStatus(e.id, 'active'), s());
                                  },
                                  children: 'Aktifleştir',
                                }),
                          ],
                        },
                        e.id,
                      );
                    }),
            }),
          ],
        });
      }
      let es = {
        confirmed: 'Onaylı',
        pending: 'Bekliyor',
        completed: 'Tamamlandı',
        cancelled: 'İptal',
        no_show: 'Gelmedi',
        awaiting_provider: 'Salon onayı bekliyor',
        alternative_proposed: 'Alternatif \xf6nerildi',
        waitlist: 'Bekleme listesi',
      };
      function et() {
        var e;
        let [a, s] = (0, l.useState)('all'),
          [i, n] = (0, l.useState)(''),
          { data: r, reload: c } = g(() => o.bookings(a), [a]),
          d = async (e, a) => {
            if (confirm(a))
              try {
                (await e(), c());
              } catch (e) {
                alert('İşlem başarısız (durum ge\xe7işi ge\xe7ersiz olabilir)');
              }
          },
          u = (null != r ? r : []).filter((e) => {
            var a;
            return ''
              .concat(e.proName, ' ')
              .concat(e.service, ' ')
              .concat(null != (a = e.customerName) ? a : '')
              .toLowerCase()
              .includes(i.trim().toLowerCase());
          });
        return (0, t.jsxs)(t.Fragment, {
          children: [
            (0, t.jsx)('h1', { className: 'page-title', children: 'Randevular' }),
            (0, t.jsxs)('p', {
              className: 'page-sub',
              children: [
                'Platform geneli t\xfcm randevular (',
                null != (e = null == r ? void 0 : r.length) ? e : 0,
                ')',
              ],
            }),
            (0, t.jsxs)('div', {
              className: 'toolbar',
              children: [
                ['all', 'confirmed', 'completed', 'cancelled', 'no_show', 'waitlist'].map((e) =>
                  (0, t.jsx)(
                    'button',
                    {
                      className: 'chip '.concat(a === e ? 'on' : ''),
                      onClick: () => s(e),
                      children: 'all' === e ? 'Hepsi' : es[e],
                    },
                    e,
                  ),
                ),
                (0, t.jsx)('input', {
                  className: 'input',
                  style: { maxWidth: 260, marginLeft: 'auto' },
                  placeholder: 'Ara: uzman / hizmet / m\xfcşteri',
                  value: i,
                  onChange: (e) => n(e.target.value),
                }),
              ],
            }),
            (0, t.jsx)('div', {
              className: 'card',
              children: r
                ? 0 === u.length
                  ? (0, t.jsx)('div', { className: 'empty', children: 'Randevu yok' })
                  : u.map((e) => {
                      var a;
                      let s;
                      return (0, t.jsxs)(
                        'div',
                        {
                          className: 'list-row',
                          children: [
                            (0, t.jsxs)('div', {
                              className: 'grow',
                              children: [
                                (0, t.jsxs)('div', {
                                  className: 'name',
                                  children: [e.proName, ' \xb7 ', e.service],
                                }),
                                (0, t.jsxs)('div', {
                                  className: 'meta',
                                  children: [
                                    e.dateLabel,
                                    e.customerName ? ' \xb7 '.concat(e.customerName) : '',
                                    ' \xb7',
                                    ' ',
                                    e.online ? 'Online (app)' : 'Offline (salon)',
                                  ],
                                }),
                              ],
                            }),
                            (0, t.jsx)('div', {
                              className: 'kv-v',
                              children: e.price > 0 ? m(e.price) : '—',
                            }),
                            (0, t.jsx)('span', {
                              className: 'pill '.concat(
                                'completed' === (s = e.status) || 'confirmed' === s
                                  ? 'approved'
                                  : 'cancelled' === s || 'no_show' === s
                                    ? 'rejected'
                                    : 'pending',
                              ),
                              children: null != (a = es[e.status]) ? a : e.status,
                            }),
                            ['cancelled', 'completed', 'no_show', 'refunded'].includes(e.status)
                              ? null
                              : (0, t.jsxs)(t.Fragment, {
                                  children: [
                                    (0, t.jsx)('button', {
                                      className: 'btn small',
                                      onClick: () =>
                                        d(
                                          () => o.completeBooking(e.id),
                                          'Tamamlandı işaretle? ('.concat(e.service, ')'),
                                        ),
                                      children: 'Tamamlandı',
                                    }),
                                    (0, t.jsx)('button', {
                                      className: 'btn small danger',
                                      onClick: () =>
                                        d(
                                          () => o.cancelBooking(e.id),
                                          'Randevu iptal edilsin mi? ('.concat(e.service, ')'),
                                        ),
                                      children: 'İptal',
                                    }),
                                  ],
                                }),
                          ],
                        },
                        e.id,
                      );
                    })
                : (0, t.jsx)('div', { className: 'empty', children: 'Y\xfckleniyor…' }),
            }),
          ],
        });
      }
      function el() {
        let { data: e, reload: a } = g(() => o.disputes(), []),
          s = (null != e ? e : []).filter((e) => 'open' === e.status),
          l = (null != e ? e : []).filter((e) => 'open' !== e.status),
          i = (e) => ('refund' === e ? 'İade dekontu' : 'Depozito itirazı'),
          n = async (e, s) => {
            let t = prompt(
              ''.concat(i(e.kind), ' — ').concat('approve' === s ? 'onay' : 'ret', ' notu (ops.):'),
            );
            null !== t && (await o.resolveDispute(e.id, s, t || void 0), a());
          },
          r = (e) => {
            let a, s;
            return (0, t.jsxs)(
              'div',
              {
                className: 'list-col',
                children: [
                  (0, t.jsxs)('div', {
                    className: 'name',
                    children: [i(e.kind), ' \xb7 ', e.proName, ' \xb7 ', m(e.amount)],
                  }),
                  (0, t.jsxs)('div', {
                    className: 'meta',
                    style: { marginTop: 4 },
                    children: [
                      'Randevu #',
                      e.bookingRef,
                      ' ',
                      e.service ? '\xb7 '.concat(e.service) : '',
                      ' \xb7',
                      ' ',
                      new Date(e.createdAt).toLocaleString('tr-TR'),
                      e.note ? ' \xb7 "'.concat(e.note, '"') : '',
                    ],
                  }),
                  e.resolution
                    ? (0, t.jsxs)('div', {
                        className: 'meta',
                        style: { marginTop: 2 },
                        children: ['Karar notu: ', e.resolution],
                      })
                    : null,
                  (0, t.jsxs)('div', {
                    className: 'form-inline',
                    style: { marginTop: 10 },
                    children: [
                      e.receiptUri
                        ? (0, t.jsx)('a', {
                            className: 'btn-sm',
                            href: e.receiptUri,
                            target: '_blank',
                            rel: 'noreferrer',
                            style: { textDecoration: 'none' },
                            children: '\uD83E\uDDFE Dekontu incele',
                          })
                        : (0, t.jsx)('span', { className: 'meta', children: 'Dekont yok' }),
                      'open' === e.status
                        ? (0, t.jsxs)(t.Fragment, {
                            children: [
                              (0, t.jsx)('button', {
                                className: 'btn-sm btn-ok',
                                onClick: () => n(e, 'approve'),
                                children: 'Onayla',
                              }),
                              (0, t.jsx)('button', {
                                className: 'btn-sm btn-danger',
                                onClick: () => n(e, 'reject'),
                                children: 'Reddet',
                              }),
                            ],
                          })
                        : (0, t.jsx)('span', {
                            className: 'pill '.concat(
                              'approved' === (a = e.status)
                                ? 'approved'
                                : 'rejected' === a
                                  ? 'rejected'
                                  : 'pending',
                            ),
                            children:
                              'approved' === (s = e.status)
                                ? 'Onaylandı'
                                : 'rejected' === s
                                  ? 'Reddedildi'
                                  : 'A\xe7ık',
                          }),
                    ],
                  }),
                ],
              },
              e.id,
            );
          };
        return (0, t.jsxs)(t.Fragment, {
          children: [
            (0, t.jsx)('h1', { className: 'page-title', children: 'Anlaşmazlık Kuyruğu' }),
            (0, t.jsx)('p', {
              className: 'page-sub',
              children:
                'Depozito itirazları ve iade dekontları — dekont g\xf6rselleri burada incelenir. Sabit ilke: d\xfcr\xfcst eleştiri/haklı iade reddedilmez.',
            }),
            (0, t.jsxs)('div', {
              className: 'section-title',
              children: ['Bekleyen (', s.length, ')'],
            }),
            (0, t.jsx)('div', {
              className: 'card',
              style: { marginBottom: 20 },
              children:
                0 === s.length
                  ? (0, t.jsx)('div', { className: 'empty', children: 'Bekleyen anlaşmazlık yok' })
                  : s.map(r),
            }),
            l.length > 0 &&
              (0, t.jsxs)(t.Fragment, {
                children: [
                  (0, t.jsxs)('div', {
                    className: 'section-title',
                    children: ['\xc7\xf6z\xfclenler (', l.length, ')'],
                  }),
                  (0, t.jsx)('div', {
                    className: 'card',
                    style: { opacity: 0.8 },
                    children: l.map(r),
                  }),
                ],
              }),
          ],
        });
      }
      function ei() {
        let { data: e, reload: a } = g(() => o.reviewDisputes(), []),
          s = null != e ? e : [],
          l = async (e, s) => {
            confirm(
              'remove' === s
                ? 'Bu yorumu GİZLE? Yalnızca kural ihlali (hakaret, kişisel bilgi, alakasız i\xe7erik, sahte yorum) varsa yapılır. D\xfcr\xfcst negatif yorum silinmez.'
                : 'İtirazı kapat ve yorumu OLDUĞU GİBİ tut?',
            ) && (await o.resolveReviewDispute(e.id, s), a());
          };
        return (0, t.jsxs)(t.Fragment, {
          children: [
            (0, t.jsx)('h1', { className: 'page-title', children: 'Yorum İtiraz Kuyruğu' }),
            (0, t.jsx)('p', {
              className: 'page-sub',
              children:
                'Uzman/işletmenin itiraz ettiği yorumlar. Sabit ilke: yorum inceleme boyunca g\xf6r\xfcn\xfcr kalır; yalnızca kural ihlalinde gizlenir — “hizmeti beğenmedim” t\xfcr\xfc d\xfcr\xfcst negatif yorum SİLİNMEZ.',
            }),
            (0, t.jsxs)('div', {
              className: 'section-title',
              children: ['Bekleyen (', s.length, ')'],
            }),
            (0, t.jsx)('div', {
              className: 'card',
              children:
                0 === s.length
                  ? (0, t.jsx)('div', { className: 'empty', children: 'Bekleyen itiraz yok' })
                  : s.map((e) => {
                      let a;
                      return (0, t.jsxs)(
                        'div',
                        {
                          className: 'list-col',
                          children: [
                            (0, t.jsxs)('div', {
                              className: 'name',
                              children: [
                                ((a = e.score), '★'.repeat(a) + '☆'.repeat(5 - a)),
                                ' \xb7 ',
                                e.authorLabel,
                                e.visible ? '' : ' \xb7 (gizli)',
                              ],
                            }),
                            (0, t.jsxs)('div', {
                              className: 'meta',
                              style: { marginTop: 4 },
                              children: ['“', e.comment || '—', '”'],
                            }),
                            e.reply
                              ? (0, t.jsxs)('div', {
                                  className: 'meta',
                                  style: { marginTop: 2 },
                                  children: ['Uzman yanıtı: ', e.reply],
                                })
                              : null,
                            (0, t.jsxs)('div', {
                              className: 'meta',
                              style: { marginTop: 2 },
                              children: [
                                'İtiraz gerek\xe7esi: ',
                                e.disputeReason || '—',
                                e.disputedAt
                                  ? ' \xb7 '.concat(new Date(e.disputedAt).toLocaleString('tr-TR'))
                                  : '',
                              ],
                            }),
                            (0, t.jsxs)('div', {
                              className: 'form-inline',
                              style: { marginTop: 10 },
                              children: [
                                (0, t.jsx)('button', {
                                  className: 'btn-sm',
                                  onClick: () => l(e, 'keep'),
                                  children: 'Yorumu tut',
                                }),
                                (0, t.jsx)('button', {
                                  className: 'btn-sm btn-danger',
                                  onClick: () => l(e, 'remove'),
                                  children: 'Kural ihlali — gizle',
                                }),
                              ],
                            }),
                          ],
                        },
                        e.id,
                      );
                    }),
            }),
          ],
        });
      }
      function en() {
        var e;
        let { data: a } = g(() => o.quoteRequests(), []);
        return (0, t.jsxs)(t.Fragment, {
          children: [
            (0, t.jsx)('h1', { className: 'page-title', children: 'Canlı Talepler' }),
            (0, t.jsxs)('p', {
              className: 'page-sub',
              children: [
                '\xa712.4 — talep akışı: kim a\xe7tı, şehir, b\xfct\xe7e, gelen teklifler, randevuya d\xf6n\xfcş\xfcm (',
                null != (e = null == a ? void 0 : a.length) ? e : 0,
                ')',
              ],
            }),
            (0, t.jsx)('div', {
              className: 'card',
              children: a
                ? 0 === a.length
                  ? (0, t.jsx)('div', { className: 'empty', children: 'Teklif talebi yok' })
                  : a.map((e) =>
                      (0, t.jsxs)(
                        'div',
                        {
                          className: 'list-row',
                          children: [
                            (0, t.jsxs)('div', {
                              className: 'grow',
                              children: [
                                (0, t.jsxs)('div', {
                                  className: 'name',
                                  children: [
                                    e.category,
                                    e.hasPhoto ? ' \xb7 \uD83D\uDCF7' : '',
                                    'describe' === e.mode ? ' \xb7 ✍️' : '',
                                  ],
                                }),
                                (0, t.jsxs)('div', {
                                  className: 'meta',
                                  children: [
                                    e.userName,
                                    ' \xb7 ',
                                    e.city || '—',
                                    null != e.budget
                                      ? ' \xb7 b\xfct\xe7e '.concat(m(e.budget))
                                      : '',
                                    ' \xb7',
                                    ' ',
                                    e.note ? e.note.slice(0, 60) : 'Not yok',
                                  ],
                                }),
                              ],
                            }),
                            (0, t.jsxs)('span', {
                              className: 'pill',
                              style: { background: 'var(--line)', color: 'var(--muted)' },
                              children: [e.quoteCount, ' teklif'],
                            }),
                            null != e.bestPrice
                              ? (0, t.jsxs)('div', {
                                  className: 'kv-v',
                                  children: ['min ', m(e.bestPrice)],
                                })
                              : null,
                            (0, t.jsx)('span', {
                              className: 'pill '.concat(
                                'open' === e.status ? 'pending' : 'approved',
                              ),
                              children: e.bookingId
                                ? '✓ Randevu'
                                : 'open' === e.status
                                  ? 'A\xe7ık'
                                  : 'Kapalı',
                            }),
                          ],
                        },
                        e.id,
                      ),
                    )
                : (0, t.jsx)('div', { className: 'empty', children: 'Y\xfckleniyor…' }),
            }),
          ],
        });
      }
      function er() {
        let { data: e } = g(() => o.loyalty(), []);
        return (0, t.jsxs)(t.Fragment, {
          children: [
            (0, t.jsx)('h1', { className: 'page-title', children: 'Sadakat' }),
            (0, t.jsx)('p', {
              className: 'page-sub',
              children:
                'Puan defteri (append-only) — bakiye dolaşımdaki puan = platform y\xfck\xfcml\xfcl\xfcğ\xfc',
            }),
            e
              ? (0, t.jsxs)(t.Fragment, {
                  children: [
                    (0, t.jsxs)('div', {
                      className: 'stat-grid',
                      children: [
                        (0, t.jsx)(C, {
                          v: e.totals.earned.toLocaleString('tr-TR'),
                          l: 'Kazanılan puan',
                        }),
                        (0, t.jsx)(C, {
                          v: e.totals.spent.toLocaleString('tr-TR'),
                          l: 'Harcanan puan',
                        }),
                        (0, t.jsx)(C, {
                          v: e.totals.balance.toLocaleString('tr-TR'),
                          l: 'Dolaşımdaki (y\xfck\xfcml\xfcl\xfck)',
                        }),
                      ],
                    }),
                    (0, t.jsx)('div', { className: 'section-title', children: 'Son hareketler' }),
                    (0, t.jsx)('div', {
                      className: 'card',
                      children:
                        0 === e.entries.length
                          ? (0, t.jsx)('div', { className: 'empty', children: 'Hareket yok' })
                          : e.entries.map((e) =>
                              (0, t.jsxs)(
                                'div',
                                {
                                  className: 'list-row',
                                  children: [
                                    (0, t.jsxs)('div', {
                                      className: 'grow',
                                      children: [
                                        (0, t.jsx)('div', {
                                          className: 'name',
                                          children: e.userName,
                                        }),
                                        (0, t.jsxs)('div', {
                                          className: 'meta',
                                          children: [
                                            e.reason,
                                            e.detail ? ' \xb7 '.concat(e.detail) : '',
                                          ],
                                        }),
                                      ],
                                    }),
                                    (0, t.jsxs)('span', {
                                      className: 'pill '.concat(
                                        e.points >= 0 ? 'approved' : 'rejected',
                                      ),
                                      children: [
                                        e.points >= 0 ? '+'.concat(e.points) : e.points,
                                        ' puan',
                                      ],
                                    }),
                                  ],
                                },
                                e.id,
                              ),
                            ),
                    }),
                  ],
                })
              : (0, t.jsx)('div', { className: 'empty', children: 'Y\xfckleniyor…' }),
          ],
        });
      }
      function ec() {
        let { data: e, reload: a } = g(() => o.featureFlags(), []),
          [s, i] = (0, l.useState)({ key: '', description: '' }),
          n = async () => {
            s.key &&
              (await o.setFeatureFlag(s.key, !1, s.description || void 0),
              i({ key: '', description: '' }),
              a());
          };
        return (0, t.jsxs)(t.Fragment, {
          children: [
            (0, t.jsx)('h1', { className: 'page-title', children: 'Feature Flag' }),
            (0, t.jsx)('p', {
              className: 'page-sub',
              children: '\xd6zellik a\xe7ma/kapama (kademeli yayın)',
            }),
            (0, t.jsx)('div', {
              className: 'card',
              style: { marginBottom: 20 },
              children: (0, t.jsxs)('div', {
                className: 'form-inline',
                children: [
                  (0, t.jsx)('input', {
                    className: 'input',
                    placeholder: 'Anahtar (\xf6rn. new_booking_flow)',
                    value: s.key,
                    onChange: (e) => i({ ...s, key: e.target.value }),
                  }),
                  (0, t.jsx)('input', {
                    className: 'input',
                    placeholder: 'A\xe7ıklama',
                    value: s.description,
                    onChange: (e) => i({ ...s, description: e.target.value }),
                  }),
                  (0, t.jsx)('button', {
                    className: 'btn-sm btn-ok full',
                    onClick: n,
                    children: '+ Flag ekle (kapalı)',
                  }),
                ],
              }),
            }),
            (0, t.jsx)('div', {
              className: 'card',
              children: e
                ? 0 === e.length
                  ? (0, t.jsx)('div', { className: 'empty', children: 'Flag yok' })
                  : e.map((e) =>
                      (0, t.jsxs)(
                        'div',
                        {
                          className: 'list-row',
                          children: [
                            (0, t.jsxs)('div', {
                              className: 'grow',
                              children: [
                                (0, t.jsx)('div', { className: 'name', children: e.key }),
                                (0, t.jsx)('div', {
                                  className: 'meta',
                                  children: e.description || 'A\xe7ıklama yok',
                                }),
                              ],
                            }),
                            (0, t.jsx)('button', {
                              className: 'switch '.concat(e.enabled ? 'on' : 'off'),
                              onClick: async () => {
                                (await o.setFeatureFlag(e.key, !e.enabled), a());
                              },
                              children: e.enabled ? 'A\xe7ık' : 'Kapalı',
                            }),
                          ],
                        },
                        e.key,
                      ),
                    )
                : (0, t.jsx)('div', { className: 'empty', children: 'Y\xfckleniyor…' }),
            }),
          ],
        });
      }
      function ed() {
        let { data: e, reload: a } = g(() => o.systemSettings(), []),
          [s, i] = (0, l.useState)({}),
          [n, r] = (0, l.useState)({}),
          [c, d] = (0, l.useState)({}),
          [m, u] = (0, l.useState)(''),
          [p, h] = (0, l.useState)(''),
          v = async (e) => {
            let t = s[e];
            if (void 0 === t || '' === t) return;
            let l = Number(t);
            Number.isFinite(l) &&
              !(l < 0) &&
              (await o.setRate(e, Math.round(l)), i((a) => ({ ...a, [e]: '' })), a());
          },
          y = async (e) => {
            var s;
            let t = null != (s = n[e]) ? s : '';
            (await o.setApiKey(e, t), r((a) => ({ ...a, [e]: '' })), a());
          },
          x = async (e) => {
            let a = await o.testApiKey(e);
            d((s) => ({ ...s, [e]: a }));
          },
          j = async () => {
            let e = m
                .split(',')
                .map((e) => e.trim())
                .filter(Boolean),
              s = p
                .split(',')
                .map((e) => e.trim())
                .filter(Boolean);
            0 !== e.length && (await o.setCities(e, s), u(''), h(''), a());
          };
        return (0, t.jsxs)(t.Fragment, {
          children: [
            (0, t.jsx)('h1', { className: 'page-title', children: 'Sistem Ayarları' }),
            (0, t.jsx)('p', {
              className: 'page-sub',
              children: 'Parametrik oranlar \xb7 dış servis anahtarları \xb7 şehir y\xf6netimi',
            }),
            (0, t.jsx)('h2', {
              className: 'section-head',
              children: 'Ceza / depozito tutarları ve oranlar',
            }),
            (0, t.jsx)('p', {
              className: 'page-sub',
              children: "Değişiklikler app'e `/config` \xfczerinden yansır.",
            }),
            (0, t.jsx)('div', {
              className: 'card',
              style: { marginBottom: 28 },
              children: e
                ? e.rates.map((e) => {
                    var a;
                    return (0, t.jsxs)(
                      'div',
                      {
                        className: 'list-row',
                        children: [
                          (0, t.jsxs)('div', {
                            className: 'grow',
                            children: [
                              (0, t.jsx)('div', { className: 'name', children: e.label }),
                              (0, t.jsxs)('div', {
                                className: 'meta',
                                children: [e.key, ' \xb7 g\xfcncel: ', e.value, ' ', e.suffix],
                              }),
                            ],
                          }),
                          (0, t.jsx)('input', {
                            className: 'input',
                            style: { width: 120 },
                            type: 'number',
                            placeholder: String(e.value),
                            value: null != (a = s[e.key]) ? a : '',
                            onChange: (a) => i((s) => ({ ...s, [e.key]: a.target.value })),
                          }),
                          (0, t.jsx)('button', {
                            className: 'btn-sm btn-ok',
                            onClick: () => v(e.key),
                            children: 'Kaydet',
                          }),
                        ],
                      },
                      e.key,
                    );
                  })
                : (0, t.jsx)('div', { className: 'empty', children: 'Y\xfckleniyor…' }),
            }),
            (0, t.jsx)('h2', { className: 'section-head', children: 'API anahtarları' }),
            (0, t.jsx)('p', {
              className: 'page-sub',
              children:
                'Maskeli g\xf6r\xfcn\xfcm — değer asla panele/app\'e d\xf6nmez. "Test Et" bi\xe7im/varlık kontrol\xfc yapar.',
            }),
            (0, t.jsx)('div', {
              className: 'card',
              style: { marginBottom: 28 },
              children: e
                ? e.apiKeys.map((e) => {
                    var a;
                    return (0, t.jsxs)(
                      'div',
                      {
                        className: 'list-col',
                        children: [
                          (0, t.jsx)('div', { className: 'name', children: e.label }),
                          (0, t.jsxs)('div', {
                            className: 'meta',
                            children: [
                              e.configured ? 'Tanımlı: '.concat(e.masked) : 'Tanımsız',
                              c[e.provider] &&
                                (0, t.jsxs)('span', {
                                  style: {
                                    color: c[e.provider].ok ? 'var(--success)' : 'var(--danger)',
                                  },
                                  children: [
                                    ' ',
                                    '\xb7 ',
                                    c[e.provider].ok ? '✓' : '✗',
                                    ' ',
                                    c[e.provider].message,
                                  ],
                                }),
                            ],
                          }),
                          (0, t.jsxs)('div', {
                            className: 'form-inline',
                            style: { marginTop: 10 },
                            children: [
                              (0, t.jsx)('input', {
                                className: 'input',
                                placeholder: 'Yeni anahtar (boş = temizle)',
                                value: null != (a = n[e.provider]) ? a : '',
                                onChange: (a) => r((s) => ({ ...s, [e.provider]: a.target.value })),
                              }),
                              (0, t.jsx)('button', {
                                className: 'btn-sm btn-ok',
                                onClick: () => y(e.provider),
                                children: 'Kaydet',
                              }),
                              (0, t.jsx)('button', {
                                className: 'btn-sm',
                                onClick: () => x(e.provider),
                                children: 'Test Et',
                              }),
                            ],
                          }),
                        ],
                      },
                      e.provider,
                    );
                  })
                : (0, t.jsx)('div', { className: 'empty', children: 'Y\xfckleniyor…' }),
            }),
            (0, t.jsx)('h2', { className: 'section-head', children: 'Şehir y\xf6netimi' }),
            (0, t.jsx)('p', {
              className: 'page-sub',
              children: 'Aktif şehirler + "yakında" listesi (virg\xfclle ayır).',
            }),
            (0, t.jsx)('div', {
              className: 'card',
              children: e
                ? (0, t.jsxs)(t.Fragment, {
                    children: [
                      (0, t.jsxs)('div', {
                        className: 'list-col',
                        children: [
                          (0, t.jsx)('div', { className: 'name', children: 'Aktif şehirler' }),
                          (0, t.jsx)('div', {
                            className: 'meta',
                            children: e.cities.active.join(', ') || '—',
                          }),
                        ],
                      }),
                      (0, t.jsxs)('div', {
                        className: 'list-col',
                        children: [
                          (0, t.jsx)('div', { className: 'name', children: 'Yakında' }),
                          (0, t.jsx)('div', {
                            className: 'meta',
                            children: e.cities.soon.join(', ') || '—',
                          }),
                        ],
                      }),
                      (0, t.jsxs)('div', {
                        className: 'form-inline',
                        children: [
                          (0, t.jsx)('input', {
                            className: 'input',
                            placeholder: 'Aktif (\xf6rn. '.concat(e.cities.active.join(', '), ')'),
                            value: m,
                            onChange: (e) => u(e.target.value),
                          }),
                          (0, t.jsx)('input', {
                            className: 'input',
                            placeholder: 'Yakında (\xf6rn. '.concat(e.cities.soon.join(', '), ')'),
                            value: p,
                            onChange: (e) => h(e.target.value),
                          }),
                          (0, t.jsx)('button', {
                            className: 'btn-sm btn-ok full',
                            onClick: j,
                            children: 'Şehirleri g\xfcncelle',
                          }),
                        ],
                      }),
                    ],
                  })
                : (0, t.jsx)('div', { className: 'empty', children: 'Y\xfckleniyor…' }),
            }),
            (0, t.jsx)(eo, {}),
          ],
        });
      }
      function eo() {
        let { data: e, reload: a } = g(() => o.categoryConfig(), []),
          [s, i] = (0, l.useState)({}),
          n = async () => {
            e && (await o.setCategoryConfig({ ...e, ...s }), i({}), a());
          },
          r = (a, s, t) => {
            var l;
            let n =
              null != (l = null == e ? void 0 : e[a]) ? l : { maintenanceDays: 0, serviceMin: 0 };
            i((e) => ({ ...e, [a]: { ...n, ...e[a], [s]: Number(t) } }));
          },
          c = (a, t) => {
            var l, i, n, r;
            return null !=
              (r =
                null != (n = null == (l = s[a]) ? void 0 : l[t])
                  ? n
                  : null == e || null == (i = e[a])
                    ? void 0
                    : i[t])
              ? r
              : 0;
          };
        return (0, t.jsxs)(t.Fragment, {
          children: [
            (0, t.jsx)('h2', {
              className: 'section-head',
              children: 'Kategori ayarları — bakım periyodu & hizmet s\xfcresi',
            }),
            (0, t.jsx)('p', {
              className: 'page-sub',
              children: 'Bakım Takvimi periyodu (g\xfcn) + slot motoru varsayılan s\xfcresi (dk).',
            }),
            (0, t.jsx)('div', {
              className: 'card',
              children: e
                ? (0, t.jsxs)(t.Fragment, {
                    children: [
                      Object.keys(e).map((e) =>
                        (0, t.jsxs)(
                          'div',
                          {
                            className: 'list-row',
                            children: [
                              (0, t.jsx)('div', {
                                className: 'grow',
                                children: (0, t.jsx)('div', { className: 'name', children: e }),
                              }),
                              (0, t.jsxs)('label', {
                                className: 'meta',
                                children: [
                                  'Bakım (g\xfcn)',
                                  (0, t.jsx)('input', {
                                    className: 'input',
                                    style: { width: 80 },
                                    type: 'number',
                                    value: c(e, 'maintenanceDays'),
                                    onChange: (a) => r(e, 'maintenanceDays', a.target.value),
                                  }),
                                ],
                              }),
                              (0, t.jsxs)('label', {
                                className: 'meta',
                                children: [
                                  'S\xfcre (dk)',
                                  (0, t.jsx)('input', {
                                    className: 'input',
                                    style: { width: 80 },
                                    type: 'number',
                                    value: c(e, 'serviceMin'),
                                    onChange: (a) => r(e, 'serviceMin', a.target.value),
                                  }),
                                ],
                              }),
                            ],
                          },
                          e,
                        ),
                      ),
                      (0, t.jsx)('div', {
                        style: { padding: 16 },
                        children: (0, t.jsx)('button', {
                          className: 'btn-sm btn-ok',
                          onClick: n,
                          disabled: 0 === Object.keys(s).length,
                          children: 'Kategori ayarlarını kaydet',
                        }),
                      }),
                    ],
                  })
                : (0, t.jsx)('div', { className: 'empty', children: 'Y\xfckleniyor…' }),
            }),
          ],
        });
      }
      function em() {
        let { data: e } = g(() => o.auditLogs(), []);
        return (0, t.jsxs)(t.Fragment, {
          children: [
            (0, t.jsx)('h1', { className: 'page-title', children: 'Denetim Kaydı' }),
            (0, t.jsx)('p', {
              className: 'page-sub',
              children: 'Kritik eylemlerin izi (PII yok — yalnızca rol/kaynak/hash)',
            }),
            (0, t.jsx)('div', {
              className: 'card',
              children: e
                ? 0 === e.length
                  ? (0, t.jsx)('div', { className: 'empty', children: 'Kayıt yok' })
                  : e.map((e) =>
                      (0, t.jsx)(
                        'div',
                        {
                          className: 'list-row',
                          children: (0, t.jsxs)('div', {
                            className: 'grow',
                            children: [
                              (0, t.jsxs)('div', {
                                className: 'name',
                                children: [e.action, ' \xb7 ', e.resourceType],
                              }),
                              (0, t.jsxs)('div', {
                                className: 'meta',
                                children: [
                                  e.resourceId
                                    ? '#'.concat(e.resourceId.slice(0, 8), ' \xb7 ')
                                    : '',
                                  e.actorRole || 'sistem',
                                  ' \xb7 ',
                                  new Date(e.createdAt).toLocaleString('tr-TR'),
                                ],
                              }),
                            ],
                          }),
                        },
                        e.id,
                      ),
                    )
                : (0, t.jsx)('div', { className: 'empty', children: 'Y\xfckleniyor…' }),
            }),
          ],
        });
      }
    },
  },
  (e) => {
    (e.O(0, [587, 18, 358], () => e((e.s = 2043))), (_N_E = e.O()));
  },
]);
