A. Persiapan
Pertama Anda bisa lakukan dengan mendaftar/login. Setelah itu mulailah dengan membuat Proyek.

A.1. Proyek
Proyek adalah identitas dari aplikasi/website Anda. Jadi, dengan satu akun Pakasir, Anda dapat mengintegrasikan untuk banyak website/aplikasi. Yaitu dengan membuat proyek untuk masing-masing website/aplikasi.

Yang perlu dicatat disini adalah Slug dan Api Key dari proyek Anda. Kedua hal ini nantinya akan Anda butuhkan untuk melakukan integrasi.

B. Integrasi Via URL
Untuk mengarahkan pelanggan Anda ke halaman pembayaran, cukup gunakan URL berikut:

https://app.pakasir.com/pay/{slug}/{amount}?order_id={order_id}
slug diambil dari proyek yang Anda miliki
amount merupakan nominal transaksi tanpa titik dan spasi. contoh: 100000 atau 25000
order_id adalah ID dari transaksi atau invoice di sistem Anda. contoh: INV20240910-123456 atau 1298
Berikut adalah contoh penggunaan yang benar:

https://app.pakasir.com/pay/depodomain/22000?order_id=240910HDE7C9
B.1. Opsi: Custom Redirect
Akan muncul tombol [Kembali ke halaman merchant] setelah user berhasil melakukan pembayaran. Dan defaultnya akan diarahkan ke halaman sebelumnya.

Untuk mengarahkan user ke halaman khusus, tambahkan redirect=https://websitekamu.com/tujuan pada URL.

https://app.pakasir.com/pay/depodomain/22000?order_id=240910HDE7C9&redirect=https://app.depodomain.com/invoices
B.2. Opsi: Hanya QRIS
Untuk mengaktifkan hanya QRIS, sehingga pengunjung langsung melihat QR code dan tidak bisa mengubah ke metode pembayaran lain.

Tambahkan qris_only=1 pada URL.

https://app.pakasir.com/pay/depodomain/22000?order_id=240910HDE7C9&qris_only=1
B.3. Opsi: Paypal
Jika Anda ingin langsung mengarahkan customer ke halaman pembayaran via Paypal, maka cukup ganti url /pay/ dengan /paypal/.

Contoh:

https://app.pakasir.com/paypal/depodomain/22000?order_id=240910HDE7C9
C. Integrasi Via API
Disini Anda membutuhkan API Key yang terdapat di halaman detail Proyek.

C.1. Penjelasan
Integrasi via API, artinya kami akan mengirimkan detail berikut:

QR string atau nomor Virtual Account
Total Pembayaran
Waktu kadaluarsa (Expired)
Untuk menampilkan Kode QR atau Nomor Virtual Account dan Nominal kepada pengguna, menjadi tanggung jawab Anda. Anda bisa menggunakan library yang mengubah QR string menjadi gambar.

C.2. API: Transaction create
Method: POST
URL: https://app.pakasir.com/api/transactioncreate/{method}
Body (JSON):
{
    "project": "depodomain",
    "order_id": "INV123123",
    "amount": 99000,
    "api_key": "xxx123"
}
Contoh penggunaannya dengan CURL:

curl -L 'https://app.pakasir.com/api/transactioncreate/qris' \
-H 'Content-Type: application/json' \
-d '{
    "project": "depodomain",
    "order_id": "INV123123",
    "amount": 99000,
    "api_key": "xxx123"
}'
Untuk responsenya kurang lebih seperti berikut:

{
    "payment": {
        "project": "depodomain",
        "order_id": "INV123123",
        "amount": 99000,
        "fee": 1003,
        "total_payment": 100003,
        "payment_method": "qris",
        "payment_number": "00020101021226610016ID.CO.SHOPEE.WWW01189360091800216005230208216005230303UME51440014ID.CO.QRIS.WWW0215ID10243228429300303UME5204792953033605409100003.005802ID5907Pakasir6012KAB. KEBUMEN61055439262230519SP25RZRATEQI2HQ65Q46304A079",
        "expired_at": "2025-09-19T01:18:49.678622564Z"
    }
}
C.3. Pilihan Payment Method
cimb_niaga_va
bni_va
qris
sampoerna_va
bnc_va
maybank_va
permata_va
atm_bersama_va
artha_graha_va
bri_va
paypal
C.4. API: Payment simulation
Jika proyek Anda masih di mode Sandbox, Anda dapat lakukan simulasi pembayaran untuk mengetes webhook.

