document.documentElement.lang=currentLanguage;
document.querySelectorAll('[data-i18n]').forEach(el=>el.textContent=t(el.dataset.i18n));
document.title='404 · '+t('notFound.title');
document.querySelector('meta[name=description]').content=t('notFound.body');
document.getElementById('homeLink').href='/?lang='+currentLanguage;
