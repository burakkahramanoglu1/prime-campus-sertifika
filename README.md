# Prime Campus · Sertifika Basım Masası

Prime Campus CPD ve Adler sertifikalarını basan, doğrulayan ve gönderen sistem.
Google Apps Script (sunucu) + tek dosyalık HTML panel.

## Dosyalar

| Dosya | Ne işe yarar |
|---|---|
| `apps-script/Kod.gs` | Sunucu kodu (Apps Script projesine yapıştırılır) |
| `panel/Sertifika_Basim_Masasi_drive.html` | Panel, doğrulama ve ibraname sayfaları |

## Kurulum / güncelleme

1. **Sunucu kodu:** Apps Script projesini açın, `Kod.gs` içeriğini tamamen bununla değiştirin, kaydedin.
   Ardından **Dağıt → Dağıtımları yönet → Düzenle → Yeni sürüm → Dağıt** yapın.
2. **Panel:** `Sertifika_Basim_Masasi_drive.html` dosyasını Drive'daki eski dosyanın yerine **aynı adla** yükleyin
   (WordPress kullanıyorsanız oradaki panel dosyasını da güncelleyin).
3. Paneli yenileyin.

## Notlar

- Şifreler ve API anahtarları (NetGSM, reCAPTCHA vb.) kodda değil, Apps Script **Komut dosyası özellikleri**nde durur.
- Bu depodaki panelde canlı ders başlangıç listesi (`CANLI_BASLANGIC`) boş bırakılmıştır; gerçek veriler E-Tablo'dadır.
- Adler sertifikası: kendi sayfası ("Adler sertifika"), sabit tasarımı ve ayrı doğrulama ekranı vardır.

© 2026 Prime Campus bir Lion Academy Eğitim Danışmanlık A.Ş. markasıdır.
