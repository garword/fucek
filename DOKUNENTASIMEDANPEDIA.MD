# Dokumentasi Integrasi MedanPedia

Dokumentasi ini menjelaskan rencana dan teknis integrasi layanan SMM Panel dari [MedanPedia](https://medanpedia.co.id/) ke dalam aplikasi MARKET.

## 1. Tujuan Integrasi
- Menambahkan produk kategori "SOSMED" secara otomatis dari MedanPedia.
- Memproses pesanan SOSMED secara otomatis ke API MedanPedia.
- Update status pesanan secara berkala.

## 2. API MedanPedia
Base URL: `https://api.medanpedia.co.id/`

### A. Cek Saldo (Profile)
- **Endpoint**: `/profile`
- **Method**: `POST`
- **Params**: `api_id`, `api_key`
- **Response**: `balance` (saldo saat ini)

### B. Daftar Layanan (Services)
- **Endpoint**: `/services`
- **Method**: `POST`
- **Params**: `api_id`, `api_key`
- **Response**: Array of services (id, name, type, category, price, min, max, etc.)
- **Mapping**:
    - `id` -> Disimpan sebagai `providerId`
    - `name` -> Nama Produk
    - `category` -> Kategori Produk (SOSMED)
    - `price` -> Harga dasar (perlu markup)
    - `type` -> Tipe layanan (default, custom_comments, dll)

### C. Pemesanan (Order)
- **Endpoint**: `/order`
- **Method**: `POST`
- **Params**: `api_id`, `api_key`, `service`, `target`, `quantity`, `custom_comments` (optional), `custom_link` (optional)
- **Response**: `id` (Order ID dari MedanPedia)

### D. Cek Status (Status)
- **Endpoint**: `/status`
- **Method**: `POST`
- **Params**: `api_id`, `api_key`, `id` (Order ID)
- **Response**: `status` (Pending, Processing, Success, Error, Partial)

### E. Refill Pesanan (Refill)
- **Endpoint**: `/refill`
- **Method**: `POST`
- **Params**: `api_id`, `api_key`, `id_order` (Order ID)
- **Response**: `id_refill` (ID Refill Request)

### F. Cek Status Refill (Refill Status)
- **Endpoint**: `/refill_status`
- **Method**: `POST`
- **Params**: `api_id`, `api_key`, `id_refill` (Refill ID)
- **Response**: `status` (Pending, Success, Error, etc.)

## 3. Rencana Implementasi

### A. Database Schema
Perlu penyesuaian pada tabel `Product` dan `Transaction`/`Order`.
- **Product**: Menambahkan field `provider` ("MEDANPEDIA"), `providerId`, `serviceType`.
- **Transaction**: Menambahkan field `target` (untuk link/username sosmed), `providerOrderId`.

### B. Alur Kerja
1. **Sync Produk**: Admin menekan tombol sync -> Backend fetch ke `/services` -> Simpan/Update produk di database.
2. **User Order**: User pilih produk -> Input Target (Link/Username) -> Bayar.
3. **Proses Order**: Webhook payment sukses -> Backend kirim order ke `/order` MedanPedia -> Simpan `providerOrderId`.
4. **Cek Status**: Cron job tiap menit/jam cek status order yang pending ke `/status` -> Update status transaksi lokal.

## 4. Konfigurasi
Environment Variables yang dibutuhkan:
```env
MEDANPEDIA_API_ID=...
MEDANPEDIA_API_KEY=...
MEDANPEDIA_PROFIT_MARGIN=20 # Persentase markup harga (contoh 20%)
```

## 5. Catatan Penting
- Pastikan saldo di MedanPedia cukup sebelum auto-order.
- Handle error jika API MedanPedia down atau slow response.
- Tipe layanan `custom_comments` memerlukan input khusus dari user (textarea), sedangkan `default` hanya butuh target link/username.

## 6. Penjelasan Status & Refill

### Status Pesanan
- **Pending**: Pesanan/deposit sedang dalam antrean di server.
- **Processing**: Pesanan sedang dalam proses.
- **Success**: Pesanan telah berhasil.
- **Partial**: Pesanan sudah terproses tapi tercancel sebagian. Anda hanya akan membayar layanan yang masuk saja. Sisa saldo otomatis kembali.
- **Error**: Pesanan dibatalkan, dan saldo akan otomatis kembali ke akun.

### Mengapa Bisa Partial?
1. **Limit**: Contoh jika satu layanan dengan maksimal 1.000 followers, kemudian anda membeli 1.000 followers 2x di akun yang sama. Kemungkinan besar akan terjadi partial karena akun di server hanya tersedia 1.000.
2. **Server Overload**: Terjadi di layanan yang murah karena terlalu banyak pesanan masuk.

### Garansi (Refill)
Refill adalah isi ulang.
- Jika layanan memiliki label **Auto Refill**, proses otomatis (tunggu 2x24 jam).
- Jika tidak otomatis atau belum masuk, user bisa request refill menggunakan **Order ID**.

