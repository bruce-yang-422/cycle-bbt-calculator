/* Browser-local records. Existing storage keys remain compatible. */
function getHistory(){ try{return deriveHistory(JSON.parse(localStorage.getItem('periodHistory')||'[]'));}catch{return[];} }
function saveHistoryData(a){ localStorage.setItem('periodHistory',JSON.stringify(a.map(({date})=>({date})))); }
function getBBT(){ try{return JSON.parse(localStorage.getItem('bbtData')||'[]');}catch{return[];} }
function saveBBT(a){ localStorage.setItem('bbtData',JSON.stringify(a)); }
