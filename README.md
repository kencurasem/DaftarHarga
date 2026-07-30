# KodeHarga

Web pencarian dua arah untuk 1.000 nominal harga:

- Rp1.000 sampai Rp1.000.000 dengan kenaikan Rp1.000.
- Setiap harga memiliki satu kode unik 4 karakter.
- Cari menggunakan harga (`25000`, `25.000`, `25k`) atau kode (`K7M4`).
- Daftar kode dan harga dapat dibuka per halaman atau diunduh sebagai CSV.

## Deploy ke Vercel

1. Ekstrak file ZIP.
2. Unggah isi folder ke repository GitHub.
3. Buka Vercel, pilih **Add New Project**, lalu impor repository tersebut.
4. Klik **Deploy** tanpa mengubah pengaturan build.

Atau jalankan `npx vercel` dari folder ini.

## Menjalankan lokal

```bash
npm install
npm run dev
```

Kode unik di proyek ini merupakan penanda harga, bukan token keamanan atau
autentikasi.
