এলিট বাজার — Node 24 Secure Full Version

এই সংস্করণে:
• Node.js 24-compatible better-sqlite3 12.10.1
• Secure admin login, JWT + CSRF protection
• বাংলা storefront ও admin panel
• Laptop থেকে সর্বোচ্চ ৫টি product image upload
• Customer product image gallery (click, thumbnail, next/previous)
• Cart add/remove কাজ করে এবং stock অনুযায়ী quantity সীমিত
• Order submit হলে database transaction-এর মাধ্যমে stock কমে
• Stock 0 হলেই শুধু “স্টক আউট” দেখায়
• একাধিক customer একসাথে order করলেও stock oversell প্রতিরোধ
• Payment reject/order cancel করলে reserved stock একবার ফেরত যায়
• Admin থেকে product price/stock edit ও delete
• Admin থেকে bKash/Nagad number পরিবর্তন

চালানোর ধাপ:
1) ZIP extract করুন এবং ভেতরের elite_bazar_node24_fixed folder VS Code-এ খুলুন
2) Terminal: npm.cmd install
3) .env.example কপি করে .env করুন
4) .env-এ JWT_SECRET (কমপক্ষে 32 অক্ষর), ADMIN_EMAIL, ADMIN_PASSWORD দিন
5) npm.cmd run init-admin
6) npm.cmd start
7) Website: http://localhost:3000
8) Admin: http://localhost:3000/admin.html

নোট: পুরোনো data.sqlite এই সংস্করণে কপি করলে নতুন stock_released column স্বয়ংক্রিয়ভাবে যোগ হবে। Backup রাখা ভালো।
