/**
 * SERTİFİKA BASIM MASASI — Google Drive sürümü (sunucu kodu) · kullanıcı adı + şifre ile giriş
 * Prime Campus · © 2026 Burak Kahramanoğlu. Tüm hakları saklıdır.
 *
 * Dağıtım ayarı: Şu kullanıcı olarak yürüt = Ben, Erişimi olanlar = Herkes.
 * Veriye yalnızca giriş yapan kullanıcılar ulaşır; dosyalar sahibin Drive'ında kalır.
 */

var HTML_DOSYA_ADI = 'Sertifika_Basim_Masasi_drive.html';
/* Adler sertifikası: CPD dışı, kendi şablonu ve sayfası vardır (panelde "Adler sertifika"). Ad, paneldeki ADLER.ad ile aynı olmalı. */
var ADLER_AD = 'ADLERIAN APPROACH IN PSYCHOTHERAPY TRAINING';
function adlerMi_(egitim) { return String(egitim || '') === ADLER_AD; }
/* Sayfadaki gömülü bir görseli (const AD = "data:...") boşaltır → gereksiz yerde sayfa küçülür */
function gomuluBosalt_(html, ad) {
  var bas = 'const ' + ad + ' = "', i = html.indexOf(bas); if (i < 0) return html;
  var j = html.indexOf('"', i + bas.length); if (j < 0) return html;
  return html.slice(0, i + bas.length) + html.slice(j);
}
var PARCA = 45000;            // bir hücreye yazılan en fazla karakter
var OTURUM_SURE = 3600;       // saniye: 1 saat işlem yapılmazsa oturum kapanır (her işlemde yenilenir)
var DENEME_SINIRI = 5;        // hatalı giriş sınırı
var KILIT_SURE = 900;         // saniye (15 dakika)

