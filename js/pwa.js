if('serviceWorker' in navigator){
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

function isStandalone(){
  return window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true;
}

function isIOS(){
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function initInstallCTA(){
  if(isStandalone()){
    document.getElementById('appInstallEntry').classList.add('hidden');
    return;
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    showInstallBanner();
  });

  window.addEventListener('appinstalled', () => {
    appInstalled=true;
    deferredInstallPrompt=null;
    localStorage.setItem('installBannerDismissed','1');
    hideInstallBanner();
    document.getElementById('appInstallEntry').classList.add('hidden');
    closeInstallHelp(false);
  });

  // iOS Safari has no beforeinstallprompt — show manual instructions instead.
  if(isIOS() && navigator.userAgent.match(/safari/i) && !navigator.userAgent.match(/crios|fxios/i)){
    setTimeout(showInstallBanner, 1500);
  }
}

function showInstallBanner(){
  if(appInstalled||isStandalone()||localStorage.getItem('installBannerDismissed')) return;
  updateInstallBanner();
  document.getElementById('installBanner').classList.remove('hidden');
}

function hideInstallBanner(){
  document.getElementById('installBanner').classList.add('hidden');
}

function dismissInstallBanner(){
  localStorage.setItem('installBannerDismissed','1');
  hideInstallBanner();
}

async function handleInstallClick(){
  if(installInProgress||appInstalled||isStandalone()) return;
  if(deferredInstallPrompt){
    const promptEvent=deferredInstallPrompt;
    deferredInstallPrompt = null;
    installInProgress=true;
    try{
      await promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      if(outcome === 'accepted') localStorage.setItem('installBannerDismissed','1');
      hideInstallBanner();
      closeInstallHelp(false);
    } catch {
      showInstallHelp();
    } finally {
      installInProgress=false;
    }
  } else {
    showInstallHelp();
  }
}
function showInstallHelp(){
  hideInstallBanner();
  updateInstallHelp();
  const help=document.getElementById('installHelp');
  help.classList.remove('hidden');
  document.getElementById('appInstallEntry').setAttribute('aria-expanded','true');
  help.scrollIntoView({block:'nearest'});
  help.querySelector('button').focus();
}
function closeInstallHelp(restoreFocus=true){
  document.getElementById('installHelp').classList.add('hidden');
  const entry=document.getElementById('appInstallEntry');
  entry.setAttribute('aria-expanded','false');
  if(restoreFocus)entry.focus();
}


function updateInstallHelp(){document.getElementById('installHelpText').textContent=t(isIOS()?'install.ios':'install.other');}
function updateInstallBanner(){
  document.querySelector('.install-sub').textContent=t(!deferredInstallPrompt&&isIOS()?'install.ios':'install.sub');
  document.getElementById('installBtn').textContent=t('install.button');
}
