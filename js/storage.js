/* Browser-local records. Existing storage keys remain compatible. */
function getHistory(){ try{return deriveHistory(JSON.parse(localStorage.getItem('periodHistory')||'[]'));}catch{return[];} }
function saveHistoryData(a){ localStorage.setItem('periodHistory',JSON.stringify(a.map(({date})=>({date})))); }
function getBBT(){ try{return JSON.parse(localStorage.getItem('bbtData')||'[]');}catch{return[];} }
function saveBBT(a){ localStorage.setItem('bbtData',JSON.stringify(a)); }

function resetAllData(){
  if(!confirm(t('reset.confirm')))return;
  try{
    // Remove this app's records and preferences without touching other apps.
    for(const key of ['periodHistory','bbtData','cycleSettings','audienceMode','language','regionPreference','installBannerDismissed']){
      localStorage.removeItem(key);
    }
  }catch{
    notifyUser(t('reset.failed'));
    return;
  }
  // Reload clears calculated state and reopens first-use setup.
  const url=new URL(location.href);
  url.searchParams.delete('lang');
  location.replace(url.href);
}