/* ================= web sayfası ================= */
function doGet(e) {
  var prm = (e && e.parameter) || {};
  // WordPress'e geçildiğinde googleArayuzunuKapat() çalıştırılır: çıplak adres yalnızca düz yazı döndürür (panel ?panel ile yedek olarak açılır).
  if (prop_('GOOGLE_ARAYUZ_KAPALI') === '1' && prm.panel === undefined && prm.dogrula === undefined && prm.sorgula === undefined && prm.ibra === undefined) {
    return ContentService.createTextOutput('Prime Campus sertifika sistemi çalışıyor.').setMimeType(ContentService.MimeType.TEXT);
  }
  var html = sayfaHtml_();
  if (!html) {
    return HtmlService.createHtmlOutput('<p style="font-family:sans-serif;padding:24px">Sayfa dosyası (' + HTML_DOSYA_ADI +
      ') bulunamadı. Dosyayı E-Tablo ile aynı Drive klasörüne yükleyip Apps Script\'te "kurulum" fonksiyonunu yeniden çalıştırın.</p>');
  }
  var no = e && e.parameter && e.parameter.dogrula ? String(e.parameter.dogrula).replace(/[^0-9:]/g, '').slice(0, 30) : '';
  var form = !no && e && e.parameter && (e.parameter.sorgula !== undefined || e.parameter.dogrula !== undefined);
  // Eski QR kodları (Google adresi) WordPress doğrulama sayfasına yönlendirilir. WordPress sayfası kendisi ?wp=1 ile açar (döngü olmaz).
  if (no && prm.wp === undefined) {
    var wp = wpAdres_();
    if (wp) return yonlendir_(wp.indexOf('{NO}') >= 0 ? wp.replace(/\{NO\}/g, encodeURIComponent(no)) : wp + (wp.indexOf('?') < 0 ? '?' : '&') + 'no=' + encodeURIComponent(no));
  }
  var ibra = prm.ibra ? String(prm.ibra).replace(/[^0-9a-z]/gi, '').slice(0, 40) : '';
  if (ibra) {
    // Belge bilgisi sayfayla birlikte gönderilir (ikinci bir sunucu isteği beklenmez → daha hızlı açılır)
    var ibOn; try { ibOn = 'window.IBRA_VERI=' + JSON.stringify(ibraGetir(ibra)); } catch (err) { ibOn = 'window.IBRA_HATA=' + JSON.stringify(String((err && err.message) || err)); }
    html = gomuluBosalt_(sablonDegistir_(html, ''), 'ADLER_SABLON'); // ibraname sayfasında sertifika şablonları gerekmez → sayfa küçülür
    return HtmlService.createHtmlOutput(basEkle_(html, 'window.IBRA_ANAHTAR=' + JSON.stringify(ibra) + ';' + ibOn + ';' + sayfaBilgisiOn_()))
      .setTitle('İbraname · Prime Campus').addMetaTag('viewport', 'width=device-width, initial-scale=1').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  if (no || form) {
    // Doğrulama: sertifika bilgisi ve kayıtlı şablon sayfayla birlikte gönderilir (ek sunucu isteği ve şablon indirmesi yok)
    var on = sayfaBilgisiOn_(), g = genelAyar_(), sb = g.sablonId ? sablonDataUrl_(g.sablonId) : '';
    if (sb) { html = sablonDegistir_(html, sb); on += 'window.SABLON_ID=' + JSON.stringify(g.sablonId) + ';'; }
    if (no) {
      on += 'window.DOGRULA_NO=' + JSON.stringify(no) + ';' + (prm.k === 'li' ? 'window.DOGRULA_KAYNAK="li";' : '');
      try { var dv = dogrula(no, prm.k === 'li' ? 'li' : 'qr'); on += 'window.DOGRULA_VERI=' + JSON.stringify(dv) + ';'; if (!(dv && dv.adler)) html = gomuluBosalt_(html, 'ADLER_SABLON'); } catch (err) {}
    } else on += 'window.DOGRULA_FORM=true;';
    html = basEkle_(html, on);
  } else html = basEkle_(html, sayfaBilgisiOn_());
  return HtmlService.createHtmlOutput(html)
    .setTitle(no || form ? 'Sertifika Doğrulama · Prime Campus' : 'Sertifika Basım Masası')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/* QR ayarındaki adres WordPress (Google dışı) bir adresse onu döndürür */
function wpAdres_() { try { return genelAyar_().wp || ''; } catch (err) { return ''; } }
function yonlendir_(url) {
  var h = '<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:-apple-system,Segoe UI,Arial,sans-serif;text-align:center;padding:56px 16px;color:#111827;background:#f3f4f6}' +
    'a{display:inline-block;margin-top:18px;padding:13px 24px;background:#2563eb;color:#fff;border-radius:10px;text-decoration:none;font-weight:600}</style></head><body>' +
    '<p>Sertifika doğrulama sayfasına yönlendiriliyorsunuz…<br><small>Redirecting to the certificate verification page…</small></p>' +
    '<a href="' + htmlKac_(url) + '" target="_top">Sertifikayı görüntüle / View certificate</a>' +
    '<script>try{window.top.location.replace(' + JSON.stringify(url).replace(/</g, '\\u003c') + ');}catch(e){}</script></body></html>';
  return HtmlService.createHtmlOutput(h).setTitle('Sertifika Doğrulama · Prime Campus').addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/* WordPress kurulumundan SONRA bir kez çalıştırın (Google sayfası gizlenir). Geri almak için googleArayuzunuAc. */
function googleArayuzunuKapat() { PropertiesService.getScriptProperties().setProperty('GOOGLE_ARAYUZ_KAPALI', '1'); uyari_('Google arayüzü kapatıldı. Panel artık WordPress sayfanızdan açılır.'); }
function googleArayuzunuAc() { PropertiesService.getScriptProperties().deleteProperty('GOOGLE_ARAYUZ_KAPALI'); uyari_('Google arayüzü yeniden açıldı.'); }

/* ================= API (WordPress sayfaları buradan bağlanır; Google arayüzü kullanılmaz) ================= */
/* İzin verilen işlemler. Herkese açık olanlar: servisAdresi, sayfaBilgisi, dogrula, adIleAra. Diğerleri kendi içinde oturum (token) kontrolü yapar. */
function apiIslemleri_() {
  return {
    servisAdresi: servisAdresi, baslangic: baslangic, sayfaBilgisi: sayfaBilgisi, dogrula: dogrula, adIleAra: adIleAra,
    giris: giris, girisKod: girisKod, girisTelefon: girisTelefon, kullaniciTelefon: kullaniciTelefon, cikis: cikis, kimim: kimim, kullaniciListesi: kullaniciListesi, kullaniciEkle: kullaniciEkle,
    kullaniciSifreSifirla: kullaniciSifreSifirla, kullaniciDurum: kullaniciDurum, kullaniciRol: kullaniciRol, onayAyar: onayAyar, sifremiDegistir: sifremiDegistir,
    dbGet: dbGet, dbList: dbList, dbSet: dbSet, dbUpdate: dbUpdate, dbDelete: dbDelete, topluSet: topluSet,
    pdfKaydet: pdfKaydet, pdfKaydetToplu: pdfKaydetToplu, kayitEkleToplu: kayitEkleToplu, dbUpdateToplu: dbUpdateToplu, pdfKlasoruAdresi: pdfKlasoruAdresi, sablonKaydet: sablonKaydet, dosyaDataUrl: dosyaDataUrl,
    epostaKuyrugaEkle: epostaKuyrugaEkle, epostaDurum: epostaDurum, epostaOtomatik: epostaOtomatik, epostaSimdiGonder: epostaSimdiGonder,
    epostaTekGonder: epostaTekGonder, epostaTakmaAdlar: epostaTakmaAdlar, dogrulamaIstatistik: dogrulamaIstatistik, linkedinTik: linkedinTik, indirmeTik: indirmeTik, paylasimTik: paylasimTik, ibraMetinKaydet: ibraMetinKaydet, ibraListe: ibraListe, ibraGonder: ibraGonder, ibraGetir: ibraGetir, ibraKod: ibraKod, ibraOnayla: ibraOnayla, ibraIptal: ibraIptal, ibraGuncelle: ibraGuncelle, ibraLinkKaydet: ibraLinkKaydet, canliListe: canliListe, canliBaslat: canliBaslat, canliSatis: canliSatis, canliKaydet: canliKaydet, canliSinifAc: canliSinifAc, canliSil: canliSil, canliSupEkle: canliSupEkle, canliSupSil: canliSupSil, canliRapor: canliRapor, ibraTekrarGonder: ibraTekrarGonder, ibraGoruldu: ibraGoruldu, dogrulaSablon: dogrulaSablon, smsSertifikaGonder: smsSertifikaGonder, smsDurum: smsDurum, smsTopluGonder: smsTopluGonder
  };
}
function doPost(e) {
  var cevap;
  try {
    var istek = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var fn = String(istek.fn || ''), args = Array.isArray(istek.args) ? istek.args : [];
    var tablo = apiIslemleri_();
    if (!Object.prototype.hasOwnProperty.call(tablo, fn)) throw new Error('Geçersiz işlem.');
    cevap = { ok: true, sonuc: tablo[fn].apply(null, args) };
  } catch (err) {
    cevap = { ok: false, hata: (err && err.message) || String(err) };
  }
  return ContentService.createTextOutput(JSON.stringify(cevap)).setMimeType(ContentService.MimeType.JSON);
}

/* ================= QR doğrulama (giriş gerektirmez; yalnızca okutulan sertifikayı döndürür) ================= */
function servisAdresi() { return ScriptApp.getService().getUrl(); }
/* Açılışta tek seferde: tüm kayıtlar + gerekli ayarlar + servis adresi (sayfa eskiden 8 ayrı istek atıyordu). */
function baslangic(token) {
  alan_(token, 'sertifika');
  // HIZ: tablo değişmediyse kayıtlar önbellekten gelir (Veri sayfası her açılışta baştan okunmaz)
  var ok = 'bas_' + veriSurum_(), hazir = onbBuyukOku_(ok), v = null;
  if (hazir) { try { v = JSON.parse(hazir); } catch (err) { v = null; } }
  if (!v) {
    var rows = satirlar_(), kayit = [], ay = {}, gerekli = { egitimler: 1, telif: 1, eposta: 1, sms: 1, qr: 1, sablon: 1, akredite: 1 };
    rows.forEach(function (r) {
      if (r[0] === 'kayit') kayit.push({ id: String(r[1]), json: birlestir_(r) });
      else if (r[0] === 'ayarlar' && gerekli[String(r[1])]) ay[String(r[1])] = birlestir_(r);
    });
    Object.keys(gerekli).forEach(function (k) { if (!ay.hasOwnProperty(k)) ay[k] = null; });
    v = { kayit: kayit, ayarlar: ay };
    onbBuyukYaz_(ok, JSON.stringify(v));
  }
  v.servisUrl = servisAdresi(); v.onay = onayZorunlu_();
  return v;
}
/* Herkese açık sayfa bilgisi: alt bilgi (telif) yazısı. Ayarlar > "Alt bilgi (telif) yazısı" bölümünden değiştirilir. */
function sayfaBilgisi() {
  var telif = ''; try { telif = genelAyar_().telif || ''; } catch (err) {}
  return { telif: telif, giris: telGirisAcik_() ? 'tel' : 'sifre', robot: robotAnahtar_() };
}
function dogrula(no, kaynak) {
  no = String(no || '').replace(/[^0-9:]/g, '');
  if (no.length < 10) return null;
  var sinir = sorguSiniri_(); if (sinir) return sinir;
  var bulunan = dgBul_(no);
  if (!bulunan) return null;
  // Şablon görseli artık her sorguda gönderilmez: sayfa onu zaten içerir (SABLON_ID); farklıysa dogrulaSablon ile bir kez alınır.
  var g = genelAyar_();
  bulunan.sablonId = (g.ozel && g.ozel[bulunan.egitim]) || g.sablonId || '';
  if (g.ozel && g.ozel[bulunan.egitim]) bulunan.ozelSablon = true;
  if (g.cpdYok && g.cpdYok[bulunan.egitim]) bulunan.cpdYok = true;
  if (adlerMi_(bulunan.egitim)) { bulunan.adler = true; bulunan.cpdYok = true; bulunan.ozelSablon = false; } // Adler şablonu sayfada sabit (ADLER_SABLON)
  bulunan.qr = g.qr || (ScriptApp.getService().getUrl() + '?dogrula={NO}');
  if (g.liOrg) bulunan.liOrg = g.liOrg;
  try { dogrulamaKaydet_(bulunan, kaynak); } catch (err) {}
  return bulunan;
}
/* Doğrulama sayfası: kayıtlı şablon görseli (yalnızca ayarlardaki güncel şablon verilir) */
function dogrulaSablon(id) {
  var g = genelAyar_();
  id = String(id || ''); if (!id) return null;
  var izinli = id === String(g.sablonId) || Object.keys(g.ozel || {}).some(function (k) { return g.ozel[k] === id; });
  return izinli ? (sablonDataUrl_(id) || null) : null;
}

/* ================= doğrulama sayacı ("Doğrulama" sayfası: her başarılı sorgu bir satır) ================= */
var DG_BASLIK = ['Zaman', 'Sertifika No', 'Ad Soyad', 'Eğitim', 'Nasıl', 'ISO zaman'];
function dogrulamaSayfasi_() {
  var ss = ss_(), sh = ss.getSheetByName('Doğrulama');
  if (!sh) { sh = ss.insertSheet('Doğrulama'); sh.appendRow(DG_BASLIK); sh.setFrozenRows(1); sh.getRange(1, 1, 1, DG_BASLIK.length).setFontWeight('bold'); }
  return sh;
}
function dogrulamaKaydet_(b, kaynak) {
  var ad = { qr: 'QR / bağlantı', no: 'Numara ile sorgu', ad: 'Ad soyad ile sorgu', li: 'LinkedIn profilinden', lik: 'LinkedIn ekle tıklaması', ind: 'PDF indirme', wa: 'WhatsApp paylaşımı', ig: 'Instagram paylaşımı' }[String(kaynak || '')] || 'Diğer';
  var sh = dogrulamaSayfasi_(); sh.getRange(sh.getLastRow() + 1, 1, 1, DG_BASLIK.length).setNumberFormat('@').setValues([[simdi_(), String(b.n), b.isim, b.egitim, ad, new Date().toISOString()]]);
}
/* Panel için: toplam, son 30 gün, günlük dağılım, sertifika başına adet ve son doğrulama */
function dogrulamaIstatistik(token) {
  oturum_(token);
  var sh = dogrulamaSayfasi_(), son = sh.getLastRow(), rows = son > 1 ? sh.getRange(2, 1, son - 1, DG_BASLIK.length).getDisplayValues() : [];
  var sinir = Date.now() - 30 * 864e5, son30 = 0, nasil = {}, sert = {}, gun = {}, li = { toplam: 0, son30: 0, ziyaret: 0, sert: {} }, ind = { toplam: 0, son30: 0, sert: {} }, pay = { wa: 0, ig: 0, sert: {} };
  rows = rows.filter(function (r) {
    if (r[4] === 'WhatsApp paylaşımı' || r[4] === 'Instagram paylaşımı') { var t = r[4].charAt(0) === 'W' ? 'wa' : 'ig'; pay[t]++; var ps = pay.sert[r[1]] || (pay.sert[r[1]] = { wa: 0, ig: 0 }); ps[t]++; return false; }
    if (r[4] === 'PDF indirme') { ind.toplam++; if ((Date.parse(r[5]) || 0) >= sinir) ind.son30++; var q = ind.sert[r[1]] || (ind.sert[r[1]] = { i: 0, s: '', isim: r[2], egitim: r[3] }); q.i++; if (r[5] > q.s) q.s = r[5]; return false; }
    if (r[4] === 'LinkedIn profilinden') { li.ziyaret++; var y = li.sert[r[1]] || (li.sert[r[1]] = { t: 0, v: 0, s: '', isim: r[2], egitim: r[3] }); y.v++; if (r[5] > y.s) y.s = r[5]; }
    if (r[4] !== 'LinkedIn ekle tıklaması') return true;
    li.toplam++; if ((Date.parse(r[5]) || 0) >= Date.now() - 30 * 864e5) li.son30++;
    var x = li.sert[r[1]] || (li.sert[r[1]] = { t: 0, v: 0, s: '', isim: r[2], egitim: r[3] }); x.t++; if (r[5] > x.s) x.s = r[5];
    return false;
  });
  rows.forEach(function (r) {
    var z = Date.parse(r[5]) || 0, n = r[1];
    if (!sert[n]) sert[n] = { a: 0, s: '', isim: r[2], egitim: r[3] }; sert[n].a++; if (r[5] > sert[n].s) sert[n].s = r[5];
    if (z >= sinir) { son30++; nasil[r[4]] = (nasil[r[4]] || 0) + 1; var g = r[5].slice(0, 10); gun[g] = (gun[g] || 0) + 1; }
  });
  return { toplam: rows.length, son30: son30, nasil: nasil, gun: gun, sert: sert, li: li, ind: ind, pay: pay };
}
/* Doğrulama sayfasındaki "LinkedIn profiline ekle" ve "PDF olarak indir" tıklamaları (herkese açık; sorgu sınırına tabi) */
function linkedinTik(no) { return dogrulamaTik_(no, 'lik'); }
function indirmeTik(no) { return dogrulamaTik_(no, 'ind'); }
function paylasimTik(no, tur) { return dogrulamaTik_(no, tur === 'ig' ? 'ig' : 'wa'); }
function dogrulamaTik_(no, kaynak) {
  no = String(no || '').replace(/[^0-9:]/g, ''); if (no.length < 10) return false;
  if (sorguSiniri_()) return false;
  var b = dgBul_(no);
  if (!b || b.iptal) return false;
  dogrulamaKaydet_(b, kaynak);
  return true;
}

/* kötüye kullanım sınırı: dakikada en fazla 60 sorgu (tüm ziyaretçiler toplamı) */
function sorguSiniri_() {
  var c = CacheService.getScriptCache(), dk = 'dg_' + Math.floor(Date.now() / 60000), say = Number(c.get(dk) || 0);
  if (say >= 60) return { hata: 'Lütfen bir dakika sonra tekrar deneyin. / Please try again in a minute.' };
  c.put(dk, String(say + 1), 120);
  return null;
}
function isimNorm_(s) {
  var tr = { 'Ç': 'C', 'ç': 'c', 'Ğ': 'G', 'ğ': 'g', 'İ': 'I', 'ı': 'i', 'Ö': 'O', 'ö': 'o', 'Ş': 'S', 'ş': 's', 'Ü': 'U', 'ü': 'u', 'Â': 'A', 'â': 'a', 'Î': 'I', 'î': 'i', 'Û': 'U', 'û': 'u' };
  return String(s || '').replace(/[ÇçĞğİıÖöŞşÜüÂâÎîÛû]/g, function (ch) { return tr[ch]; }).toUpperCase().replace(/\s+/g, ' ').trim();
}
/* Ad soyad ile arama: yalnızca TAM eşleşme, yalnızca geçerli sertifikalar (kısmi arama/listeleme yok) */
function adIleAra(ad) {
  ad = isimNorm_(ad);
  if (ad.split(' ').filter(function (p) { return p.length >= 2; }).length < 2 || ad.length > 80) return { sonuc: [] };
  var sinir = sorguSiniri_(); if (sinir) return sinir;
  var hz = dgAdBul_(ad); if (hz) return { sonuc: hz.slice(0, 30) };
  var sonuc = [];
  satirlar_().forEach(function (r) {
    if (r[0] !== 'kayit') return;
    var d; try { d = JSON.parse(birlestir_(r)); } catch (err) { return; }
    var k = d.kisiler || {};
    Object.keys(k).forEach(function (key) {
      var x = k[key]; if (x.iptal || bekliyor_(x)) return;
      if (isimNorm_(x.a || key.split('#')[0]) === ad) sonuc.push({ isim: x.a || key.split('#')[0], egitim: d.egitim || '', t: x.t || '', n: x.n });
    });
  });
  sonuc.sort(function (a, b) { return a.egitim < b.egitim ? -1 : 1; });
  return { sonuc: sonuc.slice(0, 30) };
}

/* ================= kurulum (E-Tablo sahibi çalıştırır) ================= */
function kurulum() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Bu kodu E-Tablo içinden (Uzantılar > Apps Script) açın.');
  var p = PropertiesService.getScriptProperties();
  p.setProperty('SHEET_ID', ss.getId());
  var veri = ss.getSheetByName('Veri') || ss.insertSheet('Veri');
  if (veri.getLastRow() === 0) veri.appendRow(['koleksiyon', 'id', 'guncelleme', 'json']);
  veri.setFrozenRows(1);
  var kayit = ss.getSheetByName('Kayıt') || ss.insertSheet('Kayıt', 0);
  kayit.setFrozenRows(1);
  kullaniciSayfasi_();
  var ust = DriveApp.getFileById(ss.getId()).getParents();
  var klasor = ust.hasNext() ? ust.next() : DriveApp.getRootFolder();
  p.setProperty('UST_ID', klasor.getId());
  var it = DriveApp.getFilesByName(HTML_DOSYA_ADI);
  if (it.hasNext()) p.setProperty('HTML_ID', it.next().getId());
  if (!p.getProperty('PDF_ID')) p.setProperty('PDF_ID', altKlasor_(klasor, 'Sertifikalar').getId());
  kayitSayfasiYenile_();
  uyari_('Kurulum tamam.\n\n' + (p.getProperty('HTML_ID') ? '✓ Sayfa dosyası bulundu.\n' : '✗ ' + HTML_DOSYA_ADI + ' bulunamadı!\n') +
    '✓ "Sertifikalar" klasörü hazır.\n\nSıradaki adım: "yoneticiOlustur" fonksiyonunu çalıştırın.');
}

/* İlk yönetici hesabını oluşturur (E-Tablo sekmesinde soru pencereleri açılır). */
function yoneticiOlustur() {
  var ui = SpreadsheetApp.getUi();
  var r1 = ui.prompt('Yönetici kullanıcı adı', 'Örnek: burak (Türkçe karakter ve boşluk kullanmayın)', ui.ButtonSet.OK_CANCEL);
  if (r1.getSelectedButton() !== ui.Button.OK) return;
  var kadi = kadiNorm_(r1.getResponseText());
  if (!kadi) { ui.alert('Kullanıcı adı geçersiz. Yalnızca harf, rakam, nokta ve alt çizgi kullanın.'); return; }
  var r2 = ui.prompt('Şifre', 'En az 8 karakter', ui.ButtonSet.OK_CANCEL);
  if (r2.getSelectedButton() !== ui.Button.OK) return;
  var sifre = r2.getResponseText();
  if (String(sifre).length < 8) { ui.alert('Şifre en az 8 karakter olmalı.'); return; }
  var r3 = ui.prompt('Ad soyad', 'Sistemde görünecek adınız', ui.ButtonSet.OK_CANCEL);
  if (r3.getSelectedButton() !== ui.Button.OK) return;
  kullaniciYaz_(kadi, r3.getResponseText() || kadi, sifre, 'yonetici', true);
  ui.alert('Yönetici oluşturuldu: ' + kadi + '\n\nSistem adresini açıp bu kullanıcı adı ve şifreyle giriş yapabilirsiniz.');
}

/* ================= yardımcılar ================= */
function uyari_(m) { try { SpreadsheetApp.getUi().alert(m); } catch (e) { Logger.log(m); } }
function prop_(k) { return PropertiesService.getScriptProperties().getProperty(k); }
function htmlDosyasi_() {
  var id = prop_('HTML_ID');
  if (id) { try { return DriveApp.getFileById(id); } catch (e) {} }
  var it = DriveApp.getFilesByName(HTML_DOSYA_ADI);
  return it.hasNext() ? it.next() : null;
}
function ss_() { var id = prop_('SHEET_ID'); return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet(); }
function veri_() { return ss_().getSheetByName('Veri'); }
function altKlasor_(ust, ad) { var it = ust.getFoldersByName(ad); return it.hasNext() ? it.next() : ust.createFolder(ad); }
function kilitle_(fn) { var l = LockService.getScriptLock(); l.waitLock(30000); try { return fn(); } finally { l.releaseLock(); } }
function satirlar_() {
  var sh = veri_(); var son = sh.getLastRow(); if (son < 2) return [];
  return sh.getRange(2, 1, son - 1, Math.max(4, sh.getLastColumn())).getValues();
}
function satirBul_(rows, kol, id) { for (var i = 0; i < rows.length; i++) if (rows[i][0] === kol && rows[i][1] === id) return i; return -1; }
function birlestir_(row) { return row.slice(3).join(''); }
function satirYaz_(sh, satirNo, kol, id, json) {
  var parcalar = [];
  for (var i = 0; i < json.length; i += PARCA) parcalar.push(json.substring(i, i + PARCA));
  if (!parcalar.length) parcalar.push('{}');
  var gerek = 3 + parcalar.length;
  if (sh.getMaxColumns() < gerek) sh.insertColumnsAfter(sh.getMaxColumns(), gerek - sh.getMaxColumns());
  var eskiGen = Math.max(4, sh.getLastColumn());
  if (satirNo <= sh.getLastRow() && eskiGen > 3) sh.getRange(satirNo, 4, 1, eskiGen - 3).clearContent();
  sh.getRange(satirNo, 1, 1, gerek).setNumberFormat('@').setValues([[kol, id, new Date().toISOString()].concat(parcalar)]);
  veriDegisti_();
}
/* ================= hız: önbellek =================
 * Veri sayfası her değiştiğinde VERI_SURUM yenilenir (satirYaz_ / dbDelete). Önbellek anahtarları bu sürümü içerir,
 * böylece değişiklik anında geçerli olur; eski kayıtlar 6 saat içinde kendiliğinden silinir.
 * Herkese açık sayfalar (doğrulama, ibraname) artık her ziyarette tüm tabloyu okumaz.
 */
function veriSurum_() { return prop_('VERI_SURUM') || '0'; }
function veriDegisti_() { try { PropertiesService.getScriptProperties().setProperty('VERI_SURUM', String(Date.now())); } catch (err) {} }
var ONB_PARCA = 45000;
function onbBuyukYaz_(anahtar, metin) {
  var n = Math.ceil(metin.length / ONB_PARCA); if (!n || n > 120) return;
  var o = {}; for (var i = 0; i < n; i++) o[anahtar + '_' + i] = metin.substr(i * ONB_PARCA, ONB_PARCA);
  o[anahtar + '_n'] = String(n);
  try { CacheService.getScriptCache().putAll(o, 21600); } catch (err) {}
}
function onbBuyukOku_(anahtar) {
  var c = CacheService.getScriptCache(), n = Number(c.get(anahtar + '_n') || 0); if (!n) return null;
  var k = []; for (var i = 0; i < n; i++) k.push(anahtar + '_' + i);
  var v = c.getAll(k), s = [];
  for (var j = 0; j < n; j++) { if (v[k[j]] == null) return null; s.push(v[k[j]]); }
  return s.join('');
}
/* Sayfa HTML'i: Drive'dan her seferinde okunmaz; dosya değişince (yeni sürüm yüklenince) önbellek kendiliğinden yenilenir */
function sayfaHtml_() {
  var f = htmlDosyasi_(); if (!f) return null;
  var k = 'html_' + f.getId() + '_' + f.getLastUpdated().getTime();
  var h = onbBuyukOku_(k); if (h) return h;
  h = f.getBlob().getDataAsString('UTF-8'); onbBuyukYaz_(k, h);
  return h;
}
function basEkle_(html, js) {
  var bas = '<head><script>' + String(js).replace(/</g, '\\u003c') + '</script>';
  return html.replace('<head>', function () { return bas; });
}
function sayfaBilgisiOn_() { try { return 'window.SAYFA_BILGI=' + JSON.stringify(sayfaBilgisi()) + ';'; } catch (err) { return ''; } }
/* Sayfadaki varsayılan sertifika şablonunu kayıtlı şablonla (ya da boşla) değiştirir */
function sablonDegistir_(html, dataUrl) {
  var bas = 'const SABLON_VARSAYILAN = "', i = html.indexOf(bas); if (i < 0) return html;
  var j = html.indexOf('"', i + bas.length); if (j < 0) return html;
  return html.slice(0, i + bas.length) + dataUrl + html.slice(j);
}
function sablonDataUrl_(id) {
  var k = 'sbl_' + id, d = onbBuyukOku_(k); if (d) return d;
  try { var b = DriveApp.getFileById(id).getBlob(); d = 'data:' + b.getContentType() + ';base64,' + Utilities.base64Encode(b.getBytes()); onbBuyukYaz_(k, d); return d; }
  catch (err) { return ''; }
}
/* Herkese açık ayarlar (şablon kimliği, QR/WordPress adresi, LinkedIn, alt bilgi). İlk okumada doğrulama dizini de kurulur. */
function genelAyar_() {
  var ver = veriSurum_(), c = CacheService.getScriptCache(), k = 'genel_' + ver, j = c.get(k);
  if (j) { try { return JSON.parse(j); } catch (err) {} }
  var rows = satirlar_();
  var oku = function (id) { var i = satirBul_(rows, 'ayarlar', id); if (i < 0) return null; try { return JSON.parse(birlestir_(rows[i])); } catch (err) { return null; } };
  var sb = oku('sablon') || {}, q = oku('qr') || {}, t = oku('telif') || {};
  var g = { sablonId: sb.onizlemeId || sb.driveId || '', qr: q.adres || '', liOrg: q.liOrg ? String(q.liOrg).replace(/\D/g, '') : '', telif: String(t.metin || '').slice(0, 200) };
  // Eğitime özel şablonlar (ör. Adler) ve CPD dışı eğitimler: Ayarlar > Eğitimler (yalnızca yönetici)
  g.ozel = {}; g.cpdYok = {};
  ((oku('akredite') || {}).liste || []).forEach(function (e) { if (!e || !e.ad) return; if (e.sablonId) g.ozel[e.ad] = String(e.sablonId); if (e.cpdYok) g.cpdYok[e.ad] = 1; });
  g.wp = g.qr && /^https:\/\//.test(g.qr) && !/script\.google\.com/.test(g.qr) ? String(g.qr).trim() : '';
  try { c.put(k, JSON.stringify(g), 21600); } catch (err) {}
  if (!c.get('dgx_' + ver + '_n')) dgDizinKur_(rows, ver);
  return g;
}
/* Doğrulama dizini: sertifika no → bilgi, ad soyad → geçerli sertifikalar (önbellekte, sürüm anahtarlı) */
function dgDizinKur_(rows, ver) {
  // Tüm dizin tek bir JSON olarak birkaç parça hâlinde saklanır (binlerce ayrı anahtar önbelleği doldurup oturumları silebiliyordu)
  var n = {}, adlar = {};
  rows.forEach(function (r) {
    if (r[0] !== 'kayit') return; var d; try { d = JSON.parse(birlestir_(r)); } catch (err) { return; }
    var k = d.kisiler || {};
    Object.keys(k).forEach(function (key) {
      var x = k[key]; if (!x || !x.n || bekliyor_(x)) return;
      var no = String(x.n); if (n[no]) return;
      var isim = x.a || key.split('#')[0];
      n[no] = [isim, d.egitim || '', x.c || '', x.s || '', x.t || '', x.iptal ? 1 : 0, x.iptal ? (x.iptal.neden || '') : '', x.ag || ''];
      if (!x.iptal) { var a = isimNorm_(isim); (adlar[a] = adlar[a] || []).push(no); }
    });
  });
  var dz = { n: n, a: adlar };
  onbBuyukYaz_('dgx_' + ver, JSON.stringify(dz));
  DG_DIZIN_ = { ver: ver, dz: dz };
  return dz;
}
var DG_DIZIN_ = null;
function dgDizin_() {
  var ver = veriSurum_();
  if (DG_DIZIN_ && DG_DIZIN_.ver === ver) return DG_DIZIN_.dz;
  var j = onbBuyukOku_('dgx_' + ver);
  if (j) { try { DG_DIZIN_ = { ver: ver, dz: JSON.parse(j) }; return DG_DIZIN_.dz; } catch (err) {} }
  return dgDizinKur_(satirlar_(), ver);
}
function dgKayit_(no, v) { return v ? { isim: v[0], egitim: v[1], c: v[2], s: v[3], t: v[4], n: no, iptal: !!v[5], iptalNeden: v[6] || '', ag: v[7] || '' } : null; }
function dgBul_(no) { return dgKayit_(no, dgDizin_().n[no]); }
/* Ad soyad araması dizinden (yalnızca geçerli sertifikalar) */
function dgAdBul_(ad) {
  var dz = dgDizin_();
  return (dz.a[ad] || []).map(function (no) { var b = dgKayit_(no, dz.n[no]); return { isim: b.isim, egitim: b.egitim, t: b.t, n: b.n }; })
    .sort(function (p, q) { return p.egitim < q.egitim ? -1 : 1; });
}
/* Apps Script'te gerektiğinde çalıştırın: tüm önbelleği geçersiz kılar (ör. E-Tablo'da elle değişiklik yapıldıysa) */
function onbellekTemizle() { veriDegisti_(); Logger.log('Önbellek yenilendi. Sonraki açılış tabloyu yeniden okur.'); }
function derinBirlestir_(a, b) {
  Object.keys(b).forEach(function (k) {
    var v = b[k];
    if (v && typeof v === 'object' && !Array.isArray(v) && a[k] && typeof a[k] === 'object' && !Array.isArray(a[k])) derinBirlestir_(a[k], v);
    else a[k] = v;
  });
  return a;
}

/* ================= kullanıcılar ve oturum ================= */
function kullaniciSayfasi_() {
  var ss = ss_(); var sh = ss.getSheetByName('Kullanıcılar');
  if (!sh) { sh = ss.insertSheet('Kullanıcılar'); sh.appendRow(['kullanici_adi', 'ad', 'rol', 'aktif', 'tuz', 'sifre_ozeti', 'olusturma', 'son_giris', 'telefon']); sh.setFrozenRows(1); }
  if (sh.getMaxColumns() < 9) sh.insertColumnsAfter(sh.getMaxColumns(), 9 - sh.getMaxColumns());
  if (sh.getRange(1, 9).getValue() !== 'telefon') sh.getRange(1, 9).setValue('telefon');
  return sh;
}
function kadiNorm_(s) { s = String(s || '').trim().toLowerCase(); return /^[a-z0-9._]{3,40}$/.test(s) ? s : ''; }
function ozet_(tuz, sifre) {
  var h = tuz + '|' + sifre;
  for (var i = 0; i < 300; i++) {
    h = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, h + '|' + tuz, Utilities.Charset.UTF_8)
      .map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('');
  }
  return h;
}
function kullanicilar_() {
  var sh = kullaniciSayfasi_(); var son = sh.getLastRow(); if (son < 2) return [];
  return sh.getRange(2, 1, son - 1, 9).getValues().map(function (r, i) {
    return { satir: i + 2, kadi: String(r[0]), ad: String(r[1]), rol: String(r[2]), aktif: r[3] === true || String(r[3]).toUpperCase() === 'TRUE', tuz: String(r[4]), ozet: String(r[5]), son: r[7], tel: telNorm_(r[8]) };
  });
}
/* HIZ: her işlemde Kullanıcılar sayfasını okumamak için rol/aktif bilgisi 60 sn önbellekte tutulur.
 * Rol, durum ya da kullanıcı değişince önbellek hemen silinir (kulOzetSil_). */
function kulOzet_() {
  var c = CacheService.getScriptCache(), j = c.get('kul_ozet');
  if (j) { try { return JSON.parse(j); } catch (err) {} }
  var o = {}; kullanicilar_().forEach(function (x) { o[x.kadi] = { rol: x.rol, aktif: x.aktif }; });
  try { c.put('kul_ozet', JSON.stringify(o), 60); } catch (err) {}
  return o;
}
function kulOzetSil_() { try { CacheService.getScriptCache().remove('kul_ozet'); } catch (err) {} }
function kullaniciYaz_(kadi, ad, sifre, rol, aktif) {
  kulOzetSil_();
  return kilitle_(function () {
    var sh = kullaniciSayfasi_(); var k = kullanicilar_().filter(function (x) { return x.kadi === kadi; })[0];
    var tuz = Utilities.getUuid(); var oz = ozet_(tuz, sifre);
    if (k) sh.getRange(k.satir, 2, 1, 5).setValues([[ad, rol, aktif, tuz, oz]]);
    else sh.appendRow([kadi, ad, rol, aktif, tuz, oz, new Date().toISOString(), '']);
    return true;
  });
}
function giris(kadi, sifre) {
  if (telGirisAcik_()) throw new Error('Giriş telefon numarası ve SMS koduyla yapılıyor. Sayfayı yenileyin.');
  kadi = kadiNorm_(kadi);
  var c = CacheService.getScriptCache(); var anahtar = 'deneme_' + kadi;
  var deneme = Number(c.get(anahtar) || 0);
  if (deneme >= DENEME_SINIRI) throw new Error('Çok fazla hatalı deneme. 15 dakika sonra tekrar deneyin.');
  var k = kullanicilar_().filter(function (x) { return x.kadi === kadi; })[0];
  if (!k || !k.aktif || ozet_(k.tuz, String(sifre || '')) !== k.ozet) {
    c.put(anahtar, String(deneme + 1), KILIT_SURE);
    Utilities.sleep(600);
    throw new Error('Kullanıcı adı veya şifre hatalı.');
  }
  c.remove(anahtar);
  if (smsAcik_()) return smsKoduGonder_(k);
  return oturumAc_(k);
}
/* Oturum: hızlı kopya önbellekte, kalıcı kopya Komut dosyası özelliklerinde (önbellek dolunca silinse bile oturum kapanmaz).
 * Özellikte jetonun kendisi değil özeti saklanır. */
function otAnahtar_(token) { return 'OT_' + ozetKisa_('oturum|' + token).slice(0, 40); }
function otYaz_(token, o) {
  CacheService.getScriptCache().put('oturum_' + token, JSON.stringify(o), OTURUM_SURE);
  try { PropertiesService.getScriptProperties().setProperty(otAnahtar_(token), JSON.stringify(o)); } catch (err) {}
}
function otTemizle_() {
  try {
    var p = PropertiesService.getScriptProperties(), t = p.getProperties(), sinir = Date.now() - OTURUM_SURE * 1000;
    Object.keys(t).forEach(function (k) { if (k.indexOf('OT_') !== 0) return; var o = null; try { o = JSON.parse(t[k]); } catch (err) {} if (!o || !o.y || o.y < sinir) p.deleteProperty(k); });
  } catch (err) {}
}
function oturumAc_(k) {
  otTemizle_();
  var token = Utilities.getUuid() + Utilities.getUuid().replace(/-/g, '');
  otYaz_(token, { kadi: k.kadi, ad: k.ad, rol: k.rol, y: Date.now() });
  try { kullaniciSayfasi_().getRange(k.satir, 8).setValue(new Date().toISOString()); } catch (e) {}
  return { token: token, kadi: k.kadi, ad: k.ad, rol: k.rol };
}

/* ================= SMS ile giriş onayı (Netgsm) =================
 * smsKur() bir kez çalıştırılınca açılır: şifreden sonra telefona 6 haneli kod gider (5 dk geçerli, en fazla 5 deneme).
 * Kapatmak için smsKapat(). Netgsm bilgileri Komut Dosyası Özelliklerinde saklanır (kodda görünmez).
 */
var SMS_SURE = 300;
function smsAcik_() { var p = PropertiesService.getScriptProperties(); return p.getProperty('SMS_ACIK') === '1' && !!p.getProperty('NETGSM_KULLANICI'); }
function telNorm_(t) {
  var d = String(t == null ? '' : t).replace(/\D/g, '');
  if (d.length === 12 && d.indexOf('90') === 0) d = d.slice(2);
  if (d.length === 11 && d.charAt(0) === '0') d = d.slice(1);
  return /^5\d{9}$/.test(d) ? d : '';
}
/* ===== Telefon + SMS koduyla giriş (şifresiz). Açmak: telefonlaGirisiAc, geri dönmek: sifreyleGiriseDon ===== */
function telGirisAcik_() { return prop_('GIRIS_MODU') === 'tel' && netgsmBagli_(); }
function girisTelefon(tel, robot) {
  if (!telGirisAcik_()) throw new Error('Telefonla giriş açık değil.');
  var t = telNorm_(tel); if (!t) throw new Error('Cep telefonu numarasını 05xx xxx xx xx biçiminde yazın.');
  robotDogrula_(robot);
  var c = CacheService.getScriptCache(), dk = 'gtl_' + Math.floor(Date.now() / 60000), say = Number(c.get(dk) || 0);
  if (say >= 30) throw new Error('Çok fazla deneme. Bir dakika sonra tekrar deneyin.');
  c.put(dk, String(say + 1), 120);
  var k = kullanicilar_().filter(function (x) { return x.aktif && x.tel === t; })[0];
  if (!k) { Utilities.sleep(700); return { sms: true, kimlik: Utilities.getUuid(), tel: telGizle_(t) }; } // numara kayıtlı değilse de aynı cevap (numara taraması önlenir)
  return smsKoduGonder_(k);
}
/* ===== "Ben robot değilim" (Google reCAPTCHA v2). Proje Ayarları > Komut dosyası özellikleri:
 * RECAPTCHA_SITE = site anahtarı, RECAPTCHA_GIZLI = gizli anahtar. İkisi de varsa telefonla girişte kutu istenir. ===== */
function robotAnahtar_() { var s = prop_('RECAPTCHA_SITE'), g = prop_('RECAPTCHA_GIZLI'); return s && g ? String(s).trim() : ''; }
function robotDogrula_(yanit) {
  if (!robotAnahtar_()) return;
  if (!yanit) throw new Error('Lütfen "Ben robot değilim" kutusunu işaretleyin.');
  var r = null;
  try {
    r = JSON.parse(UrlFetchApp.fetch('https://www.google.com/recaptcha/api/siteverify', { method: 'post', payload: { secret: String(prop_('RECAPTCHA_GIZLI')).trim(), response: String(yanit) }, muteHttpExceptions: true }).getContentText());
  } catch (err) { throw new Error('Robot doğrulaması şu an yapılamadı, birkaç saniye sonra tekrar deneyin.'); }
  if (!r || !r.success) throw new Error('Robot doğrulaması geçersiz ya da süresi doldu. Kutuyu yeniden işaretleyin.');
}
/* Apps Script'te çalıştırın: girişi telefon + SMS koduna çevirir (şifre sorulmaz). */
function telefonlaGirisiAc() {
  var ui = SpreadsheetApp.getUi();
  if (!netgsmBagli_()) { ui.alert('Önce smsKur ile Netgsm bağlanmalı.'); return; }
  var l = kullanicilar_().filter(function (k) { return k.aktif; }), eksik = l.filter(function (k) { return !k.tel; }).map(function (k) { return k.kadi; });
  var say = {}; l.forEach(function (k) { if (k.tel) say[k.tel] = (say[k.tel] || 0) + 1; });
  var ayni = Object.keys(say).filter(function (t) { return say[t] > 1; });
  if (ayni.length) { ui.alert('Aynı telefon birden fazla kullanıcıda kayıtlı: ' + ayni.map(telGizle_).join(', ') + '\nHer kullanıcının numarası farklı olmalı.'); return; }
  if (eksik.length && ui.alert('Telefonu olmayan kullanıcılar', 'Şu kullanıcılar telefonla giriş yapamaz:\n' + eksik.join(', ') + '\n\nYine de açılsın mı?', ui.ButtonSet.YES_NO) !== ui.Button.YES) return;
  PropertiesService.getScriptProperties().setProperty('GIRIS_MODU', 'tel');
  ui.alert('Telefonla giriş açıldı. Artık giriş ekranında yalnızca cep telefonu istenir; her girişte SMS kodu gelir.\n\nSMS gelmezse (kredi bitti vb.) sifreyleGiriseDon fonksiyonunu çalıştırarak şifreli girişe dönebilirsiniz.');
}
function sifreyleGiriseDon() { PropertiesService.getScriptProperties().deleteProperty('GIRIS_MODU'); uyari_('Şifreli girişe dönüldü. Giriş kullanıcı adı + şifreyle yapılır.'); }
function telBaskasinda_(t, kadi) { return t && kullanicilar_().some(function (x) { return x.tel === t && x.kadi !== kadi; }); }
function telGizle_(t) { return t ? '0' + t.slice(0, 3) + ' *** ** ' + t.slice(8) : ''; }
function ozetKisa_(s) { return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8).map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join(''); }
function smsKoduGonder_(k) {
  if (!k.tel) throw new Error('Hesabınızda cep telefonu numarası tanımlı değil. Yöneticiden Ayarlar > Kullanıcılar bölümünden eklemesini isteyin.');
  var c = CacheService.getScriptCache(), sk = 'smsSay_' + k.kadi, say = Number(c.get(sk) || 0);
  if (say >= 5) throw new Error('Çok fazla kod istendi. 15 dakika sonra tekrar deneyin.');
  c.put(sk, String(say + 1), 900);
  var kod = String(100000 + Math.floor(Math.random() * 900000)), kimlik = Utilities.getUuid();
  netgsmGonder_(k.tel, 'Prime Campus sertifika sistemi giris kodunuz: ' + kod + ' (5 dakika gecerlidir). Bu kodu kimseyle paylasmayin.');
  c.put('smsKod_' + kimlik, JSON.stringify({ kadi: k.kadi, h: ozetKisa_(kimlik + '|' + kod), n: 0 }), SMS_SURE);
  return { sms: true, kimlik: kimlik, tel: telGizle_(k.tel) };
}
function girisKod(kimlik, kod) {
  var c = CacheService.getScriptCache(), anahtar = 'smsKod_' + String(kimlik || '');
  var j = c.get(anahtar); if (!j) throw new Error('Kodun süresi doldu. Yeniden giriş yapın.');
  var d = JSON.parse(j);
  if (ozetKisa_(kimlik + '|' + String(kod || '').replace(/\D/g, '')) !== d.h) {
    d.n++; Utilities.sleep(500);
    if (d.n >= 5) { c.remove(anahtar); throw new Error('Kod 5 kez hatalı girildi. Yeniden giriş yapın.'); }
    c.put(anahtar, JSON.stringify(d), SMS_SURE);
    throw new Error('Kod hatalı. Kalan deneme: ' + (5 - d.n));
  }
  c.remove(anahtar);
  var k = kullanicilar_().filter(function (x) { return x.kadi === d.kadi; })[0];
  if (!k || !k.aktif) throw new Error('Kullanıcı bulunamadı.');
  return oturumAc_(k);
}
/* onek: '' = ana Netgsm hesabı (sertifika SMS'i, giriş kodu); 'IBRA_' = ibraname için ayrı hesap */
function netgsmGonder_(tel, mesaj, onek) {
  var p = PropertiesService.getScriptProperties(); onek = onek || '';
  if (!netgsmBagli_(onek)) throw new Error(onek ? 'İbraname Netgsm hesabı bağlı değil (IBRA_NETGSM_KULLANICI / IBRA_NETGSM_SIFRE / IBRA_NETGSM_BASLIK).' : 'Netgsm bağlı değil.');
  var auth = 'Basic ' + Utilities.base64Encode(p.getProperty(onek + 'NETGSM_KULLANICI') + ':' + p.getProperty(onek + 'NETGSM_SIFRE'), Utilities.Charset.UTF_8);
  var baslik = p.getProperty(onek + 'NETGSM_BASLIK');
  var istek = function (yol, govde) {
    var cev = UrlFetchApp.fetch('https://api.netgsm.com.tr/sms/rest/v2/' + yol, { method: 'post', contentType: 'application/json', headers: { Authorization: auth }, payload: JSON.stringify(govde), muteHttpExceptions: true });
    var t = cev.getContentText(), o; try { o = JSON.parse(t); } catch (e) { o = { code: String(cev.getResponseCode()), description: t.slice(0, 120) }; }
    return o;
  };
  var yd = /^00/.test(String(tel)); // yurt dışı numarası: OTP servisi yerine normal gönderim
  var o = yd ? { code: '-' } : istek('otp', { msgheader: baslik, msg: mesaj, no: tel });
  if (String(o.code) !== '00' && String(o.code) !== '30') o = istek('send', { msgheader: baslik, encoding: 'TR', messages: [{ msg: mesaj, no: tel }] });
  if (String(o.code) !== '00') {
    var anlam = { '20': 'mesaj metni hatalı', '30': 'Netgsm kullanıcı adı/şifre hatalı, API yetkisi yok ya da IP kısıtlaması var', '40': 'gönderici adı (başlık) tanımlı değil', '41': 'gönderici adı (başlık) geçersiz', '50': 'numara hatalı', '51': 'numara hatalı', '60': 'OTP paketi/kredisi yok', '70': 'parametre hatası', '80': 'gönderim sınırı aşıldı', '85': 'aynı numaraya çok sık gönderim' }[String(o.code)] || (o.description || 'bilinmeyen hata');
    throw new Error('SMS gönderilemedi (Netgsm ' + o.code + ': ' + anlam + ').');
  }
  return o.jobid || true;
}
/* Apps Script'te bir kez çalıştırın: Netgsm bilgilerini sorar, test SMS'i gönderir, SMS onayını açar. */
function smsKur() {
  var ui = SpreadsheetApp.getUi(), p = PropertiesService.getScriptProperties();
  var sor = function (baslik, aciklama) { var r = ui.prompt(baslik, aciklama, ui.ButtonSet.OK_CANCEL); if (r.getSelectedButton() !== ui.Button.OK) throw new Error('İptal edildi.'); return String(r.getResponseText()).trim(); };
  var kul = sor('Netgsm kullanıcı adı', 'Netgsm API kullanıcı adınız (genelde 850xxxxxxx). Bu bilgi kodda değil, gizli ayarlarda saklanır.');
  var sif = sor('Netgsm şifresi', 'API kullanıcısının şifresi');
  var bas = sor('SMS başlığı', 'Netgsm\'de onaylı gönderici adınız (ör. PRIMECAMPUS) — büyük/küçük harf aynen');
  var tel = telNorm_(sor('Test için cep telefonu', 'Kodun gideceği numara (ör. 05xx xxx xx xx). Kendi numaranızı yazın.'));
  if (!tel) { ui.alert('Telefon numarası geçersiz.'); return; }
  p.setProperties({ NETGSM_KULLANICI: kul, NETGSM_SIFRE: sif, NETGSM_BASLIK: bas });
  try { netgsmGonder_(tel, 'Prime Campus sertifika sistemi: SMS onayi test mesaji.'); }
  catch (e) { ui.alert(e.message + '\n\nSMS onayı AÇILMADI. Bilgileri kontrol edip smsKur\'u yeniden çalıştırın.'); return; }
  // Netgsm bağlandı: öğrencilere sertifika SMS'i artık gönderilebilir. Girişte SMS onayı ayrıca sorulur.
  if (ui.alert('Test SMS\'i gönderildi. Netgsm bağlandı.', 'Öğrencilere sertifika SMS\'i artık gönderilebilir.\n\nSisteme GİRİŞTE de SMS onay kodu istensin mi? (Kullanıcıların telefonu Ayarlar > Kullanıcılar\'da kayıtlı olmalı.)', ui.ButtonSet.YES_NO) !== ui.Button.YES) {
    p.deleteProperty('SMS_ACIK'); ui.alert('Tamam. Giriş yalnızca kullanıcı adı ve şifreyle yapılır. Girişte SMS onayını sonra açmak için smsKur\'u yeniden çalıştırın.'); return;
  }
  var eksik = kullanicilar_().filter(function (k) { return k.aktif && !k.tel; }).map(function (k) { return k.kadi; });
  if (eksik.length && ui.alert('Telefonu olmayan kullanıcılar var', 'Şu aktif kullanıcıların telefonu yok, giriş SMS onayı açılırsa giriş yapamazlar:\n' + eksik.join(', ') + '\n\nYine de açılsın mı?', ui.ButtonSet.YES_NO) !== ui.Button.YES) {
    ui.alert('Girişte SMS onayı açılmadı. Önce panelde Ayarlar > Kullanıcılar\'dan telefonları ekleyin, sonra smsKur\'u yeniden çalıştırın.'); return;
  }
  p.setProperty('SMS_ACIK', '1');
  ui.alert('Girişte SMS onayı açıldı. Bundan sonra girişte şifreden sonra telefona kod gönderilir.\n\nKapatmak için Apps Script\'te smsKapat fonksiyonunu çalıştırın.');
}
function netgsmBagli_(onek) { var p = PropertiesService.getScriptProperties(); onek = onek || ''; return !!(p.getProperty(onek + 'NETGSM_KULLANICI') && p.getProperty(onek + 'NETGSM_SIFRE') && p.getProperty(onek + 'NETGSM_BASLIK')); }

