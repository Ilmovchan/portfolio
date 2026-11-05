/* ===========================================================
   EN / UA switch — every translatable node carries its Ukrainian
   in data-uk; the English original is kept in data-en.
   =========================================================== */
(() => {
  const KEY = 'lang';
  const TITLE = {
    en: ['Illia Movchan — Video Editor',
         'Video editor. Commercials, music videos, documentary and social cuts — from raw footage to final master.'],
    uk: ['Ілля Мовчан — відеомонтажер',
         'Відеомонтажер. Реклама, музичні відео, документалістика та соцмережі — від сирого матеріалу до фінального мастера.']
  };
  const meta = document.querySelector('meta[name="description"]');

  const apply = (lang) => {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-uk]').forEach(el => {
      if (el.dataset.en === undefined) el.dataset.en = el.innerHTML;
      el.innerHTML = lang === 'uk' ? el.dataset.uk : el.dataset.en;
    });
    document.title = TITLE[lang][0];
    if (meta) meta.content = TITLE[lang][1];
    document.querySelectorAll('[data-lang]').forEach(b =>
      b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
    dispatchEvent(new Event('langchange'));
  };

  let saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) {}
  const start = saved || ((navigator.language || '').toLowerCase().startsWith('uk') ? 'uk' : 'en');
  if (start === 'uk') apply('uk');

  document.querySelectorAll('[data-lang]').forEach(b => b.addEventListener('click', () => {
    apply(b.dataset.lang);
    try { localStorage.setItem(KEY, b.dataset.lang); } catch (e) {}
  }));
})();
