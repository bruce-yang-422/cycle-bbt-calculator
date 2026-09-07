/* Exact phrases, reviewed per language; body copy remains in the main catalogs. */
window.CYCLE_GUIDE_EMPHASIS = Object.fromEntries(Object.entries({
  'zh-TW':['21 天','每 2–3 天','疼痛比平常嚴重、止痛仍無改善','原本規律卻持續改變','每 1–2 小時|超過 7 天','月經延遲，並伴隨異常出血與腹痛|請儘速就醫'],
  en:['21 days','every 2–3 days','pain is worse than usual and pain relief does not help','a previously regular pattern keeps changing','every 1–2 hours|more than 7 days','A missed period with unusual bleeding and abdominal pain|prompt medical assessment'],
  ja:['21日','2〜3 日ごと','いつもより痛みが強く、鎮痛でも改善しない','規則的だった周期が乱れ続ける','1〜2 時間|7 日を超える','月経の遅れに異常出血と腹痛を伴う場合|速やかに受診'],
  ko:['21일','2–3일 간격','평소보다 심하고 진통으로도 나아지지','규칙적이던 주기가 계속 달라지면','1–2시간|7일을 넘거나','월경 지연에 비정상 출혈과 복통이 동반되면|신속히 진료'],
  es:['21 días','cada 2–3 días','el dolor empeora y los analgésicos no ayudan','un patrón antes regular sigue cambiando','cada 1–2 horas|más de 7 días','Un retraso menstrual con sangrado inusual y dolor abdominal|evaluación pronta'],
  de:['21 Tage','alle 2–3 Tage','stärkeren Schmerzen als sonst, die trotz Schmerzmitteln bleiben','anhaltende Änderungen eines zuvor regelmäßigen Musters','alle 1–2 Stunden|über 7 Tage','Eine ausgebliebene Periode mit ungewöhnlicher Blutung und Bauchschmerzen|rasch untersucht'],
  th:['21 วัน','ทุก 2–3 วัน','ปวดมากกว่าปกติและยาแก้ปวดไม่ช่วย','รอบที่เคยปกติเปลี่ยนไปต่อเนื่อง','ทุก 1–2 ชั่วโมง|เกิน 7 วัน','ประจำเดือนขาดร่วมกับเลือดออกผิดปกติและปวดท้อง|รีบพบแพทย์'],
  vi:['21 ngày','mỗi 2–3 ngày','đau hơn thường lệ và thuốc giảm đau không giúp','chu kỳ vốn đều liên tục thay đổi','mỗi 1–2 giờ|hơn 7 ngày','Trễ kinh kèm ra máu bất thường và đau bụng|khám sớm']
}).map(([lang,phrases])=>[lang,Object.fromEntries(['help.test','guide.timing','guide.pain','guide.irregular','guide.heavy','guide.urgent'].map((key,i)=>[key,phrases[i].split('|')]))]));