/* ================= öğrencilere sertifika SMS'i (Netgsm, sınırsız; kayıt: "SMS" sayfası) ================= */
var SMS_BASLIK = ['Sertifika No', 'Telefon', 'Ad Soyad', 'Eğitim', 'Durum', 'Zaman', 'Not', 'Gönderen', 'İş No'];
function smsSayfasi_() {
  var ss = ss_(), sh = ss.getSheetByName('SMS');
  if (!sh) { sh = ss.insertSheet('SMS'); sh.appendRow(SMS_BASLIK); sh.setFrozenRows(1); sh.getRange(1, 1, 1, SMS_BASLIK.length).setFontWeight('bold'); }
  return sh;
}
function trSadele_(s) { var tr = { 'ç': 'c', 'Ç': 'C', 'ğ': 'g', 'Ğ': 'G', 'ı': 'i', 'İ': 'I', 'ö': 'o', 'Ö': 'O', 'ş': 's', 'Ş': 'S', 'ü': 'u', 'Ü': 'U' }; return String(s || '').replace(/[çÇğĞıİöÖşŞüÜ]/g, function (c) { return tr[c]; }); }
/* liste: [{n, p}] (JSON) — her sertifika için tebrik + doğrulama bağlantısı SMS'i */
function smsSertifikaGonder(token, json) {
  var o = alan_(token, 'sertifika');
  if (!netgsmBagli_()) return { gonderilen: 0, bagliDegil: true, mesaj: 'Netgsm bağlı değil. Apps Script\'te smsKur fonksiyonunu bir kez çalıştırın.' };
  var liste = JSON.parse(json || '[]'), vr = satirlar_(), kayit = {};
  if (o.rol !== 'yonetici') { // kullanıcı rolü için günlük SMS sınırı (kredi koruması)
    var pk = 'SMSG_' + o.kadi + '_' + Utilities.formatDate(new Date(), 'Europe/Istanbul', 'yyyyMMdd'), pp = PropertiesService.getScriptProperties(), kul = Number(pp.getProperty(pk) || 0);
    if (kul + liste.length > 200) throw new Error('Günlük SMS sınırına ulaşıldı (kullanıcı başına 200). Yöneticiye başvurun.');
    pp.setProperty(pk, String(kul + liste.length));
  }
  vr.forEach(function (r) {
    if (r[0] !== 'kayit') return; var d; try { d = JSON.parse(birlestir_(r)); } catch (err) { return; }
    var ks = d.kisiler || {}; Object.keys(ks).forEach(function (key) { var x = ks[key]; if (x.n) kayit[String(x.n)] = { isim: x.a || key.split('#')[0], egitim: d.egitim || '', n: String(x.n), iptal: !!x.iptal, bekliyor: bekliyor_(x) }; });
  });
  var ayar = ayarOku_(vr, 'sms') || {}, qr = ayarOku_(vr, 'qr') || {};
  var sablon = String(ayar.metin || 'Tebrikler {AD}! {EGITIM} sertifikaniz hazir: {LINK} - Prime Campus');
  var adres = qr.adres || (ScriptApp.getService().getUrl() + '?dogrula={NO}');
  var mesajlar = [], satir = [], gecersiz = 0, atlanan = 0, zaman = simdi_();
  liste.forEach(function (x) {
    var tel = telNorm_(x.p), k = kayit[String(x.n || '').replace(/[^0-9:]/g, '')];
    if (!tel) { gecersiz++; return; }
    if (!k || k.iptal || k.bekliyor) { atlanan++; return; }
    var link = adres.replace(/\{NO\}/g, encodeURIComponent(k.n));
    var msg = sablon.replace(/\{AD\}/g, k.isim).replace(/\{EGITIM\}/g, k.egitim).replace(/\{NO\}/g, k.n).replace(/\{LINK\}/g, link);
    mesajlar.push({ msg: msg, no: tel }); satir.push([k.n, '0' + tel, k.isim, k.egitim, '', zaman, '', o.kadi, '']);
  });
  var gonderilen = 0, hata = 0, sonHata = '';
  for (var i = 0; i < mesajlar.length; i += 50) {
    var parca = mesajlar.slice(i, i + 50);
    try {
      var job = netgsmToplu_(parca);
      for (var j = i; j < i + parca.length; j++) { satir[j][4] = 'GÖNDERİLDİ'; satir[j][8] = String(job || ''); }
      gonderilen += parca.length;
    } catch (err) {
      sonHata = String((err && err.message) || err);
      for (var j2 = i; j2 < i + parca.length; j2++) { satir[j2][4] = 'HATA'; satir[j2][6] = sonHata.slice(0, 200); }
      hata += parca.length;
    }
  }
  if (satir.length) { var sh = smsSayfasi_(); sh.getRange(sh.getLastRow() + 1, 1, satir.length, SMS_BASLIK.length).setNumberFormat('@').setValues(satir); }
  return { gonderilen: gonderilen, hata: hata, gecersiz: gecersiz, atlanan: atlanan, mesaj: sonHata };
}
/* Toplu SMS (SMS sayfası): { metin, tur: 'bilgi'|'ticari', kisiler: [{p, ad}] } — yalnızca Türkiye cep numaraları */
function smsTopluGonder(token, json) {
  var o = yonetici_(token);
  if (!netgsmBagli_()) return { gonderilen: 0, bagliDegil: true, mesaj: 'Netgsm bağlı değil. Apps Script\'te smsKur fonksiyonunu bir kez çalıştırın.' };
  var v = JSON.parse(json || '{}'), metin = String(v.metin || '').trim();
  if (!metin) throw new Error('Mesaj metni boş.');
  var gor = {}, mesajlar = [], satir = [], zaman = simdi_(), gecersiz = 0;
  (v.kisiler || []).forEach(function (x) {
    var tel = telNorm_(x.p); if (!tel || gor[tel]) { if (!tel) gecersiz++; return; } gor[tel] = 1;
    var ad = String(x.ad || '').slice(0, 80), msg = metin.replace(/\{AD\}/g, ad).replace(/\s{2,}/g, ' ').replace(/\s+([!,.])/g, '$1').trim();
    mesajlar.push({ msg: msg, no: tel }); satir.push(['TOPLU', '0' + tel, ad, '', '', zaman, '', o.kadi, '']);
  });
  var gonderilen = 0, hata = 0, sonHata = '';
  for (var i = 0; i < mesajlar.length; i += 50) {
    var parca = mesajlar.slice(i, i + 50);
    try { var job = netgsmToplu_(parca, v.tur === 'ticari' ? '11' : ''); for (var j = i; j < i + parca.length; j++) { satir[j][4] = 'GÖNDERİLDİ'; satir[j][8] = String(job || ''); } gonderilen += parca.length; }
    catch (err) { sonHata = String((err && err.message) || err); for (var j2 = i; j2 < i + parca.length; j2++) { satir[j2][4] = 'HATA'; satir[j2][6] = sonHata.slice(0, 200); } hata += parca.length; }
  }
  if (satir.length) { var sh = smsSayfasi_(); sh.getRange(sh.getLastRow() + 1, 1, satir.length, SMS_BASLIK.length).setNumberFormat('@').setValues(satir); }
  return { gonderilen: gonderilen, hata: hata, gecersiz: gecersiz, mesaj: sonHata };
}
function netgsmToplu_(mesajlar, iys) {
  var p = PropertiesService.getScriptProperties();
  var auth = 'Basic ' + Utilities.base64Encode(p.getProperty('NETGSM_KULLANICI') + ':' + p.getProperty('NETGSM_SIFRE'), Utilities.Charset.UTF_8);
  var turkce = mesajlar.some(function (m) { return /[çğıöşüÇĞİÖŞÜ]/.test(m.msg); });
  var govde = { msgheader: p.getProperty('NETGSM_BASLIK'), messages: mesajlar };
  if (iys) govde.iysfilter = iys;
  if (turkce) govde.encoding = 'TR';
  var cev = UrlFetchApp.fetch('https://api.netgsm.com.tr/sms/rest/v2/send', { method: 'post', contentType: 'application/json', headers: { Authorization: auth }, payload: JSON.stringify(govde), muteHttpExceptions: true });
  var t = cev.getContentText(), o; try { o = JSON.parse(t); } catch (e) { o = { code: String(cev.getResponseCode()), description: t.slice(0, 120) }; }
  if (String(o.code) !== '00') {
    var anlam = { '20': 'mesaj metni hatalı ya da çok uzun', '30': 'Netgsm kullanıcı adı/şifre hatalı, API yetkisi yok ya da IP kısıtlaması var', '40': 'gönderici adı (başlık) tanımlı değil', '50': 'İYS kontrollü gönderim yapılamıyor', '51': 'İYS marka bilgisi yok', '70': 'parametre hatası', '80': 'gönderim sınırı aşıldı', '85': 'aynı numaraya çok sık gönderim' }[String(o.code)] || (o.description || 'bilinmeyen hata');
    throw new Error('Netgsm ' + o.code + ': ' + anlam);
  }
  return o.jobid || '';
}
function smsDurum(token) {
  yonetici_(token);
  var p = PropertiesService.getScriptProperties(), sh = smsSayfasi_(), son = sh.getLastRow(), rows = son > 1 ? sh.getRange(2, 1, son - 1, SMS_BASLIK.length).getDisplayValues() : [];
  var bugun = Utilities.formatDate(new Date(), 'Europe/Istanbul', 'dd.MM.yyyy');
  return { bagli: netgsmBagli_(), baslik: p.getProperty('NETGSM_BASLIK') || '', girisOnay: smsAcik_(),
    bugun: rows.filter(function (r) { return r[4] === 'GÖNDERİLDİ' && String(r[5]).indexOf(bugun) === 0; }).length,
    son: rows.slice(-50).reverse().map(function (r) { return { n: r[0], p: r[1], isim: r[2], d: r[4], z: r[5], not: r[6] }; }) };
}
function smsKapat() { PropertiesService.getScriptProperties().deleteProperty('SMS_ACIK'); uyari_('SMS onayı kapatıldı. Giriş yalnızca kullanıcı adı ve şifreyle yapılır.'); }
/* Yöneticinin panelden telefon numarası eklemesi/değiştirmesi */
function kullaniciTelefon(token, kadi, tel) {
  yonetici_(token);
  var n = telNorm_(tel); if (String(tel || '').trim() && !n) throw new Error('Telefon numarası geçersiz (ör. 0532 123 45 67).');
  if (!n && (smsAcik_() || telGirisAcik_())) throw new Error('SMS ile giriş açıkken telefon numarası silinemez.');
  if (telBaskasinda_(n, kadi)) throw new Error('Bu telefon numarası başka bir kullanıcıda kayıtlı.');
  var k = kullanicilar_().filter(function (x) { return x.kadi === kadi; })[0];
  if (!k) throw new Error('Kullanıcı bulunamadı.');
  kullaniciSayfasi_().getRange(k.satir, 9).setNumberFormat('@').setValue(n);
  return telGizle_(n);
}
function cikis(token) {
  CacheService.getScriptCache().remove('oturum_' + token);
  try { PropertiesService.getScriptProperties().deleteProperty(otAnahtar_(token)); } catch (err) {}
  return true;
}
function oturum_(token) {
  if (!token) throw new Error('OTURUM_GECERSIZ');
  var j = CacheService.getScriptCache().get('oturum_' + token), o = null;
  if (j) o = JSON.parse(j);
  else { // önbellekte yoksa kalıcı kopyadan (son işlemden bu yana 1 saat geçmediyse)
    var pj = PropertiesService.getScriptProperties().getProperty(otAnahtar_(token));
    if (pj) { o = JSON.parse(pj); if (!o.y || Date.now() - o.y > OTURUM_SURE * 1000) { cikis(token); o = null; } else o.y = 0; }
  }
  if (!o) throw new Error('OTURUM_GECERSIZ');
  var k = kulOzet_()[o.kadi];
  if (!k || !k.aktif) { cikis(token); throw new Error('OTURUM_GECERSIZ'); }
  if (k.rol !== o.rol) { o.rol = k.rol; o.y = 0; } // rol değiştirildiyse hemen geçerli olur
  // Kayan süre: her işlemde oturum 1 saat daha uzar (en fazla dakikada bir yazılır)
  if (!o.y || Date.now() - o.y > 60000) { o.y = Date.now(); otYaz_(token, o); }
  return o;
}
function yonetici_(token) { var o = oturum_(token); if (o.rol !== 'yonetici') throw new Error('Bu işlem için yönetici yetkisi gerekir.'); return o; }
/* Roller: yonetici (her şey) · kullanici = Sertifika (yalnızca sertifika bölümleri) · ibraname = İbraname / tahsilat (yalnızca ibraname) */
var ROL_ALAN = { kullanici: { sertifika: 1 }, ibraname: { ibra: 1 } };
function rolNorm_(r) { r = String(r || ''); return r === 'yonetici' || r === 'ibraname' ? r : 'kullanici'; }
function alan_(token, alan) {
  var o = oturum_(token);
  if (o.rol === 'yonetici' || (ROL_ALAN[rolNorm_(o.rol)] || {})[alan]) return o;
  throw new Error('Bu bölüm için yetkiniz yok.');
}
function kullaniciRol(token, kadi, rol) {
  var o = yonetici_(token); rol = rolNorm_(rol);
  if (kadi === o.kadi && rol !== 'yonetici') throw new Error('Kendi yönetici yetkinizi kaldıramazsınız.');
  var k = kullanicilar_().filter(function (x) { return x.kadi === kadi; })[0];
  if (!k) throw new Error('Kullanıcı bulunamadı.');
  kullaniciSayfasi_().getRange(k.satir, 3).setValue(rol); kulOzetSil_();
  return true;
}

