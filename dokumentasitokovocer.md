
# Transaksi - Metode POST

API ini digunakan untuk melakukan pembelian produk (pulsa, game, dll) menggunakan metode POST.

## Endpoint
**POST**
`https://api.tokovoucher.net/v1/transaksi`

## Parameter

| Parameter   | Deskripsi                                                 | Tipe Data | Wajib |
| :---------- | :-------------------------------------------------------- | :-------- | :---- |
| ref_id      | ID referensi unik dari Anda (untuk tracking transaksi)    | String    | Ya    |
| produk      | Kode produk di Toko Voucher (contoh: FF5, ML86)           | String    | Ya    |
| tujuan      | Nomor tujuan (Player ID, User ID, atau Nomor HP)          | String    | Ya    |
| server_id   | Server ID game (kosongkan "" jika tidak diperlukan)       | String    | Tidak |
| member_code | Kode member Anda                                          | String    | Ya    |
| signature   | Signature dengan formula `md5(MEMBER_CODE:SECRET:REF_ID)` | String    | Ya    |

**Tips:** Parameter tujuan bisa digabung dengan server_id (contoh: "12345678|2001") atau dipisah menggunakan parameter server_id terpisah.

### Contoh Request

```json
{
    "ref_id": "tx334234",
    "produk": "FF5",
    "tujuan": "034344234",
    "server_id": "exr33f",
    "member_code": "MEM3532234432X34",
    "signature": "f109a98c4f298ade23fb6c1f067dce53"
}
```

## Response

### Pending (Sedang Diproses)
```json
{
    "status": "pending",
    "message": "TRXID:T220907UYXI026607. REFID:5467110. PENDING. HRG:1600. SALDO:17322134. KP:S1.085211223344 TGL:2022-09-07 22:46:36",
    "sn": "",
    "ref_id": "5467110",
    "trx_id": "T220907UYXI026607",
    "produk": "s1",
    "sisa_saldo": 17322134,
    "price": 1600
}
```

### Sukses
```json
{
    "status": "sukses",
    "message": "TRXID:T220907HTRK027479. REFID:6915241. SUKSES, SN: DLINR-_-. RefId : 11183039941543874221. HRG:789. SALDO:17317805. KP:FF5.50714103 TGL:2022-09-07 22:59:47",
    "sn": "DLINR-_-. RefId : 11183039941543874221",
    "ref_id": "6915241",
    "trx_id": "T220907HTRK027479",
    "produk": "ff5",
    "sisa_saldo": 17317805,
    "price": 789
}
```

### Gagal
```json
{
    "status": "gagal",
    "message": "TRXID:T220907JKYI026608. REFID:5467112. GAGAL, Nomor Tujuan Salah. HRG:1600. SALDO:172200. KP:S1.085222334455 TGL:2022-09-07 22:46:36",
    "sn": "Nomor Tujuan Salah",
    "ref_id": "5467112",
    "trx_id": "T220907JKYI026608",
    "produk": "S1",
    "sisa_saldo": 172200,
    "price": 1600
}
```

## Response Error

### IP Tidak Diizinkan
```json
{
    "status": 0,
    "error_msg": "Ip Not Allow"
}
```
*Pastikan IP server Anda sudah ditambahkan di whitelist pada Member Area.*

### Signature Tidak Valid
```json
{
    "status": 0,
    "error_msg": "Signature Invalid"
}
```
*Pastikan formula signature sudah benar: `md5(MEMBER_CODE:SECRET:REF_ID)`*

## Catatan Penting
Setiap ada perubahan status transaksi (dari pending ke sukses/gagal), kami akan mengirimkan notifikasi ke webhook Anda.

---

# Transaksi - Metode GET

API ini digunakan untuk melakukan pembelian produk (pulsa, game, dll) menggunakan metode GET.

## Endpoint
**GET** `https://api.tokovoucher.net/v1/transaksi?ref_id=[ref_id]&produk=[produk]&tujuan=[tujuan]&secret=[secret]&member_code=[member_code]&server_id=[server_id]`

## Parameter

| Parameter   | Deskripsi                                              | Tipe Data | Wajib |
| :---------- | :----------------------------------------------------- | :-------- | :---- |
| ref_id      | ID referensi unik dari Anda (untuk tracking transaksi) | String    | Ya    |
| produk      | Kode produk di Toko Voucher (contoh: FF5, ML86)        | String    | Ya    |
| tujuan      | Nomor tujuan (Player ID, User ID, atau Nomor HP)       | String    | Ya    |
| server_id   | Server ID game (kosongkan jika tidak diperlukan)       | String    | Tidak |
| member_code | Kode member Anda                                       | String    | Ya    |
| secret      | Secret Key Anda (lihat di Member Area)                 | String    | Ya    |