Method: POST
URL: https://app.pakasir.com/api/paymentsimulation
Body (JSON):
{
    "project": "depodomain",
    "order_id": "INV123123",
    "amount": 99000,
    "api_key": "xxx123"
}
Contoh penggunaannya dengan CURL:

curl -L 'https://app.pakasir.com/api/paymentsimulation' \
-H 'Content-Type: application/json' \
-d '{
    "project": "depodomain",
    "order_id": "INV123123",
    "amount": 99000,
    "api_key": "xxx123"
}'
C.5. API: Transaction Cancel
Anda dapat membatalkan transaksi jika memang dibutuhkan. Silakan gunakan API berikut untuk melakukannya:

Method: POST
URL: https://app.pakasir.com/api/transactioncancel
Body (JSON):
{
    "project": "depodomain",
    "order_id": "INV123123",
    "amount": 99000,
    "api_key": "xxx123"
}
Contoh penggunaannya dengan CURL:

curl -L 'https://app.pakasir.com/api/transactioncancel' \
-H 'Content-Type: application/json' \
-d '{
    "project": "depodomain",
    "order_id": "INV123123",
    "amount": 99000,
    "api_key": "xxx123"
}'
D. Webhook
Ketika pelanggan berhasil melakukan pembayaran dan dana masuk ke sistem kami, maka kami akan memberitahukan sistem Anda melalui webhook.

Kami akan mengirimkan http POST dengan struktur body sebagai berikut:

{
  "amount": 22000,
  "order_id": "240910HDE7C9",
  "project": "depodomain",
  "status": "completed",
  "payment_method": "qris",
  "completed_at": "2024-09-10T08:07:02.819+07:00"
}
Untuk menerima webhook tersebut, silakan isi Webhook URL pada proyek Anda (yaitu melalui form Edit Proyek).

Penting: Saat menerima webhook pastikan amount dan order_id sesuai dengan transaksi di sistem Anda. Kami sarankan untuk tetap menggunakan API dibawah ini untuk pengecekan status yang lebih valid.

E. Transaction Detail API
Untuk mengetahui status sebuah transaksi Anda bisa lakukan melalui API ini. Disini Anda membutuhkan API Key yang terdapat di halaman detail Proyek.

Berikut ini adalah API yang bisa Anda panggil:

GET https://app.pakasir.com/api/transactiondetail?project={slug}&amount={amount}&order_id={order_id}&api_key={api_key}
Contoh penggunaan yang benar dengan CURL:

curl https://app.pakasir.com/api/transactiondetail?project=depodomain&amount=22000&order_id=240910HDE7C9&api_key=JHGejwhe237dkhjeukyw8e33
Untuk response yang akan Anda dapatkan kurang lebih seperti berikut:

{
  "transaction": {
    "amount": 22000,
    "order_id": "240910HDE7C9",
    "project": "depodomain",
    "status": "completed",
    "payment_method": "qris",
    "completed_at": "2024-09-10T08:07:02.819+07:00"
  }
}
F. Wordpress Plugin
1. WooComerce
Silakan cari "Pakasir" atau langsung menuju halaman plugin Pakasir for WooCommerce.

2. EDD
Silakan download file zip disini, lalu upload ke halaman plugin. Panduan: Pakasir for EDD

3. FluentCart
Silakan download file zip disini, lalu upload ke halaman plugin. Panduan:
Pakasir for FluentCart

G. Node.js Package
Untuk pengguna node.js, kalian dapat menggunakan pakasir-sdk berikut:

https://github.com/zeative/pakasir-sdk

H. Metode Pembayaran Paypal
Untuk pembayaran dengan metode Paypal sebenarnya cukup sederhana. Kami memiliki kurs tetap yaitu: Rp 15.000 per USD.

Karena sistem pakasir pakai rupiah, maka pengguna perlu mengirimkan amount dalam rupiah. meskipun di aplikasi/website pengguna menggunakan USD.

Contoh:

Produk A dijual seharga $5. Maka pengguna perlu membuat transaksi di pakasir (via API atau URL), dengan amount Rp 75.000.

Fee Paypal
Untuk fee paypal terdiri dari 2 hal berikut:

Fee dari Pakasir: Rp 3.000 ($0.20)
Fee dari Paypal: 4.4% + $0.30 (bisa cek disini)
Jadi, untuk contoh produk seharga $5, total amount yang harus pembeli bayar adalah $5 + $0.75 = $5.75 