function kimim(token) { var o = oturum_(token); return { kadi: o.kadi, ad: o.ad, rol: rolNorm_(o.rol) }; }
function kullaniciListesi(token) {
  yonetici_(token);
  return kullanicilar_().map(function (k) { return { kadi: k.kadi, ad: k.ad, rol: k.rol, aktif: k.aktif, son: k.son ? String(k.son) : '', tel: k.tel ? '0' + k.tel : '', sms: smsAcik_() || telGirisAcik_(), mod: telGirisAcik_() ? 'tel' : 'sifre' }; });
}
function kullaniciEkle(token, kadi, ad, sifre, rol, tel) {
  yonetici_(token);
  kadi = kadiNorm_(kadi);
  if (!kadi) throw new Error('Kullanıcı adı geçersiz (3-40 karakter; harf, rakam, nokta, alt çizgi).');
  if (telGirisAcik_() && !String(sifre || '')) sifre = Utilities.getUuid(); // telefonla girişte şifre kullanılmaz
  if (String(sifre || '').length < 8) throw new Error('Şifre en az 8 karakter olmalı.');
  if (kullanicilar_().some(function (x) { return x.kadi === kadi; })) throw new Error('Bu kullanıcı adı zaten var.');
  var tn = telNorm_(tel);
  if (String(tel || '').trim() && !tn) throw new Error('Telefon numarası geçersiz (ör. 0532 123 45 67).');
  if (!tn && (smsAcik_() || telGirisAcik_())) throw new Error('SMS ile giriş açık: yeni kullanıcı için cep telefonu numarası zorunlu.');
  if (telBaskasinda_(tn, kadi)) throw new Error('Bu telefon numarası başka bir kullanıcıda kayıtlı.');
  kullaniciYaz_(kadi, String(ad || kadi), String(sifre), rolNorm_(rol), true);
  if (tn) { var yk = kullanicilar_().filter(function (x) { return x.kadi === kadi; })[0]; if (yk) kullaniciSayfasi_().getRange(yk.satir, 9).setNumberFormat('@').setValue(tn); }
  return true;
}
function kullaniciSifreSifirla(token, kadi, sifre) {
  yonetici_(token);
  if (String(sifre || '').length < 8) throw new Error('Şifre en az 8 karakter olmalı.');
  var k = kullanicilar_().filter(function (x) { return x.kadi === kadi; })[0];
  if (!k) throw new Error('Kullanıcı bulunamadı.');
  kullaniciYaz_(k.kadi, k.ad, String(sifre), k.rol, k.aktif);
  return true;
}
function kullaniciDurum(token, kadi, aktif) {
  var o = yonetici_(token);
  if (kadi === o.kadi && !aktif) throw new Error('Kendi hesabınızı pasif yapamazsınız.');
  var k = kullanicilar_().filter(function (x) { return x.kadi === kadi; })[0];
  if (!k) throw new Error('Kullanıcı bulunamadı.');
  kullaniciSayfasi_().getRange(k.satir, 4).setValue(!!aktif); kulOzetSil_();
  return true;
}
function sifremiDegistir(token, eski, yeni) {
  var o = oturum_(token);
  var k = kullanicilar_().filter(function (x) { return x.kadi === o.kadi; })[0];
  if (!k || ozet_(k.tuz, String(eski || '')) !== k.ozet) throw new Error('Mevcut şifre hatalı.');
  if (String(yeni || '').length < 8) throw new Error('Yeni şifre en az 8 karakter olmalı.');
  kullaniciYaz_(k.kadi, k.ad, String(yeni), k.rol, k.aktif);
  return true;
}

/* ================= onay akışı =================
 * Yönetici olmayan kullanıcının eklediği her yeni sertifika "onay bekliyor" (o.d = 'bekliyor') olarak kaydedilir.
 * Onaylama yalnızca yöneticiye açıktır; bekleyen sertifika doğrulama sayfasında görünmez, e-postası gönderilmez.
 */
/* Sertifika rolünün bastıkları yönetici onayına gitsin mi? (Ayarlar > Kullanıcılar; varsayılan: hayır) */
function onayZorunlu_() { return prop_('ONAY_ZORUNLU') === '1'; }
function onayAyar(token, acik) { yonetici_(token); PropertiesService.getScriptProperties().setProperty('ONAY_ZORUNLU', acik ? '1' : '0'); return !!acik; }
function kayitKoru_(o, eski, yeni) {
  if (!yeni || !yeni.kisiler || o.rol === 'yonetici') return yeni;
  var zorunlu = onayZorunlu_();
  var ek = (eski && eski.kisiler) || {}, z = new Date().toISOString();
  Object.keys(yeni.kisiler).forEach(function (key) {
    var x = yeni.kisiler[key], e = ek[key];
    if (!x || typeof x !== 'object') return;
    if (!e) { if (!x.iptal && zorunlu) x.o = { d: 'bekliyor', u: o.kadi, z: z }; else if (x.o && (x.o.d !== 'bekliyor' || !zorunlu)) delete x.o; }
    else if (e.o && e.o.d === 'bekliyor') x.o = e.o;
    else if (x.o && x.o.d === 'bekliyor' && !(e.o && e.o.d === 'bekliyor')) { if (e.o) x.o = e.o; else delete x.o; }
  });
  return yeni;
}
function bekliyor_(x) { return !!(x && x.o && x.o.d === 'bekliyor'); }

/* ================= veri (sayfanın çağırdığı) ================= */
function dbGet(token, kol, id) {
  alan_(token, 'sertifika');
  var rows = satirlar_(); var i = satirBul_(rows, kol, id);
  return i < 0 ? null : birlestir_(rows[i]);
}
function dbList(token, kol) {
  alan_(token, 'sertifika');
  return satirlar_().filter(function (r) { return r[0] === kol; }).map(function (r) { return { id: String(r[1]), json: birlestir_(r) }; });
}
function dbSet(token, kol, id, json) {
  var o = alan_(token, 'sertifika'); JSON.parse(json);
  if (kol === 'ayarlar' && o.rol !== 'yonetici' && id !== 'egitimler') throw new Error('Bu ayarı yalnızca yönetici değiştirebilir.');
  kilitle_(function () {
    var sh = veri_(); var rows = satirlar_(); var i = satirBul_(rows, kol, id);
    if (kol === 'kayit') json = JSON.stringify(kayitKoru_(o, i < 0 ? null : JSON.parse(birlestir_(rows[i]) || '{}'), JSON.parse(json)));
    satirYaz_(sh, i < 0 ? sh.getLastRow() + 1 : i + 2, kol, id, json);
  });
  if (kol === 'kayit') kayitSayfasiYenile_();
  return true;
}
function dbUpdate(token, kol, id, json) {
  var o = alan_(token, 'sertifika');
  var yeni = JSON.parse(json);
  if (kol === 'ayarlar' && o.rol !== 'yonetici' && id !== 'egitimler') throw new Error('Bu ayarı yalnızca yönetici değiştirebilir.');
  kilitle_(function () {
    var sh = veri_(); var rows = satirlar_(); var i = satirBul_(rows, kol, id);
    if (i < 0) throw new Error('Belge bulunamadı: ' + kol + '/' + id);
    var eski = JSON.parse(birlestir_(rows[i]) || '{}');
    if (kol === 'kayit') yeni = kayitKoru_(o, eski, yeni);
    satirYaz_(sh, i + 2, kol, id, JSON.stringify(derinBirlestir_(eski, yeni)));
  });
  if (kol === 'kayit') kayitSayfasiYenile_();
  return true;
}
function dbDelete(token, kol, id) {
  yonetici_(token); // silme yalnızca yönetici
  kilitle_(function () { var rows = satirlar_(); var i = satirBul_(rows, kol, id); if (i >= 0) { veri_().deleteRow(i + 2); veriDegisti_(); } });
  if (kol === 'kayit') kayitSayfasiYenile_();
  return true;
}
function topluSet(token, kol, haritaJson) {
  yonetici_(token);
  var harita = JSON.parse(haritaJson);
  kilitle_(function () {
    var sh = veri_();
    Object.keys(harita).forEach(function (id) {
      var rows = satirlar_(); var i = satirBul_(rows, kol, id);
      satirYaz_(sh, i < 0 ? sh.getLastRow() + 1 : i + 2, kol, id, JSON.stringify(harita[id]));
    });
  });
  if (kol === 'kayit') kayitSayfasiYenile_();
  return Object.keys(harita).length;
}

/* HIZ: Toplu sertifika kaydı — tek istek, tek kilit, tablo bir kez okunur, "Kayıt" sayfası bir kez yenilenir.
 * (Eskiden her eğitim/harf grubu için ayrı okuma + yazma + Kayıt sayfası yenileme yapılıyordu.)
 * istek: { parcaId: { egitim, kisiler: { isim: govde } } }
 * dönüş: { parcaId: { eklenen: [isim], cakisan: { isim: mevcutKayit }, o: { isim: onayDurumu } } } */
function kayitEkleToplu(token, json) {
  var o = alan_(token, 'sertifika');
  var istek = JSON.parse(json), sonuc = {}, rows = null;
  kilitle_(function () {
    var sh = veri_(); rows = satirlar_();
    Object.keys(istek).forEach(function (id) {
      var g = istek[id] || {}, gelen = g.kisiler || {}, i = satirBul_(rows, 'kayit', id);
      var eski = null; if (i >= 0) { try { eski = JSON.parse(birlestir_(rows[i]) || '{}'); } catch (err) { eski = {}; } }
      var data = eski ? JSON.parse(JSON.stringify(eski)) : { egitim: g.egitim, kisiler: {} };
      data.kisiler = data.kisiler || {};
      var s = { eklenen: [], cakisan: {}, o: {} }, yeni = {};
      Object.keys(gelen).forEach(function (isim) {
        if (data.kisiler[isim]) s.cakisan[isim] = data.kisiler[isim]; else yeni[isim] = gelen[isim];
      });
      if (Object.keys(yeni).length) {
        yeni = kayitKoru_(o, eski, { kisiler: yeni }).kisiler;
        Object.keys(yeni).forEach(function (k) { data.kisiler[k] = yeni[k]; s.eklenen.push(k); if (yeni[k].o) s.o[k] = yeni[k].o; });
        var metin = JSON.stringify(data);
        if (i >= 0) { satirYaz_(sh, i + 2, 'kayit', id, metin); rows[i] = ['kayit', id, '', metin]; }
        else { satirYaz_(sh, sh.getLastRow() + 1, 'kayit', id, metin); rows.push(['kayit', id, '', metin]); }
      }
      sonuc[id] = s;
    });
  });
  try { kayitSayfasiYenile_(rows); } catch (err) {}
  return sonuc;
}

/* HIZ: Birden çok kayıt belgesini tek istekte günceller (toplu onay vb.). harita: { id: kısmiVeri } */
function dbUpdateToplu(token, kol, haritaJson) {
  var o = alan_(token, 'sertifika'), harita = JSON.parse(haritaJson), rows = null;
  if (kol !== 'kayit') throw new Error('Toplu güncelleme yalnızca kayıtlar için.');
  kilitle_(function () {
    var sh = veri_(); rows = satirlar_();
    Object.keys(harita).forEach(function (id) {
      var i = satirBul_(rows, kol, id); if (i < 0) return;
      var eski = JSON.parse(birlestir_(rows[i]) || '{}');
      var yeni = kayitKoru_(o, eski, harita[id]);
      var metin = JSON.stringify(derinBirlestir_(JSON.parse(JSON.stringify(eski)), yeni));
      satirYaz_(sh, i + 2, kol, id, metin); rows[i] = [kol, id, '', metin];
    });
  });
  try { kayitSayfasiYenile_(rows); } catch (err) {}
  return true;
}