**Tips:** Parameter tujuan bisa digabung dengan server_id (contoh: 12345678|2001) atau dipisah.

## Response
(Sama seperti metode POST)

---

# Webhook - POST/GET

Halaman ini menjelaskan format webhook (callback) yang kami kirimkan ke server Anda setiap kali ada perubahan status transaksi.

**Penting:** Pastikan IP kami sudah di-whitelist di server Anda: `188.166.243.56`

## Header
Setiap request webhook menyertakan header untuk validasi:

`X-TokoVoucher-Authorization: md5(MEMBER_CODE:SECRET:REF_ID)`

Contoh:
`"X-TokoVoucher-Authorization": "bd134207f74532a8b094676c4a2ca9ed"`

Gunakan header ini untuk memvalidasi bahwa request benar-benar dari Toko Voucher.

## Format Webhook

### Transaksi Sukses
```json
{
    "status": "sukses",
    "message": "Transaksi berhasil",
    "sn": "02806600001851150526",
    "ref_id": "tes12",
    "trx_id": "123jad",
    "produk": "FF5",
    "sisa_saldo": 1000000,
    "price": 10000
}
```

### Transaksi Gagal
```json
{
    "status": "gagal",
    "message": "Nomor tujuan tidak valid",
    "sn": "",
    "ref_id": "tes12",
    "trx_id": "123jad",
    "produk": "FF5",
    "sisa_saldo": 1000000,
    "price": 10000
}
```

## Penjelasan Field
| Field      | Deskripsi                                   |
| :--------- | :------------------------------------------ |
| status     | Status akhir transaksi (sukses atau gagal)  |
| message    | Pesan detail transaksi                      |
| sn         | Serial Number/kode voucher (jika ada)       |
| ref_id     | ID referensi dari Anda                      |
| trx_id     | ID transaksi dari Toko Voucher              |
| produk     | Kode produk yang dibeli                     |
| sisa_saldo | Sisa saldo Anda setelah transaksi           |
| price      | Harga transaksi                             |

## Tips Implementasi
1.  **Validasi Header** - Selalu cek header `X-TokoVoucher-Authorization` untuk memastikan request valid.
2.  **Response 200** - Pastikan server Anda mengembalikan HTTP 200 agar kami tahu webhook berhasil diterima.
3.  **Idempotency** - Simpan `trx_id` untuk menghindari pemrosesan duplikat jika webhook dikirim ulang.

---

# List Produk

Halaman ini menjelaskan cara mendapatkan daftar produk yang tersedia di Toko Voucher.

**Daftar Endpoint:**
*   List Kategori Produk - Melihat semua kategori produk
*   List Operator Produk - Melihat operator berdasarkan kategori
*   List Jenis Produk - Melihat jenis produk berdasarkan operator
*   List Produk - Melihat detail produk berdasarkan jenis

# Pencarian Produk

Anda juga bisa mencari produk langsung menggunakan kode produk atau prefix-nya.

Contoh:
*   FF - Menampilkan semua produk yang diawali dengan "FF" (Free Fire)
*   FF5 - Menampilkan produk spesifik dengan kode "FF5"

## Endpoint
**GET** `https://api.tokovoucher.net/produk/code?member_code=[member_code]&signature=[signature]&kode=[kode]`

## Parameter

| Parameter   | Deskripsi                                       | Tipe Data | Wajib |
| :---------- | :---------------------------------------------- | :-------- | :---- |
| member_code | Kode member Anda                                | String    | Ya    |
| kode        | Kode produk atau prefix (contoh: FF, FF5, ML)   | String    | Ya    |
| signature   | Signature default Anda (lihat di Member Area)   | String    | Ya    |

## Response Sukses
```json
{
    "status": 1,
    "rc": 200,
    "message": "Data Found",
    "data": [
        {
            "id": 2,
            "code": "FDT32",
            "category_name": "Voucher Game",
            "operator_produk": "Free Fire",
            "jenis_name": "jenis b",
            "nama_produk": "Free Fire",
            "deskripsi": "free fires",
            "price": 2500,
            "status": 1
        },
        {
            "id": 3,
            "code": "FDTE40",
            "category_name": "Voucher Game",
            "operator_produk": "Free Fire",
            "jenis_name": "jenis b",
            "nama_produk": "Free Fire",
            "deskripsi": "free fires",
            "price": 2500,
            "status": 1
        }
    ],
    "ts": 1665631083
}
```

## Response Gagal

### IP Tidak Diizinkan:
```json
{
    "status": 0,
    "error_msg": "Ip Not Allow"
}
```

### Signature Tidak Valid:
```json
{
    "status": 0,
    "error_msg": "Signature Invalid"
}
```

### Produk Tidak Ditemukan:
```json
{
    "status": 0,
    "rc": 500,
    "error_msg": "Kode Produk Tidak Ditemukan"
}
```
