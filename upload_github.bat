@echo off
echo ==========================================
echo      OTOMATIS UPLOAD KE GITHUB
echo ==========================================

echo [1/6] Inisialisasi Git...
git init

echo [2/6] Menambahkan semua file...
git add .

echo [3/6] Membuat Commit...
git commit -m "Upload Otomatis Market Web"

echo [4/6] Mengubah nama branch ke 'main'...
git branch -M main

echo [5/6] Menambahkan Remote Repository...
git remote remove origin 2>nul
git remote add origin https://github.com/garword/fucek.git

echo [6/6] Uploading ke GitHub (Push)...
echo.
echo NOTE: Jika diminta login, silakan login di browser yang muncul.
echo.
git push -u origin main

echo.
echo ==========================================
echo      SELESAI!
echo ==========================================
pause