/* ================= okunabilir "Kayıt" sayfası ================= */
function kayitSayfasiYenile_(hazirSatirlar) {
  var ss = ss_(); var sh = ss.getSheetByName('Kayıt') || ss.insertSheet('Kayıt', 0);
  var bas = ['Ad Soyad', 'Eğitim', 'Course No', 'CPD Saati', 'Tarih', 'Sertifika No', 'E-posta', 'Durum', 'İptal nedeni', 'Kaynak', 'Kayıt zamanı', 'Basan', 'Telefon'];
  var out = [];
  (hazirSatirlar || satirlar_()).forEach(function (r) {
    if (r[0] !== 'kayit') return;
    var d; try { d = JSON.parse(birlestir_(r)); } catch (e) { return; }
    var k = d.kisiler || {};
    Object.keys(k).forEach(function (key) {
      var x = k[key];
      out.push([x.a || key.split('#')[0], d.egitim || '', x.c || '', x.s || '', x.t || '', x.n || '', x.e || '',
        x.iptal ? 'İPTAL' : (bekliyor_(x) ? 'ONAY BEKLİYOR' : 'GEÇERLİ'), x.iptal ? (x.iptal.neden || '') : '', x.k || '', x.z || '', x.u || '', x.p ? '0' + x.p : '']);
    });
  });
  out.sort(function (a, b) { return a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0); });
  sh.clearContents();
  sh.getRange(1, 1, 1, bas.length).setValues([bas]).setFontWeight('bold');
  if (out.length) sh.getRange(2, 1, out.length, bas.length).setNumberFormat('@').setValues(out);
  sh.setFrozenRows(1);
}

/* ================= Drive'a dosya kaydı ================= */
function pdfKaydet(token, yol, b64) {
  alan_(token, 'sertifika');
  var kok = DriveApp.getFolderById(prop_('PDF_ID'));
  var parca = String(yol).split('/').filter(String);
  var ad = parca.pop();
  var klasor = kok;
  parca.forEach(function (p) { klasor = altKlasor_(klasor, p); });
  var eski = klasor.getFilesByName(ad);
  while (eski.hasNext()) eski.next().setTrashed(true);
  var tur = /\.xlsx$/i.test(ad) ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/pdf';
  return klasor.createFile(Utilities.newBlob(Utilities.base64Decode(b64), tur, ad)).getId();
}
/* HIZ: Birden çok PDF'i tek istekte kaydeder (klasörler bir kez bulunur). liste: [{ yol, b64 }] → [id | ''] */
function pdfKaydetToplu(token, liste) {
  alan_(token, 'sertifika');
  var kok = DriveApp.getFolderById(prop_('PDF_ID')), kl = {};
  return (liste || []).map(function (x) {
    try {
      var parca = String(x.yol).split('/').filter(String), ad = parca.pop(), yol = '', klasor = kok;
      parca.forEach(function (p) { yol += '/' + p; klasor = kl[yol] || (kl[yol] = altKlasor_(klasor, p)); });
      var eski = klasor.getFilesByName(ad); while (eski.hasNext()) eski.next().setTrashed(true);
      var tur = /\.xlsx$/i.test(ad) ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/pdf';
      return klasor.createFile(Utilities.newBlob(Utilities.base64Decode(x.b64), tur, ad)).getId();
    } catch (err) { return ''; }
  });
}
function pdfKlasoruAdresi(token) { oturum_(token); return DriveApp.getFolderById(prop_('PDF_ID')).getUrl(); }
function sablonKaydet(token, ad, b64, tur) {
  yonetici_(token);
  var k = altKlasor_(DriveApp.getFolderById(prop_('UST_ID')), 'Şablon');
  return k.createFile(Utilities.newBlob(Utilities.base64Decode(b64), tur || 'image/png', ad)).getId();
}
function dosyaDataUrl(token, id) {
  alan_(token, 'sertifika');
  var b = DriveApp.getFileById(id).getBlob();
  return 'data:' + b.getContentType() + ';base64,' + Utilities.base64Encode(b.getBytes());
}

/* ================= otomatik yedek (Drive > Yedekler) ================= */
function yedekAl() {
  var ss = ss_();
  var yedekler = altKlasor_(DriveApp.getFolderById(prop_('UST_ID')), 'Yedekler');
  var ad = 'Sertifika Kayıt yedek ' + Utilities.formatDate(new Date(), 'Europe/Istanbul', 'yyyy-MM-dd HH.mm');
  DriveApp.getFileById(ss.getId()).makeCopy(ad, yedekler);
  var liste = []; var it = yedekler.getFiles();
  while (it.hasNext()) liste.push(it.next());
  liste.sort(function (a, b) { return b.getDateCreated() - a.getDateCreated(); });
  liste.slice(30).forEach(function (f) { f.setTrashed(true); });
  return ad;
}
function otomatikYedekKur() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'yedekAl') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('yedekAl').timeBased().everyDays(1).atHour(3).inTimezone('Europe/Istanbul').create();
  uyari_('Otomatik yedek kuruldu.\n\nİlk yedek: ' + yedekAl() + '\nHer gece 03:00 civarı Yedekler klasörüne yeni kopya eklenir (son 30 saklanır).');
}

/* ================= e-posta gönderimi (kuyruk: "E-posta" sayfası) =================
 * Her sertifika numarası için tek satır. Durum: BEKLİYOR → GÖNDERİLDİ / HATA / İPTAL.
 * Gönderilmiş bir sertifika, panelden "tekrar gönder" denmedikçe ikinci kez gönderilmez.
 * Gönderim sınırı: Gmail hesabı günde 100 alıcı (Google Workspace 1.500). Kalan kota her çalışmada kontrol edilir.
 */
var EP_BASLIK = ['Sertifika No', 'E-posta', 'Ad Soyad', 'Eğitim', 'Durum', 'Eklenme', 'Gönderim', 'Not', 'Deneme'];
function epostaSayfasi_() {
  var ss = ss_(), sh = ss.getSheetByName('E-posta');
  if (!sh) { sh = ss.insertSheet('E-posta'); sh.appendRow(EP_BASLIK); sh.setFrozenRows(1); sh.getRange(1, 1, 1, EP_BASLIK.length).setFontWeight('bold'); }
  return sh;
}
function epostaSatirlari_(sh) {
  var son = sh.getLastRow(); if (son < 2) return [];
  return sh.getRange(2, 1, son - 1, EP_BASLIK.length).getDisplayValues();
}
function epostaGecerli_(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || '').trim()); }
function simdi_() { return Utilities.formatDate(new Date(), 'Europe/Istanbul', 'dd.MM.yyyy HH:mm'); }

/* liste: [{n, e, isim, egitim, tekrar}] (JSON metni) */
function epostaKuyrugaEkle(token, json) {
  alan_(token, 'sertifika');
  var liste = JSON.parse(json || '[]'), sonuc = { eklendi: 0, guncellendi: 0, zatenGonderildi: 0, gecersiz: 0 };
  kilitle_(function () {
    var sh = epostaSayfasi_(), rows = epostaSatirlari_(sh), idx = {};
    rows.forEach(function (r, i) { idx[r[0]] = i; });
    var yeni = [];
    liste.forEach(function (x) {
      var n = String(x.n || '').replace(/[^0-9:]/g, ''), e = String(x.e || '').trim().toLowerCase();
      if (!n || !epostaGecerli_(e)) { sonuc.gecersiz++; return; }
      if (idx.hasOwnProperty(n)) {
        var r = rows[idx[n]];
        if (r[4] === 'GÖNDERİLDİ' && !x.tekrar && r[1] === e) { sonuc.zatenGonderildi++; return; }
        r[1] = e; r[2] = x.isim || r[2]; r[3] = x.egitim || r[3]; r[4] = 'BEKLİYOR'; r[5] = simdi_(); r[7] = ''; r[8] = '0';
        sh.getRange(idx[n] + 2, 1, 1, EP_BASLIK.length).setNumberFormat('@').setValues([r]);
        sonuc.guncellendi++;
      } else {
        idx[n] = -1;
        yeni.push([n, e, x.isim || '', x.egitim || '', 'BEKLİYOR', simdi_(), '', '', '0']);
      }
    });
    if (yeni.length) sh.getRange(sh.getLastRow() + 1, 1, yeni.length, EP_BASLIK.length).setNumberFormat('@').setValues(yeni);
    sonuc.eklendi = yeni.length;
  });
  return sonuc;
}
function epostaTetikVar_() { return ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'kuyruguIsle'; }); }
function epostaDurum(token) {
  alan_(token, 'sertifika');
  var rows = epostaSatirlari_(epostaSayfasi_()), say = { 'BEKLİYOR': 0, 'GÖNDERİLDİ': 0, 'HATA': 0, 'İPTAL': 0 };
  rows.forEach(function (r) { say[r[4]] = (say[r[4]] || 0) + 1; });
  var hatalar = rows.filter(function (r) { return r[4] === 'HATA'; }).slice(-15).map(function (r) { return { n: r[0], e: r[1], isim: r[2], not: r[7] }; });
  var kota = -1; try { kota = MailApp.getRemainingDailyQuota(); } catch (err) {}
  // Gönderim listesi: her satırın durumu + onay bekleyen sertifika bilgisi (bunlar onaylanana kadar gönderilmez)
  var onayda = {};
  satirlar_().forEach(function (v) {
    if (v[0] !== 'kayit') return; var d; try { d = JSON.parse(birlestir_(v)); } catch (err) { return; }
    var ks = d.kisiler || {}; Object.keys(ks).forEach(function (key) { if (ks[key].n && bekliyor_(ks[key])) onayda[String(ks[key].n)] = 1; });
  });
  var liste = rows.map(function (r, i) { return { s: i, n: r[0], e: r[1], isim: r[2], egitim: r[3], d: r[4], ek: r[5], gn: r[6], not: r[7], o: onayda[r[0]] ? 1 : 0 }; });
  return { sayilar: say, toplam: rows.length, kota: kota, otomatik: epostaTetikVar_(), hatalar: hatalar, liste: liste, son: prop_('EP_SON') || '', simdi: new Date().toISOString(), saatlik: Math.max(1, Math.min(100, Number((ayarOku_(satirlar_(), 'eposta') || {}).saatlik) || 10)) };
}
function epostaOtomatik(token, acik) {
  yonetici_(token);
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'kuyruguIsle') ScriptApp.deleteTrigger(t); });
  if (acik) ScriptApp.newTrigger('kuyruguIsle').timeBased().everyHours(1).create();
  return epostaTetikVar_();
}
function epostaSimdiGonder(token, hatalariDa) {
  yonetici_(token);
  if (hatalariDa) {
    kilitle_(function () {
      var sh = epostaSayfasi_(), rows = epostaSatirlari_(sh);
      rows.forEach(function (r, i) { if (r[4] === 'HATA') sh.getRange(i + 2, 5).setValue('BEKLİYOR'); });
    });
  }
  return kuyruguIsle();
}
/* E-posta izni vermek için Apps Script'te bir kez çalıştırın (üstteki listeden seçip ▶ Çalıştır). */
function epostaYetkiVer() {
  var t = ScriptApp.getProjectTriggers().length, al = GmailApp.getAliases();
  Logger.log('E-posta izni verildi. Bugün kalan gönderim hakkı: ' + MailApp.getRemainingDailyQuota() + ' · tetikleyici sayısı: ' + t +
    ' · gönderen olarak kullanılabilecek adresler: ' + (al.length ? al.join(', ') : '(yok — Gmail ayarlarından "Postaları şu adresten gönder" ile ekleyin)'));
}
/* Gönderen adresi: Ayarlar'da seçilen adres, Gmail'de "Postaları şu adresten gönder" olarak ekli ve onaylı olmalıdır. */
function gonder_(sec, ayar) {
  var adres = String((ayar && ayar.adres) || 'ogrenciisleriprimecampus@gmail.com').trim().toLowerCase();
  if (adres) {
    var al = GmailApp.getAliases().map(function (a) { return String(a).toLowerCase(); });
    if (al.indexOf(adres) < 0) throw new Error('Gönderen adresi (' + adres + ') Gmail hesabında "Postaları şu adresten gönder" olarak ekli değil.');
    var o = { htmlBody: sec.htmlBody, name: sec.name, from: adres };
    if (sec.replyTo) o.replyTo = sec.replyTo;
    if (sec.attachments) o.attachments = sec.attachments;
    GmailApp.sendEmail(sec.to, sec.subject, sec.body, o);
    return;
  }
  MailApp.sendEmail(sec);
}
function epostaTakmaAdlar(token) {
  yonetici_(token);
  var ana = ''; try { ana = Session.getEffectiveUser().getEmail(); } catch (err) {}
  var al = []; try { al = GmailApp.getAliases(); } catch (err) { return { ana: ana, takma: [], hata: 'İzin gerekli: Apps Script\'te epostaYetkiVer fonksiyonunu çalıştırın.' }; }
  return { ana: ana, takma: al };
}

function slug_(s) {
  var tr = { 'Ç': 'C', 'ç': 'c', 'Ğ': 'G', 'ğ': 'g', 'İ': 'I', 'ı': 'i', 'Ö': 'O', 'ö': 'o', 'Ş': 'S', 'ş': 's', 'Ü': 'U', 'ü': 'u', 'Â': 'A', 'â': 'a', 'Î': 'I', 'î': 'i', 'Û': 'U', 'û': 'u' };
  return String(s || '').replace(/[ÇçĞğİıÖöŞşÜüÂâÎîÛû]/g, function (ch) { return tr[ch]; }).normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}
function pdfBul_(k) {
  try {
    var no = adlerMi_(k.egitim) ? 'ADLER' : String(k.c || '').split('-')[1] || '';
    var kok = DriveApp.getFolderById(prop_('PDF_ID')), kl = kok.getFoldersByName(no + '_' + slug_(k.egitim));
    if (!kl.hasNext()) return null;
    var it = kl.next().getFilesByName(slug_(k.isim) + '_' + slug_(k.egitim) + '.pdf');
    while (it.hasNext()) { var f = it.next(); if (!f.isTrashed()) return f; }
  } catch (err) {}
  return null;
}
function ayarOku_(rows, id) { var i = satirBul_(rows, 'ayarlar', id); if (i < 0) return null; try { return JSON.parse(birlestir_(rows[i])); } catch (err) { return null; } }
function htmlKac_(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function epostaMetni_(k, ayar, link, telif) {
  var yer = function (s) { return String(s || '').replace(/\{AD\}/g, k.isim).replace(/\{EGITIM\}/g, k.egitim).replace(/\{NO\}/g, k.n); };
  var adler = adlerMi_(k.egitim);
  var konu = adler ? yer('Adler Sertifikanız · {EGITIM}') : yer(ayar.konu || 'CPD Sertifikanız · {EGITIM}');
  var giris = adler ? yer('Sayın {AD},\n\n{EGITIM} eğitimini başarıyla tamamladınız. Katılım sertifikanız ektedir. Sertifikanızı aşağıdaki bağlantıdan da görüntüleyebilir, doğrulayabilir ve indirebilirsiniz.')
    : yer(ayar.metin || 'Sayın {AD},\n\n{EGITIM} eğitimini başarıyla tamamladınız. CPD sertifikanız ektedir. Sertifikanızı aşağıdaki bağlantıdan da görüntüleyebilir, doğrulayabilir ve indirebilirsiniz.');
  var satir = function (a, b) { return '<tr><td style="padding:6px 12px 6px 0;color:#536471">' + a + '</td><td style="padding:6px 0;font-weight:600">' + htmlKac_(b) + '</td></tr>'; };
  var html = '<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#0f1419;line-height:1.5">' +
    '<div style="background:#021e42;color:#fff;padding:18px 22px;border-radius:12px 12px 0 0;font-size:20px;font-weight:700;letter-spacing:.5px">PRIME CAMPUS</div>' +
    '<div style="border:1px solid #e1e8ed;border-top:0;border-radius:0 0 12px 12px;padding:22px">' +
    '<p style="margin:0 0 16px">' + htmlKac_(giris).replace(/\n/g, '<br>') + '</p>' +
    '<table style="border-collapse:collapse;font-size:14px;margin:0 0 18px">' + satir('Eğitim', k.egitim) + (adler ? satir('Eğitim süresi', (k.s || 150) + ' saat') : satir('Course No', k.c) + satir('CPD saati', k.s)) + satir('Tarih', k.t) + satir('Sertifika No', k.n) + '</table>' +
    '<a href="' + htmlKac_(link) + '" style="display:inline-block;background:#1d9bf0;color:#fff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:999px">Sertifikamı görüntüle ve indir</a>' +
    '<p style="margin:22px 0 0;font-size:12px;color:#536471">' + htmlKac_(telif) + '</p></div></div>';
  var duz = giris + '\n\nEğitim: ' + k.egitim + (adler ? '\nEğitim süresi: ' + (k.s || 150) + ' saat' : '\nCourse No: ' + k.c + '\nCPD saati: ' + k.s) + '\nTarih: ' + k.t + '\nSertifika No: ' + k.n + '\n\nSertifikanız: ' + link + '\n\n' + telif;
  return { konu: konu, html: html, duz: duz };
}

/* Kuyruktaki BEKLİYOR satırları gönderir (saatlik tetikleyici ve "Şimdi gönder" bunu çağırır). */
function kuyruguIsle(e) {
  // Gönderim sırasında kayıt/basım işlemleri beklemesin diye ayrı bir "gönderim sürüyor" işareti kullanılır.
  var c = CacheService.getScriptCache(), mesgul = false;
  kilitle_(function () { if (c.get('ep_suruyor')) mesgul = true; else c.put('ep_suruyor', '1', 330); });
  if (mesgul) return { gonderilen: 0, mesaj: 'Başka bir gönderim sürüyor; birkaç dakika sonra tekrar deneyin.' };
  // Yalnızca saatlik tetikleyici çalıştığında kaydedilir; panel bir sonraki otomatik gönderimin saatini buradan tahmin eder.
  if (e && e.triggerUid) { try { PropertiesService.getScriptProperties().setProperty('EP_SON', new Date().toISOString()); } catch (err) {} }
  var bas = Date.now(), gonderilen = 0, hata = 0;
  try {
    var kota = MailApp.getRemainingDailyQuota();
    var sh = epostaSayfasi_(), rows = epostaSatirlari_(sh);
    var bekleyen = []; rows.forEach(function (r, i) { if (r[4] === 'BEKLİYOR') bekleyen.push(i); });
    if (!bekleyen.length || kota <= 0) return { gonderilen: 0, kalan: bekleyen.length, kota: kota, mesaj: kota <= 0 ? 'Bugünkü gönderim hakkı doldu; yarın otomatik devam eder.' : 'Bekleyen e-posta yok.' };
    var vr = satirlar_(), kayit = {};
    vr.forEach(function (r) {
      if (r[0] !== 'kayit') return;
      var d; try { d = JSON.parse(birlestir_(r)); } catch (err) { return; }
      var ks = d.kisiler || {};
      Object.keys(ks).forEach(function (key) { var x = ks[key]; if (x.n) kayit[String(x.n)] = { isim: x.a || key.split('#')[0], egitim: d.egitim || '', c: x.c || '', s: x.s || '', t: x.t || '', n: String(x.n), iptal: !!x.iptal, bekliyor: bekliyor_(x) }; });
    });
    var ayar = ayarOku_(vr, 'eposta') || {}, qr = ayarOku_(vr, 'qr') || {}, tl = ayarOku_(vr, 'telif') || {};
    // Saatlik sınır: son ~1 saatte kuyruktan gönderilenler sayılır (elle tek tek gönderilenler hariç); en fazla "saatlik" kadar gider.
    var saatlik = Math.max(1, Math.min(100, Number(ayar.saatlik) || 10));
    var esik = Utilities.formatDate(new Date(Date.now() - 55 * 60000), 'Europe/Istanbul', 'yyyyMMddHHmm'), sonSaat = 0;
    rows.forEach(function (r) { var m = String(r[6] || '').match(/^(\d{2})\.(\d{2})\.(\d{4}) (\d{2}):(\d{2})/); if (r[4] === 'GÖNDERİLDİ' && String(r[7]).indexOf('Elle gönderildi') !== 0 && m && (m[3] + m[2] + m[1] + m[4] + m[5]) > esik) sonSaat++; });
    var hak = saatlik - sonSaat;
    if (hak <= 0) return { gonderilen: 0, kalan: bekleyen.length, kota: kota, mesaj: 'Bu saatin gönderim sınırı (' + saatlik + ' e-posta) doldu; kalanlar sonraki saatlerde otomatik gider.' };
    var adres = qr.adres || (ScriptApp.getService().getUrl() + '?dogrula={NO}');
    var telif = tl.metin || '© 2026 Prime Campus bir Lion Academy Eğitim Danışmanlık A.Ş. markasıdır.';
    for (var j = 0; j < bekleyen.length; j++) {
      if (kota <= 0 || hak <= 0 || Date.now() - bas > 270000) break;
      var i = bekleyen[j], r = rows[i], k = kayit[r[0]];
      if (!k) { r[4] = 'HATA'; r[7] = 'Kayıtta bu sertifika numarası yok.'; hata++; }
      else if (k.iptal) { r[4] = 'İPTAL'; r[7] = 'Sertifika iptal edilmiş; gönderilmedi.'; }
      else if (k.bekliyor) { continue; }
      else {
        try {
          var link = adres.replace(/\{NO\}/g, encodeURIComponent(k.n)), m = epostaMetni_(k, ayar, link, telif), pdf = pdfBul_(k);
          var sec = { to: r[1], subject: m.konu, body: m.duz, htmlBody: m.html, name: ayar.gonderen || 'Prime Campus' };
          if (ayar.yanit && epostaGecerli_(ayar.yanit)) sec.replyTo = ayar.yanit;
          if (pdf) sec.attachments = [pdf.getBlob().setName(slug_(k.isim) + '_' + slug_(k.egitim) + '.pdf')];
          gonder_(sec, ayar);
          r[4] = 'GÖNDERİLDİ'; r[6] = simdi_(); r[7] = pdf ? '' : 'PDF eki bulunamadı; yalnızca bağlantı gönderildi.'; kota--; hak--; gonderilen++;
        } catch (err) {
          r[8] = String(Number(r[8] || 0) + 1); r[4] = 'HATA'; r[7] = String((err && err.message) || err).slice(0, 200); hata++;
        }
      }
      sh.getRange(i + 2, 1, 1, EP_BASLIK.length).setNumberFormat('@').setValues([r]);
    }
    var kalan = 0; rows.forEach(function (r) { if (r[4] === 'BEKLİYOR') kalan++; });
    return { gonderilen: gonderilen, hata: hata, kalan: kalan, kota: kota, saatlik: saatlik };
  } finally { c.remove('ep_suruyor'); }
}

/* ================= tek sertifikayı hemen e-postayla gönder (Kayıtlar > "E-posta ile gönder") ================= */
function epostaTekGonder(token, no, eposta) {
  alan_(token, 'sertifika');
  no = String(no || '').replace(/[^0-9:]/g, ''); eposta = String(eposta || '').trim().toLowerCase();
  if (!no) throw new Error('Sertifika numarası yok.');
  if (!epostaGecerli_(eposta)) throw new Error('E-posta adresi geçersiz.');
  var vr = satirlar_(), k = null;
  vr.some(function (r) {
    if (r[0] !== 'kayit') return false;
    var d; try { d = JSON.parse(birlestir_(r)); } catch (err) { return false; }
    var ks = d.kisiler || {};
    return Object.keys(ks).some(function (key) {
      var x = ks[key]; if (String(x.n) !== no) return false;
      k = { isim: x.a || key.split('#')[0], egitim: d.egitim || '', c: x.c || '', s: x.s || '', t: x.t || '', n: String(x.n), iptal: !!x.iptal, bekliyor: bekliyor_(x) };
      return true;
    });
  });
  if (!k) throw new Error('Kayıtta bu sertifika yok.');
  if (k.iptal) throw new Error('İptal edilmiş sertifika gönderilemez.');
  if (k.bekliyor) throw new Error('Onay bekleyen sertifika gönderilemez.');
  var kota = MailApp.getRemainingDailyQuota();
  if (kota <= 0) throw new Error('Bugünkü e-posta gönderim hakkı doldu; yarın tekrar deneyin.');
  var ayar = ayarOku_(vr, 'eposta') || {}, qr = ayarOku_(vr, 'qr') || {}, tl = ayarOku_(vr, 'telif') || {};
  var adres = qr.adres || (ScriptApp.getService().getUrl() + '?dogrula={NO}');
  var telif = tl.metin || '© 2026 Prime Campus bir Lion Academy Eğitim Danışmanlık A.Ş. markasıdır.';
  var link = adres.replace(/\{NO\}/g, encodeURIComponent(k.n)), m = epostaMetni_(k, ayar, link, telif), pdf = pdfBul_(k);
  var sec = { to: eposta, subject: m.konu, body: m.duz, htmlBody: m.html, name: ayar.gonderen || 'Prime Campus' };
  if (ayar.yanit && epostaGecerli_(ayar.yanit)) sec.replyTo = ayar.yanit;
  if (pdf) sec.attachments = [pdf.getBlob().setName(slug_(k.isim) + '_' + slug_(k.egitim) + '.pdf')];
  gonder_(sec, ayar);
  // gönderim kaydını "E-posta" sayfasına işle (kuyrukta varsa güncelle)
  kilitle_(function () {
    var sh = epostaSayfasi_(), rows = epostaSatirlari_(sh), i = -1;
    rows.forEach(function (r, j) { if (r[0] === k.n) i = j; });
    var satir = [k.n, eposta, k.isim, k.egitim, 'GÖNDERİLDİ', simdi_(), simdi_(), 'Elle gönderildi' + (pdf ? '' : ' (PDF eki yok)'), '0'];
    if (i >= 0) sh.getRange(i + 2, 1, 1, EP_BASLIK.length).setNumberFormat('@').setValues([satir]);
    else sh.getRange(sh.getLastRow() + 1, 1, 1, EP_BASLIK.length).setNumberFormat('@').setValues([satir]);
  });
  return { gonderildi: true, ek: !!pdf, kalan: kota - 1 };
}

/* ================= İbraname: sertifikalardan bağımsız metin + dijital onay (SMS kodu) =================
 * Metin: Veri > ayarlar/ibraname {baslik, metin, surum, z, gecmis:[{surum, baslik, metin, z}]}
 * Kişiler elle / Excel ile girilir (ad soyad, telefon, e-posta, isteğe bağlı program). Sertifika kayıtlarına bağlı değildir.
 * "İbraname" sayfası: her satır = bir kişiye gönderilen tek kullanımlık bağlantı.
 */
var IB_BASLIK = ['Anahtar', 'Ad Soyad', 'Telefon', 'E-posta', 'Program', 'Marka', 'Sürüm', 'Durum', 'Gönderim', 'Onay zamanı', 'Onay kanalı', 'Metin özeti', 'Not', 'IP adresi', 'Cihaz / tarayıcı', 'İlk görülme', 'Son görülme', 'Görülme sayısı', 'Görülme IP', 'Kimlik türü', 'Kimlik no', 'Doğum tarihi', 'Adres', 'Tekrar gönderim', 'Bilgi güncelleme'];
var IB = { A: 0, AD: 1, TEL: 2, EP: 3, PRG: 4, MRK: 5, SUR: 6, DUR: 7, GON: 8, ONAY: 9, KANAL: 10, OZET: 11, NOT: 12, IP: 13, UA: 14, G1: 15, GS: 16, GN: 17, GIP: 18, KT: 19, KN: 20, DT: 21, ADR: 22, TKR: 23, GNC: 24 };
/* satırı başlık genişliğine tamamlar (sütun sayısı uyuşmazlığı hatasını önler) */
function ibSatirDoldur_(d) { while (d.length < IB_BASLIK.length) d.push(''); return d.slice(0, IB_BASLIK.length); }
/* Kimlik: Türk vatandaşı → T.C. kimlik no (11 hane, algoritma kontrollü); yabancı → pasaport no. Biri zorunlu.
 * Doğum tarihi (gg.aa.yyyy) ve adres de onayda zorunludur. Gönderirken doldurulabilir; kişi onaylarken tamamlar/düzeltir. */
function tcGecerli_(t) {
  t = String(t || '').replace(/\D/g, ''); if (!/^[1-9]\d{10}$/.test(t)) return false;
  var d = t.split('').map(Number), on = ((d[0] + d[2] + d[4] + d[6] + d[8]) * 7 - (d[1] + d[3] + d[5] + d[7])) % 10;
  if ((on + 10) % 10 !== d[9]) return false;
  return d.slice(0, 10).reduce(function (a, b) { return a + b; }, 0) % 10 === d[10];
}
function ibKimlikNorm_(tur, no) {
  var n = String(no || '').toUpperCase().replace(/[\s.\-]/g, '');
  if (!n) return { tur: '', no: '' };
  if (tur !== 'pasaport' && /^\d{11}$/.test(n)) return tcGecerli_(n) ? { tur: 'tc', no: n } : { hata: 'T.C. kimlik numarası geçersiz' };
  if (tur === 'tc') return { hata: 'T.C. kimlik numarası 11 haneli olmalı' };
  return /^[A-Z0-9]{5,20}$/.test(n) ? { tur: 'pasaport', no: n } : { hata: 'Pasaport numarası geçersiz (5-20 harf/rakam)' };
}
function ibTarihNorm_(t) {
  var s = String(t || '').trim(), m, g, a, y;
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) { y = +m[1]; a = +m[2]; g = +m[3]; }
  else if ((m = s.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})$/))) { g = +m[1]; a = +m[2]; y = +m[3]; }
  else return '';
  var dt = new Date(Date.UTC(y, a - 1, g));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== a - 1 || dt.getUTCDate() !== g || y < 1900 || dt.getTime() > Date.now()) return '';
  return ('0' + g).slice(-2) + '.' + ('0' + a).slice(-2) + '.' + y;
}
function ibKimlikYazi_(tur, no) { return !no ? '' : (tur === 'pasaport' ? 'Pasaport No: ' : 'T.C. Kimlik No: ') + no; }
function ibKimlikGizle_(no) { no = String(no || ''); return no.length > 5 ? no.slice(0, 3) + '*'.repeat(no.length - 5) + no.slice(-2) : no; }
/* Durumlar: GÖNDERİLDİ (henüz açılmadı) → GÖRÜLDÜ (kişi bağlantıyı açtı) → ONAYLANDI ; ya da İPTAL */
/* İbranamenin hangi markadan gönderildiği (karşı taraf sayfada, SMS'te ve e-postada bu markayı görür) */
var IB_MARKALAR = { prime: 'Prime Campus', tiger: 'Tiger Master' };
/* İbraname telefonu: Türkiye cep (5xxxxxxxxx) ya da yurt dışı (+ülke kodu, ör. +491511234567). Türkiye sabit hattı kabul edilmez. */
function ibTelNorm_(t) {
  var s = String(t || '').trim(), tr = telNorm_(s); if (tr) return tr;
  var d = s.replace(/[^\d+]/g, '');
  if (/^\+/.test(d)) d = d.slice(1); else if (/^00/.test(d)) d = d.slice(2); else return '';
  if (/^90/.test(d)) return '';
  return /^[1-9]\d{7,14}$/.test(d) ? '+' + d : '';
}
/* Netgsm'e gidecek numara: TR olduğu gibi, yurt dışı 00 + ülke kodu (gerekirse IBRA_YD_ONEK özelliğiyle değiştirilebilir) */
function ibNetgsmNo_(t) { return /^\+/.test(t) ? (PropertiesService.getScriptProperties().getProperty('IBRA_YD_ONEK') || '00') + t.slice(1) : t; }
function ibTelGoster_(t) { return !t ? '' : /^\+/.test(t) ? t : '0' + t; }
function ibTelGizle_(t) { return !t ? '' : /^\+/.test(t) ? t.slice(0, 4) + ' *** ' + t.slice(-3) : telGizle_(t); }
/* Markaya göre SMS hesabı: Prime Campus → ana Netgsm hesabı (PRIMECAMPUS başlığı); Tiger Master → ibraname hesabı (IBRA_…) */
function ibSmsOnek_(marka) { return ibMarka_(marka) === 'prime' ? '' : 'IBRA_'; }
function ibSmsBaslik_(marka) { return PropertiesService.getScriptProperties().getProperty(ibSmsOnek_(marka) + 'NETGSM_BASLIK') || ''; }
function ibMarka_(m) { m = String(m || '').toLowerCase(); return IB_MARKALAR[m] ? m : 'prime'; }
function ibraSayfasi_() {
  var ss = ss_(), sh = ss.getSheetByName('İbraname');
  if (!sh) { sh = ss.insertSheet('İbraname'); sh.appendRow(IB_BASLIK); sh.setFrozenRows(1); sh.getRange(1, 1, 1, IB_BASLIK.length).setFontWeight('bold'); }
  else if (sh.getLastColumn() < IB_BASLIK.length) sh.getRange(1, 1, 1, IB_BASLIK.length).setValues([IB_BASLIK]).setFontWeight('bold'); // eski sayfaya "görülme" sütunları eklenir
  return sh;
}
function ibraSatirlari_(sh) { var son = sh.getLastRow(); return son < 2 ? [] : sh.getRange(2, 1, son - 1, IB_BASLIK.length).getDisplayValues(); }
function ibraAyar_() {
  var c = CacheService.getScriptCache(), k = 'ibraAyar_' + veriSurum_(), j = c.get(k);
  if (j) { try { return JSON.parse(j); } catch (err) {} }
  var a = ayarOku_(satirlar_(), 'ibraname');
  try { var s = JSON.stringify(a); if (Utilities.newBlob(s).getBytes().length < 95000) c.put(k, s, 21600); } catch (err) {}
  return a;
}
function ibraSurumMetni_(ayar, surum) {
  if (!ayar) return null; surum = Number(surum);
  if (Number(ayar.surum) === surum) return { baslik: ayar.baslik, metin: ayar.metin };
  var g = (ayar.gecmis || []).filter(function (x) { return Number(x.surum) === surum; })[0];
  return g ? { baslik: g.baslik, metin: g.metin } : { baslik: ayar.baslik, metin: ayar.metin };
}
function ibraDoldur_(s, r, kimlikDe) {
  s = String(s || '');
  // kimlikDe: true → tüm alanlar doldurulur; 'dolu' → yalnızca kayıtlı olanlar (eksikler kişinin dolduracağı yer tutucu olarak kalır)
  if (kimlikDe) {
    var yer = function (re, v) { if (v || kimlikDe === true) s = s.replace(re, v || ''); };
    yer(/\{KIMLIK\}/g, ibKimlikYazi_(r[IB.KT], r[IB.KN])); yer(/\{KIMLIKNO\}/g, r[IB.KN]); yer(/\{DOGUM\}/g, r[IB.DT]); yer(/\{ADRES\}/g, r[IB.ADR]);
  }
  return s.replace(/\{MARKA\}/g, IB_MARKALAR[ibMarka_(r[IB.MRK])]).replace(/\{AD\}/g, r[IB.AD] || '').replace(/\{PROGRAM\}/g, r[IB.PRG] || '')
    .replace(/\{BUGUN\}/g, Utilities.formatDate(new Date(), 'Europe/Istanbul', 'dd.MM.yyyy'));
}
/* İbraname bağlantı adresi — sertifika doğrulama (QR) adresinden BAĞIMSIZDIR.
 * (QR/doğrulama bağlantıları Rany'ye yönlendirilse bile ibraname bağlantıları kendi sayfasına gider.)
 * Ayar: İbraname > Bağlantı adresi (ayarlar/ibraLink). Boşsa Apps Script adresi kullanılır (her zaman çalışır).
 * Adreste {ANAHTAR} varsa yerine konur; yoksa ?ibra=… eklenir. */
var IB_LINK_;
function ibraLinkAyar_() {
  if (IB_LINK_ !== undefined) return IB_LINK_; // listede her satır için tabloyu yeniden okumamak için
  var a = null; try { a = ayarOku_(satirlar_(), 'ibraLink'); } catch (err) {}
  IB_LINK_ = a && /^https:\/\//.test(String(a.adres || '')) ? String(a.adres).trim() : '';
  return IB_LINK_;
}
function ibraAdres_(anahtar) {
  var t = ibraLinkAyar_();
  if (!t) return ScriptApp.getService().getUrl() + '?ibra=' + anahtar;
  if (t.indexOf('{ANAHTAR}') >= 0) return t.replace(/\{ANAHTAR\}/g, anahtar);
  return t + (t.indexOf('?') < 0 ? '?' : '&') + 'ibra=' + anahtar;
}
/* Yönetici: ibraname bağlantı adresini kaydeder. Boş adres → varsayılan (Apps Script). */
function ibraLinkKaydet(token, adres) {
  alan_(token, 'ibra');
  adres = String(adres || '').trim();
  if (adres && !/^https:\/\/[^\s]+$/.test(adres)) throw new Error('Adres https:// ile başlamalı ve boşluk içermemeli.');
  if (adres && /rany\./i.test(adres)) throw new Error('Rany adresi ibraname sayfasını açamaz. Ibraname için sertifikaprimecampus.online sayfasını ya da varsayılan (Google) adresi kullanın.');
  kilitle_(function () {
    var sh = veri_(), rows = satirlar_(), i = satirBul_(rows, 'ayarlar', 'ibraLink');
    satirYaz_(sh, i < 0 ? sh.getLastRow() + 1 : i + 2, 'ayarlar', 'ibraLink', JSON.stringify({ adres: adres, z: new Date().toISOString() }));
  });
  IB_LINK_ = undefined;
  return { adres: adres, ornek: ibraAdres_('ORNEK') };
}
/* Yönetici: metni kaydet (her kayıtta sürüm artar; gönderilmiş bağlantılar kendi sürümünü gösterir) */
function ibraMetinKaydet(token, json) {
  alan_(token, 'ibra');
  var y = JSON.parse(json || '{}'), baslik = String(y.baslik || '').trim().slice(0, 200), metin = String(y.metin || '').trim();
  if (!baslik || metin.length < 20) throw new Error('Başlık ve en az birkaç cümlelik metin gerekli.');
  if (metin.length > 30000) throw new Error('Metin çok uzun (en fazla 30.000 karakter).');
  var sonuc;
  kilitle_(function () {
    var sh = veri_(), rows = satirlar_(), i = satirBul_(rows, 'ayarlar', 'ibraname'), es = i < 0 ? null : JSON.parse(birlestir_(rows[i]) || 'null');
    if (es && es.baslik === baslik && es.metin === metin) { sonuc = es.surum; return; }
    var gecmis = (es && es.gecmis) || []; if (es) gecmis.push({ surum: es.surum, baslik: es.baslik, metin: es.metin, z: es.z });
    var yeni = { baslik: baslik, metin: metin, surum: (es ? Number(es.surum) : 0) + 1, z: new Date().toISOString(), gecmis: gecmis.slice(-20) };
    satirYaz_(sh, i < 0 ? sh.getLastRow() + 1 : i + 2, 'ayarlar', 'ibraname', JSON.stringify(yeni));
    sonuc = yeni.surum;
  });
  return sonuc;
}
/* Yönetici: liste + güncel metin */
function ibraListe(token) {
  alan_(token, 'ibra');
  var a = ibraAyar_(), rows = ibraSatirlari_(ibraSayfasi_());
  return { linkAyar: { adres: ibraLinkAyar_(), varsayilan: ScriptApp.getService().getUrl(), ornek: ibraAdres_('ORNEK') }, ayar: a ? { baslik: a.baslik, metin: a.metin, surum: a.surum, z: a.z } : null, sms: netgsmBagli_('IBRA_') || netgsmBagli_(''), smsBaslik: ibSmsBaslik_('tiger'), smsMarka: { prime: { bagli: netgsmBagli_(ibSmsOnek_('prime')), baslik: ibSmsBaslik_('prime') }, tiger: { bagli: netgsmBagli_(ibSmsOnek_('tiger')), baslik: ibSmsBaslik_('tiger') } }, markalar: IB_MARKALAR,
    liste: rows.map(function (r) { return { a: r[IB.A], isim: r[IB.AD], tel: ibTelGoster_(r[IB.TEL]), e: r[IB.EP], program: r[IB.PRG], marka: ibMarka_(r[IB.MRK]), surum: r[IB.SUR], d: r[IB.DUR], gn: r[IB.GON], oz: r[IB.ONAY], kanal: r[IB.KANAL], ozet: r[IB.OZET], ip: r[IB.IP], ua: r[IB.UA], not: r[IB.NOT], g1: r[IB.G1], gs: r[IB.GS], gsay: Number(r[IB.GN] || 0), gip: r[IB.GIP], kt: r[IB.KT], kn: ibKimlikGizle_(r[IB.KN]), dt: r[IB.DT], adr: r[IB.ADR], tkr: r[IB.TKR], gnc: r[IB.GNC], knVar: !!r[IB.KN], link: ibraAdres_(r[IB.A]) }; }) };
}
/* Yönetici: kişilere onay bağlantısı gönder.
 * liste: [{isim, tel, eposta, program}] ; kanal: sms | eposta | ikisi | yok (yalnızca bağlantı oluştur) ; marka: prime | tiger */
function ibraGonder(token, json, kanal, marka) {
  alan_(token, 'ibra'); marka = ibMarka_(marka); var markaAd = IB_MARKALAR[marka];
  var a = ibraAyar_(); if (!a) throw new Error('Önce ibraname metnini kaydedin.');
  var liste = JSON.parse(json || '[]'); kanal = String(kanal || 'sms');
  if (liste.length > 500) throw new Error('Tek seferde en fazla 500 kişi.');
  var sonuc = { olusturuldu: 0, sms: 0, eposta: 0, atlandi: 0, hatalar: [] };
  var sh = ibraSayfasi_(), varMi = {};
  ibraSatirlari_(sh).forEach(function (r) { if (r[IB.DUR] !== 'İPTAL' && Number(r[IB.SUR]) === Number(a.surum) && ibMarka_(r[IB.MRK]) === marka) varMi[r[IB.TEL] || r[IB.EP]] = 1; });
  var ayarE = ayarOku_(satirlar_(), 'eposta') || {};
  liste.forEach(function (x) {
    var isim = String(x.isim || '').replace(/\s+/g, ' ').trim().slice(0, 120), tel = ibTelNorm_(x.tel), ep = String(x.eposta || '').trim().toLowerCase(), prg = String(x.program || '').trim().slice(0, 160);
    if (!isim) { sonuc.hatalar.push('Adı olmayan satır atlandı'); return; }
    var kim = ibKimlikNorm_(x.kimlikTur, x.kimlikNo); if (kim.hata) { sonuc.hatalar.push(isim + ': ' + kim.hata); return; }
    var dog = ibTarihNorm_(x.dogum), adr = String(x.adres || '').replace(/\s+/g, ' ').trim().slice(0, 300);
    if (ep && !epostaGecerli_(ep)) ep = '';
    if (!tel && !ep) { sonuc.hatalar.push(isim + ': telefon ya da e-posta yok'); return; }
    var kimlik = tel || ep; if (varMi[kimlik]) { sonuc.atlandi++; return; }
    varMi[kimlik] = 1;
    var anahtar = Utilities.getUuid().replace(/-/g, ''), link = ibraAdres_(anahtar), not = [];
    sh.getRange(sh.getLastRow() + 1, 1, 1, IB_BASLIK.length).setNumberFormat('@').setValues([ibSatirDoldur_([anahtar, isim, tel, ep, prg, marka, String(a.surum), 'GÖNDERİLDİ', simdi_(), '', '', '', '', '', '', '', '', '', '', kim.tur, kim.no, dog, adr])]);
    sonuc.olusturuldu++;
    var g = ibBildir_({ isim: isim, tel: tel, ep: ep, link: link, baslik: a.baslik, marka: marka }, kanal, ayarE);
    sonuc.sms += g.sms; sonuc.eposta += g.eposta;
    if (g.not.length) sh.getRange(sh.getLastRow(), IB.NOT + 1).setValue(g.not.join(' · ').slice(0, 300));
  });
  return sonuc;
}
/* Onay bağlantısını SMS ve/veya e-postayla iletir. k: {isim, tel, ep, link, baslik, marka} ; kanal: sms | eposta | ikisi | yok */
function ibBildir_(k, kanal, ayarE, tekrar) {
  var o = { sms: 0, eposta: 0, not: [] }, markaAd = IB_MARKALAR[ibMarka_(k.marka)], onek = ibSmsOnek_(k.marka);
  if ((kanal === 'sms' || kanal === 'ikisi') && k.tel) {
    if (!netgsmBagli_(onek)) o.not.push('SMS: ' + markaAd + ' SMS hesabı bağlı değil');
    else {
      try { netgsmGonder_(ibNetgsmNo_(k.tel), (tekrar ? 'Hatirlatma: ' : '') + 'Sayin ' + k.isim + ', ' + markaAd + ' tarafindan gonderilen ' + k.baslik + ' belgesini okuyup onaylamaniz icin: ' + k.link + ' - ' + markaAd, onek); o.sms = 1; }
      catch (err) { o.not.push('SMS: ' + err.message); }
    }
  }
  if ((kanal === 'eposta' || kanal === 'ikisi') && k.ep) {
    try {
      var html = '<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f1419;line-height:1.5"><div style="background:#0f172a;color:#fff;padding:18px 22px;border-radius:12px 12px 0 0;font-size:20px;font-weight:700">' + htmlKac_(markaAd.toUpperCase()) + '</div><div style="border:1px solid #e1e8ed;border-top:0;border-radius:0 0 12px 12px;padding:22px"><p>Sayın ' + htmlKac_(k.isim) + ',</p><p>' + (tekrar ? 'Hatırlatma: ' : '') + htmlKac_(markaAd) + ' tarafından gönderilen <b>' + htmlKac_(k.baslik) + '</b> belgesini okuyup dijital olarak onaylamanızı rica ederiz.</p><a href="' + htmlKac_(k.link) + '" style="display:inline-block;background:#1d9bf0;color:#fff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:999px">Belgeyi oku ve onayla</a></div></div>';
      gonder_({ to: k.ep, subject: (tekrar ? 'Hatırlatma · ' : '') + k.baslik + ' · onayınız bekleniyor', body: 'Sayın ' + k.isim + ', ' + markaAd + ' tarafından gönderilen ' + k.baslik + ' belgesini okuyup onaylamak için: ' + k.link, htmlBody: html, name: markaAd }, ayarE);
      o.eposta = 1;
    } catch (err) { o.not.push('E-posta: ' + err.message); }
  }
  return o;
}
/* Yönetici: onaylanmamış bir bağlantıyı aynı kişiye tekrar gönderir (aynı bağlantı; telefonu varsa SMS, e-postası varsa e-posta) */
function ibraTekrarGonder(token, anahtar, kanal) {
  alan_(token, 'ibra');
  var b = ibraBul_(anahtar); if (!b) throw new Error('Kayıt bulunamadı.');
  if (b.r[IB.DUR] === 'ONAYLANDI') throw new Error('Bu belge zaten onaylanmış.');
  if (b.r[IB.DUR] === 'İPTAL') throw new Error('İptal edilmiş gönderim tekrar gönderilemez.');
  var c = CacheService.getScriptCache(), ck = 'ibt_' + b.r[IB.A];
  if (c.get(ck)) throw new Error('Bu kişiye az önce gönderildi. 2 dakika sonra tekrar deneyin.');
  kanal = String(kanal || 'ikisi');
  var m = ibraSurumMetni_(ibraAyar_(), b.r[IB.SUR]) || { baslik: 'İbraname' };
  var g = ibBildir_({ isim: b.r[IB.AD], tel: b.r[IB.TEL], ep: b.r[IB.EP], link: ibraAdres_(b.r[IB.A]), baslik: m.baslik, marka: b.r[IB.MRK] }, kanal, ayarOku_(satirlar_(), 'eposta') || {}, true);
  if (!g.sms && !g.eposta) throw new Error(g.not.length ? g.not.join(' · ') : 'Gönderilecek telefon ya da e-posta yok.');
  c.put(ck, '1', 120);
  var eski = String(b.r[IB.TKR] || ''), sayi = (Number(eski.split('|')[0]) || 0) + 1, yol = [g.sms ? 'SMS' : '', g.eposta ? 'e-posta' : ''].filter(String).join(' + ');
  var deger = sayi + '|' + simdi_() + '|' + yol;
  b.sh.getRange(b.satir, IB.TKR + 1).setNumberFormat('@').setValue(deger);
  if (g.not.length) b.sh.getRange(b.satir, IB.NOT + 1).setValue(g.not.join(' · ').slice(0, 300)); else if (b.r[IB.NOT]) b.sh.getRange(b.satir, IB.NOT + 1).setValue('');
  return { sms: g.sms, eposta: g.eposta, not: g.not, tekrar: deger };
}
function ibraBul_(anahtar) {
  anahtar = String(anahtar || '').replace(/[^0-9a-z]/gi, '').slice(0, 40); if (anahtar.length < 16) return null;
  var sh = ibraSayfasi_(), rows = ibraSatirlari_(sh);
  for (var i = 0; i < rows.length; i++) if (rows[i][IB.A] === anahtar) return { sh: sh, satir: i + 2, r: rows[i] };
  return null;
}
/* Karşı taraf: bağlantıyı açınca (herkese açık, yalnızca kendi anahtarı) */
function ibraGetir(anahtar) {
  if (sorguSiniri_()) throw new Error('Lütfen bir dakika sonra tekrar deneyin.');
  var b = ibraBul_(anahtar); if (!b || b.r[IB.DUR] === 'İPTAL') throw new Error('Bağlantı geçersiz ya da iptal edilmiş. Gönderen kurumla iletişime geçin.');
  var r = b.r, m = ibraSurumMetni_(ibraAyar_(), r[IB.SUR]) || { baslik: 'İbraname', metin: '' }, mk = ibMarka_(r[IB.MRK]);
  return { marka: mk, markaAd: IB_MARKALAR[mk], baslik: m.baslik, metin: ibraDoldur_(m.metin, r, r[IB.DUR] === 'ONAYLANDI' ? true : 'dolu'), isim: r[IB.AD], program: r[IB.PRG], kimlik: { tur: r[IB.KT] || '', no: r[IB.KN] || '', dogum: r[IB.DT] || '', adres: r[IB.ADR] || '' }, durum: r[IB.DUR], onay: r[IB.ONAY], kanal: r[IB.KANAL], ozet: r[IB.OZET], ip: r[IB.IP], tel: ibTelGizle_(r[IB.TEL]) };
}
/* Karşı taraf sayfayı gerçekten açtığında (tarayıcıdan) çağrılır: ilk/son görülme, sayı ve IP kaydedilir.
 * Bağlantı önizleme botları sayfadaki kodu çalıştırmadığı için "görüldü" sayılmaz. */
function ibraGoruldu(anahtar, ekJson) {
  var c = CacheService.getScriptCache(), ck = 'ibg_' + String(anahtar || '').replace(/[^0-9a-z]/gi, '').slice(0, 40);
  if (c.get(ck)) return false; c.put(ck, '1', 30); // aynı bağlantı için 30 sn içinde tek kayıt
  var b = ibraBul_(anahtar); if (!b || b.r[IB.DUR] === 'İPTAL') return false;
  var ek = {}; try { ek = JSON.parse(ekJson || '{}') || {}; } catch (err) {}
  var ip = ibIpTemiz_(ek.ip), z = simdi_() + ' (TSİ)';
  kilitle_(function () {
    var r = b.sh.getRange(b.satir, IB.G1 + 1, 1, 4).getDisplayValues()[0];
    b.sh.getRange(b.satir, IB.G1 + 1, 1, 4).setNumberFormat('@').setValues([[r[0] || z, z, String(Number(r[2] || 0) + 1), ip || r[3] || '']]);
    if (b.r[IB.DUR] === 'GÖNDERİLDİ') b.sh.getRange(b.satir, IB.DUR + 1).setValue('GÖRÜLDÜ');
  });
  return true;
}
/* Karşı taraf: onay kodu iste (kayıtlı telefona SMS) */
function ibraKod(anahtar) {
  var b = ibraBul_(anahtar); if (!b || b.r[IB.DUR] === 'İPTAL') throw new Error('Bağlantı geçersiz.');
  if (b.r[IB.DUR] === 'ONAYLANDI') throw new Error('Bu belge zaten onaylanmış.');
  if (!b.r[IB.TEL]) throw new Error('Kayıtlı telefon yok.');
  var c = CacheService.getScriptCache(), sk = 'ibs_' + b.r[IB.A], say = Number(c.get(sk) || 0);
  if (say >= 5) throw new Error('Çok fazla kod istendi. 15 dakika sonra tekrar deneyin.');
  c.put(sk, String(say + 1), 900);
  var kod = String(100000 + Math.floor(Math.random() * 900000)), mAd = IB_MARKALAR[ibMarka_(b.r[IB.MRK])];
  netgsmGonder_(ibNetgsmNo_(b.r[IB.TEL]), mAd + ' ibraname onay kodunuz: ' + kod + ' (5 dakika gecerlidir). Bu kodu girmeniz belgeyi onayladiginiz anlamina gelir.', ibSmsOnek_(b.r[IB.MRK]));
  c.put('ibk_' + b.r[IB.A], JSON.stringify({ h: ozetKisa_(b.r[IB.A] + '|' + kod), n: 0 }), SMS_SURE);
  return { tel: ibTelGizle_(b.r[IB.TEL]) };
}
/* Karşı taraf: onayla. Telefonu kayıtlıysa SMS kodu, değilse ad soyadını yazarak beyan.
 * ek: {ip, ua} — onay kanıtı olarak IP adresi ve cihaz/tarayıcı bilgisi (IP tarayıcıdan alınır; Apps Script ziyaretçi IP'sini göremez). */
function ibIpTemiz_(ip) { ip = String(ip || '').trim(); return /^(\d{1,3}\.){3}\d{1,3}$/.test(ip) || /^[0-9a-f:]{3,45}$/i.test(ip) ? ip : ''; }
function ibraOnayla(anahtar, kod, adYazili, ekJson) {
  var ek = {}; try { ek = JSON.parse(ekJson || '{}') || {}; } catch (err) {}
  var ip = ibIpTemiz_(ek.ip) || 'alınamadı', ua = String(ek.ua || '').replace(/[\r\n]/g, ' ').slice(0, 300);
  var b = ibraBul_(anahtar); if (!b || b.r[IB.DUR] === 'İPTAL') throw new Error('Bağlantı geçersiz.');
  if (b.r[IB.DUR] === 'ONAYLANDI') return { zaman: b.r[IB.ONAY], kanal: b.r[IB.KANAL], ozet: b.r[IB.OZET], ip: b.r[IB.IP] };
  // kimlik bilgileri (kod harcanmadan önce kontrol edilir)
  // Gönderirken girilen bilgiler kesindir (kişi değiştiremez); yalnızca boş olanları kişi doldurur
  var kb = ek.kimlik || {};
  if (b.r[IB.KN]) kb = { tur: b.r[IB.KT], no: b.r[IB.KN], dogum: kb.dogum, adres: kb.adres };
  if (b.r[IB.DT]) kb.dogum = b.r[IB.DT];
  if (b.r[IB.ADR]) kb.adres = b.r[IB.ADR];
  var kim = ibKimlikNorm_(kb.tur, kb.no), dog = ibTarihNorm_(kb.dogum), adr = String(kb.adres || '').replace(/\s+/g, ' ').trim().slice(0, 300);
  if (kim.hata) throw new Error(kim.hata + '.');
  if (!kim.no) throw new Error(kb.tur === 'pasaport' ? 'Pasaport numaranızı yazın.' : 'T.C. kimlik numaranızı yazın.');
  if (!dog) throw new Error('Doğum tarihinizi girin.');
  if (adr.length < 10) throw new Error('Adresinizi açık olarak yazın.');
  var kanal;
  if (b.r[IB.TEL]) {
    var c = CacheService.getScriptCache(), ck = 'ibk_' + b.r[IB.A], j = c.get(ck);
    if (!j) throw new Error('Kodun süresi doldu. Yeni kod isteyin.');
    var d = JSON.parse(j);
    if (ozetKisa_(b.r[IB.A] + '|' + String(kod || '').replace(/\D/g, '')) !== d.h) {
      d.n++; if (d.n >= 5) { c.remove(ck); throw new Error('Kod 5 kez hatalı girildi. Yeni kod isteyin.'); }
      c.put(ck, JSON.stringify(d), SMS_SURE); throw new Error('Kod hatalı. Kalan deneme: ' + (5 - d.n));
    }
    c.remove(ck); kanal = 'SMS kodu · ' + ibTelGizle_(b.r[IB.TEL]);
  } else {
    if (isimNorm_(adYazili) !== isimNorm_(b.r[IB.AD])) throw new Error('Ad soyadınızı belgede yazdığı şekilde yazın.');
    kanal = 'Ad soyad beyanı';
  }
  var m = ibraSurumMetni_(ibraAyar_(), b.r[IB.SUR]) || { baslik: '', metin: '' };
  var r2 = b.r.slice(); while (r2.length < IB_BASLIK.length) r2.push(''); r2[IB.KT] = kim.tur; r2[IB.KN] = kim.no; r2[IB.DT] = dog; r2[IB.ADR] = adr;
  var ozet = ozetKisa_(m.baslik + '\n' + ibraDoldur_(m.metin, r2, true) + '\n' + ibKimlikYazi_(kim.tur, kim.no) + ' | ' + dog + ' | ' + adr).slice(0, 16).toUpperCase();
  var zaman = simdi_() + ' (TSİ)';
  kilitle_(function () { b.sh.getRange(b.satir, IB.KT + 1, 1, 4).setNumberFormat('@').setValues([[kim.tur, kim.no, dog, adr]]); b.sh.getRange(b.satir, IB.DUR + 1).setValue('ONAYLANDI'); b.sh.getRange(b.satir, IB.ONAY + 1, 1, 3).setNumberFormat('@').setValues([[zaman, kanal, ozet]]); b.sh.getRange(b.satir, IB.IP + 1, 1, 2).setNumberFormat('@').setValues([[ip, ua]]); });
  return { zaman: zaman, kanal: kanal, ozet: ozet, ip: ip, kimlik: { tur: kim.tur, no: kim.no, dogum: dog, adres: adr } };
}
/* Yönetici: gönderimi iptal et (bağlantı artık açılmaz) */
/* Yönetici: gönderilmiş (henüz onaylanmamış) ibranamedeki kişi bilgilerini günceller.
 * json: { isim, tel, eposta, program, kimlikTur, kimlikNo, kimlikSil, dogum, adres } — kimlikNo boş bırakılırsa mevcut numara korunur.
 * Onaylanmış belge değiştirilemez (onay kanıtı bozulmasın diye). Değişiklik "Bilgi güncelleme" sütununa işlenir. */
function ibraGuncelle(token, anahtar, json) {
  var o = alan_(token, 'ibra'), x = JSON.parse(json || '{}');
  return kilitle_(function () {
    var b = ibraBul_(anahtar); if (!b) throw new Error('Kayıt bulunamadı.');
    if (b.r[IB.DUR] === 'ONAYLANDI') throw new Error('Onaylanmış belgenin bilgileri değiştirilemez. Gerekirse yeni bir ibraname gönderin.');
    if (b.r[IB.DUR] === 'İPTAL') throw new Error('İptal edilmiş gönderim güncellenemez.');
    var r = b.r.slice(), eski = b.r.slice(), deg = [];
    var isim = String(x.isim || '').replace(/\s+/g, ' ').trim().toLocaleUpperCase('tr-TR').slice(0, 120); if (!isim) throw new Error('Ad soyad boş olamaz.');
    var telHam = String(x.tel || '').trim(), tel = telHam ? ibTelNorm_(telHam) : '';
    if (telHam && !tel) throw new Error('Telefon numarası geçersiz.');
    var ep = String(x.eposta || '').trim().toLowerCase(); if (ep && !epostaGecerli_(ep)) throw new Error('E-posta adresi geçersiz.');
    if (!tel && !ep) throw new Error('Telefon ya da e-posta gerekli.');
    var prg = String(x.program || '').trim().slice(0, 160);
    var kt = r[IB.KT], kn = r[IB.KN];
    if (x.kimlikSil) { kt = ''; kn = ''; }
    else if (String(x.kimlikNo || '').trim()) { var k = ibKimlikNorm_(x.kimlikTur, x.kimlikNo); if (k.hata) throw new Error(k.hata); kt = k.tur; kn = k.no; }
    var dgHam = String(x.dogum || '').trim(), dg = dgHam ? ibTarihNorm_(dgHam) : ''; if (dgHam && !dg) throw new Error('Doğum tarihi geçersiz (gg.aa.yyyy).');
    var adr = String(x.adres || '').replace(/\s+/g, ' ').trim().slice(0, 300);
    r[IB.AD] = isim; r[IB.TEL] = tel; r[IB.EP] = ep; r[IB.PRG] = prg; r[IB.KT] = kt; r[IB.KN] = kn; r[IB.DT] = dg; r[IB.ADR] = adr;
    var adlar = [[IB.AD, 'ad'], [IB.TEL, 'telefon'], [IB.EP, 'e-posta'], [IB.PRG, 'program'], [IB.KN, 'kimlik'], [IB.KT, 'kimlik türü'], [IB.DT, 'doğum'], [IB.ADR, 'adres']];
    adlar.forEach(function (a) { if (String(eski[a[0]] || '') !== String(r[a[0]] || '') && deg.indexOf(a[1]) < 0) deg.push(a[1]); });
    if (!deg.length) return { degisen: [] };
    var gk = String(eski[IB.GNC] || ''), say = (Number(gk.split('|')[0]) || 0) + 1;
    r[IB.GNC] = say + '|' + simdi_() + '|' + o.kadi + '|' + deg.join(', ');
    b.sh.getRange(b.satir, 1, 1, IB_BASLIK.length).setNumberFormat('@').setValues([ibSatirDoldur_(r)]);
    return { degisen: deg, gnc: r[IB.GNC] };
  });
}
function ibraIptal(token, anahtar) {
  alan_(token, 'ibra');
  var b = ibraBul_(anahtar); if (!b) throw new Error('Kayıt bulunamadı.');
  if (b.r[IB.DUR] === 'ONAYLANDI') throw new Error('Onaylanmış belge iptal edilemez.');
  b.sh.getRange(b.satir, IB.DUR + 1).setValue('İPTAL'); return true;
}
/* Apps Script'te çalıştırın: ibraname Netgsm hesabını dener. Önce Proje Ayarları > Komut dosyası özelliklerine
 * IBRA_NETGSM_KULLANICI, IBRA_NETGSM_SIFRE, IBRA_NETGSM_BASLIK ve test için IBRA_TEST_TEL (05xx...) ekleyin. Sonuç Yürütme günlüğünde görünür. */
function ibraSmsTest() {
  var p = PropertiesService.getScriptProperties();
  if (!netgsmBagli_('IBRA_')) { Logger.log('EKSİK: IBRA_NETGSM_KULLANICI, IBRA_NETGSM_SIFRE ve IBRA_NETGSM_BASLIK özelliklerini ekleyin.'); return; }
  var tel = telNorm_(p.getProperty('IBRA_TEST_TEL'));
  if (!tel) { Logger.log('EKSİK: test SMS\'i için IBRA_TEST_TEL özelliğine kendi cep numaranızı yazın (05xx xxx xx xx).'); return; }
  try { netgsmGonder_(tel, 'Ibraname SMS hesabi test mesaji.', 'IBRA_'); Logger.log('TAMAM: test SMS\'i ' + telGizle_(tel) + ' numarasına gönderildi. Başlık: ' + p.getProperty('IBRA_NETGSM_BASLIK')); }
  catch (err) { Logger.log('HATA: ' + err.message); }
}

/* ================= Canlı Dersler: satış → bekleyen → sınıf planlama =================
 * Veriler okunabilir E-Tablo sayfalarında tutulur (Veri sayfasına dokunmaz, hızlıdır):
 *   "Canlı Dersler"   : her eğitim bir satır
 *   "Süpervizyon"     : her süpervizyon bir satır
 *   "Canlı Ders Geçmişi": her işlem bir satır (satış, sınıf açılışı, not, süpervizyon)
 * Satış (+1) sunucuda sayılır; aynı anda iki kişi basarsa ikisi de eklenir.
 */
var CL_BASLIK = ['ID', 'Eğitim', 'Hoca', 'Süre', 'Son başlangıç', 'Son sınıfa başlayan', 'Bekleyen', 'Eşik', 'Planlanan başlangıç', 'Son sınıf açıldı', 'Not', 'Dönemler', 'Sıra', 'Güncelleme'];
var CL = { ID: 0, AD: 1, HOCA: 2, SURE: 3, SON: 4, BAS: 5, BEK: 6, ESIK: 7, PLAN: 8, KAPALI: 9, NOT: 10, DON: 11, SIRA: 12, GNC: 13 };
var CLS_BASLIK = ['Tarih', 'Eğitim', 'Hoca', 'Yer', 'Durum', 'Not', 'ID'];
var CLG_BASLIK = ['Zaman', 'Tür', 'Açıklama', 'Kullanıcı'];
var CLE_BASLIK = ['Rapordaki yazım (sadeleştirilmiş)', 'Eğitim ID'];
var CLR_BASLIK = ['Anahtar', 'Satış tarihi', 'Eğitim ID', 'Rapordaki eğitim adı', 'Ad soyad', 'Telefon', 'Sipariş no', 'Bekleyene eklendi', 'Rapor', 'Yükleme', 'Yükleyen'];
function clSayfa_(ad, baslik) {
  var ss = ss_(), sh = ss.getSheetByName(ad);
  if (!sh) { sh = ss.insertSheet(ad); sh.getRange(1, 1, 1, baslik.length).setValues([baslik]).setFontWeight('bold'); sh.setFrozenRows(1); }
  return sh;
}
function clSatirlar_(sh, n) { var son = sh.getLastRow(); return son < 2 ? [] : sh.getRange(2, 1, son - 1, n).getDisplayValues(); }
function clNesne_(r) {
  var don = []; try { don = JSON.parse(r[CL.DON] || '[]'); } catch (err) {}
  return { id: r[CL.ID], ad: r[CL.AD], hoca: r[CL.HOCA], sure: r[CL.SURE], son: r[CL.SON], bas: r[CL.BAS], bek: Number(r[CL.BEK] || 0), esik: Number(r[CL.ESIK] || 15),
    plan: r[CL.PLAN], kapali: r[CL.KAPALI] === 'EVET', not: r[CL.NOT], donemler: don, sira: Number(r[CL.SIRA] || 0), gnc: r[CL.GNC] };
}
function clSatir_(e) {
  return [String(e.id), String(e.ad || ''), String(e.hoca || ''), String(e.sure || ''), String(e.son || ''), String(e.bas || ''), String(Math.max(0, Number(e.bek) || 0)),
    String(Math.max(1, Number(e.esik) || 15)), String(e.plan || ''), e.kapali ? 'EVET' : '', String(e.not || '').slice(0, 500), JSON.stringify(e.donemler || []), String(e.sira || 0), simdi_()];
}
function clEkle_(sh, satir) { sh.getRange(sh.getLastRow() + 1, 1, 1, satir.length).setNumberFormat('@').setValues([satir]); }
function clGecmis_(o, tur, yazi) { clEkle_(clSayfa_('Canlı Ders Geçmişi', CLG_BASLIK), [simdi_(), tur, String(yazi).slice(0, 300), o.ad || o.kadi]); }
function clBul_(sh, id) { var r = clSatirlar_(sh, CL_BASLIK.length); for (var i = 0; i < r.length; i++) if (r[i][CL.ID] === String(id)) return { satir: i + 2, r: r[i] }; return null; }
function clYaz_(sh, satir, e) { sh.getRange(satir, 1, 1, CL_BASLIK.length).setNumberFormat('@').setValues([clSatir_(e)]); }
/* Tüm veriler (bölüm açılınca tek istek) */
function canliListe(token) {
  alan_(token, 'canli');
  var egt = clSatirlar_(clSayfa_('Canlı Dersler', CL_BASLIK), CL_BASLIK.length).filter(function (r) { return r[CL.ID]; }).map(clNesne_);
  var sup = clSatirlar_(clSayfa_('Süpervizyon', CLS_BASLIK), CLS_BASLIK.length).filter(function (r) { return r[0]; })
    .map(function (r) { return { t: r[0], ad: r[1], hoca: r[2], yer: r[3], durum: r[4], not: r[5], id: r[6] }; });
  var g = clSayfa_('Canlı Ders Geçmişi', CLG_BASLIK), son = g.getLastRow(), bas = Math.max(2, son - 399);
  var log = son < 2 ? [] : g.getRange(bas, 1, son - bas + 1, 4).getDisplayValues().reverse().map(function (r) { return { z: r[0], tur: r[1], yazi: r[2], u: r[3] }; });
  var es = {}; clSatirlar_(clSayfa_('Canlı Eşleştirme', CLE_BASLIK), 2).forEach(function (r) { if (r[0]) es[r[0]] = r[1]; });
  // Grafik için aylık satış özeti: { 'YYYY-MM': { eğitimId: adet } }
  var ay = {}, shR = clSayfa_('Satışlar', CLR_BASLIK), sonR = shR.getLastRow();
  if (sonR >= 2) shR.getRange(2, 2, sonR - 1, 2).getDisplayValues().forEach(function (r) {
    var m = String(r[0] || '').slice(0, 7); if (!/^\d{4}-\d{2}$/.test(m) || !r[1]) return;
    var a = ay[m] || (ay[m] = {}); a[r[1]] = (a[r[1]] || 0) + 1;
  });
  return { egt: egt, sup: sup, log: log, esler: es, ay: ay, baz: prop_('CANLI_BAZ') || '' };
}
/* İlk kurulum: başlangıç verisini (yalnızca sayfa boşsa) tek seferde yazar */
function canliBaslat(token, json) {
  var o = yonetici_(token), v = JSON.parse(json || '{}');
  var sonuc = 0;
  kilitle_(function () {
    var sh = clSayfa_('Canlı Dersler', CL_BASLIK);
    if (sh.getLastRow() > 1) return;
    var rows = (v.egt || []).map(function (e, i) { e.sira = i; return clSatir_(e); });
    if (rows.length) sh.getRange(2, 1, rows.length, CL_BASLIK.length).setNumberFormat('@').setValues(rows);
    var ss = clSayfa_('Süpervizyon', CLS_BASLIK);
    if (ss.getLastRow() < 2 && (v.sup || []).length) ss.getRange(2, 1, v.sup.length, CLS_BASLIK.length).setNumberFormat('@')
      .setValues(v.sup.map(function (x) { return [x.t, x.ad, x.hoca || '', x.yer || '', x.durum || '', x.not || '', Utilities.getUuid().slice(0, 8)]; }));
    sonuc = rows.length;
    if (v.tarih && !prop_('CANLI_BAZ')) PropertiesService.getScriptProperties().setProperty('CANLI_BAZ', String(v.tarih));
  });
  if (sonuc) clGecmis_(o, 'Başlangıç', String(v.aciklama || 'Başlangıç verisi aktarıldı'));
  return canliListe(token);
}
/* Yeni satış: bekleyene adet ekler (sunucuda sayılır) */
function canliSatis(token, id, adet) {
  var o = alan_(token, 'canli'), e;
  kilitle_(function () {
    var sh = clSayfa_('Canlı Dersler', CL_BASLIK), b = clBul_(sh, id); if (!b) throw new Error('Eğitim bulunamadı.');
    e = clNesne_(b.r); e.bek = Math.max(0, e.bek + (Number(adet) || 1)); clYaz_(sh, b.satir, e);
  });
  clGecmis_(o, Number(adet) < 0 ? 'Düzeltme' : 'Satış', e.ad + ' · bekleyen ' + e.bek);
  return e;
}
/* Eğitim bilgilerini kaydet (yeni eğitim de buradan: id yoksa eklenir) */
function canliKaydet(token, json, aciklama) {
  var o = alan_(token, 'canli'), y = JSON.parse(json || '{}'), e;
  if ((!y.id || y.hasOwnProperty('ad')) && !String(y.ad || '').trim()) throw new Error('Eğitim adı boş olamaz.');
  kilitle_(function () {
    var sh = clSayfa_('Canlı Dersler', CL_BASLIK);
    if (!y.id) { y.id = 'e' + Date.now().toString(36); y.sira = sh.getLastRow(); y.donemler = []; e = y; clEkle_(sh, clSatir_(y)); return; }
    var b = clBul_(sh, y.id); if (!b) throw new Error('Eğitim bulunamadı.');
    e = clNesne_(b.r);
    ['ad', 'hoca', 'sure', 'esik', 'bek', 'bas', 'son', 'plan', 'not', 'kapali'].forEach(function (k) { if (y.hasOwnProperty(k)) e[k] = y[k]; });
    clYaz_(sh, b.satir, e);
  });
  if (aciklama !== false) clGecmis_(o, 'Güncelleme', aciklama || (e.ad + ' bilgileri güncellendi'));
  return e;
}
/* Sınıf açıldı: yeni dönem eklenir, bekleyen sıfırlanır */
function canliSinifAc(token, id, tarih, kisi) {
  var o = alan_(token, 'canli'), e;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(tarih))) throw new Error('Başlangıç tarihi geçersiz.');
  kilitle_(function () {
    var sh = clSayfa_('Canlı Dersler', CL_BASLIK), b = clBul_(sh, id); if (!b) throw new Error('Eğitim bulunamadı.');
    e = clNesne_(b.r); var k = String(Math.max(0, Number(kisi) || 0));
    e.donemler = [{ t: tarih, k: k }].concat(e.donemler || []); e.son = tarih; e.bas = k; e.bek = 0; e.plan = ''; e.kapali = false;
    clYaz_(sh, b.satir, e);
  });
  clGecmis_(o, 'Sınıf', e.ad + ' · ' + tarih.split('-').reverse().join('.') + ' tarihinde ' + e.bas + ' kişiyle sınıf açıldı');
  return e;
}
function canliSil(token, id) {
  var o = yonetici_(token), ad = '';
  kilitle_(function () { var sh = clSayfa_('Canlı Dersler', CL_BASLIK), b = clBul_(sh, id); if (b) { ad = b.r[CL.AD]; sh.deleteRow(b.satir); } });
  if (ad) clGecmis_(o, 'Güncelleme', ad + ' silindi');
  return true;
}
function canliSupEkle(token, json) {
  var o = alan_(token, 'canli'), v = JSON.parse(json || '{}');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(v.t)) || !String(v.ad || '').trim()) throw new Error('Tarih ve eğitim adı gerekli.');
  var id = Utilities.getUuid().slice(0, 8);
  kilitle_(function () { clEkle_(clSayfa_('Süpervizyon', CLS_BASLIK), [v.t, v.ad, v.hoca || '', v.yer || '', v.durum || '', v.not || '', id]); });
  clGecmis_(o, 'Süpervizyon', v.ad + ' · ' + v.t.split('-').reverse().join('.') + (v.yer ? ' · ' + v.yer : ''));
  return id;
}
function canliSupSil(token, id) {
  var o = alan_(token, 'canli'), ad = '';
  kilitle_(function () {
    var sh = clSayfa_('Süpervizyon', CLS_BASLIK), r = clSatirlar_(sh, CLS_BASLIK.length);
    for (var i = 0; i < r.length; i++) if (r[i][6] === String(id)) { ad = r[i][1] + ' · ' + r[i][0].split('-').reverse().join('.'); sh.deleteRow(i + 2); break; }
  });
  if (ad) clGecmis_(o, 'Süpervizyon', ad + ' silindi');
  return true;
}

/* Satış raporu: kaydet=false → yalnızca önizleme (hiçbir şey yazılmaz).
 * satislar: [{k: anahtar, t: 'yyyy-mm-dd', eid, ham, ad, tel, no}] ; esler: {sadeYazım: eğitimId} (kullanıcının seçtikleri, hatırlanır)
 * Kural: daha önce yüklenmiş anahtar → atlanır; satış tarihi, eğitimin son başlangıcından (ve başlangıç verisinin tarihinden) sonraysa bekleyene eklenir. */
function canliRapor(token, json, kaydet) {
  var o = alan_(token, 'canli'), v = JSON.parse(json || '{}'), sonuc;
  kilitle_(function () {
    var shR = clSayfa_('Satışlar', CLR_BASLIK), var_ = {};
    clSatirlar_(shR, 1).forEach(function (r) { var_[r[0]] = 1; });
    var sh = clSayfa_('Canlı Dersler', CL_BASLIK), rows = clSatirlar_(sh, CL_BASLIK.length), egt = {}, satirNo = {};
    rows.forEach(function (r, i) { if (r[CL.ID]) { egt[r[CL.ID]] = clNesne_(r); satirNo[r[CL.ID]] = i + 2; } });
    var baz = prop_('CANLI_BAZ') || String(v.baz || ''), zaman = simdi_(), yeniSatir = [], artis = {}, sayi = { okunan: 0, yeni: 0, tekrar: 0, eski: 0, eslesmeyen: 0, bilinmeyen: 0 }, goruldu = {};
    (v.satislar || []).forEach(function (x) {
      sayi.okunan++;
      var k = String(x.k || '').slice(0, 120); if (!k) return;
      if (var_[k] || goruldu[k]) { sayi.tekrar++; return; }
      goruldu[k] = 1;
      if (!x.eid) { sayi.eslesmeyen++; return; }
      var e = egt[x.eid]; if (!e) { sayi.bilinmeyen++; return; }
      var t = String(x.t || ''), sinir = e.son > baz ? e.son : baz, ekle = /^\d{4}-\d{2}-\d{2}$/.test(t) && t > sinir;
      if (ekle) { sayi.yeni++; artis[x.eid] = (artis[x.eid] || 0) + 1; } else sayi.eski++;
      yeniSatir.push([k, t, x.eid, String(x.ham || '').slice(0, 150), String(x.ad || '').slice(0, 100), String(x.tel || '').slice(0, 30), String(x.no || '').slice(0, 60), ekle ? 'EVET' : 'HAYIR', String(v.dosya || '').slice(0, 100), zaman, o.ad || o.kadi]);
    });
    sonuc = { sayi: sayi, artis: artis, baz: baz };
    if (!kaydet) return;
    if (yeniSatir.length) shR.getRange(shR.getLastRow() + 1, 1, yeniSatir.length, CLR_BASLIK.length).setNumberFormat('@').setValues(yeniSatir);
    Object.keys(artis).forEach(function (id) { var e = egt[id]; e.bek = (e.bek || 0) + artis[id]; clYaz_(sh, satirNo[id], e); });
    var es = v.esler || {}, ka = Object.keys(es);
    if (ka.length) {
      var she = clSayfa_('Canlı Eşleştirme', CLE_BASLIK), mevcut = {};
      clSatirlar_(she, 2).forEach(function (r, i) { mevcut[r[0]] = i + 2; });
      ka.forEach(function (h) { if (!h || !es[h]) return; if (mevcut[h]) she.getRange(mevcut[h], 2).setValue(es[h]); else clEkle_(she, [String(h).slice(0, 200), es[h]]); });
    }
  });
  if (kaydet) {
    var s2 = sonuc.sayi;
    clGecmis_(o, 'Rapor', (v.dosya || 'Satış raporu') + ' · ' + s2.okunan + ' satır · ' + s2.yeni + ' yeni satış bekleyene eklendi · ' + s2.tekrar + ' tekrar atlandı' + (s2.eski ? ' · ' + s2.eski + ' son başlangıçtan önce' : ''));
    var l = canliListe(token); sonuc.egt = l.egt; sonuc.log = l.log; sonuc.esler = l.esler; sonuc.ay = l.ay;
  }
  return sonuc;
}
