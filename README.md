# OVN Production Management

> Hệ thống quản lý sản lượng và biến động 4M cho Ortholite Vietnam.
> Built with **Next.js 14 · Tailwind CSS · Supabase · Framer Motion**

---

## 🚀 Hướng Dẫn Cài Đặt

### Bước 1: Cài Node.js

Tải và cài bản **LTS** tại https://nodejs.org  
Sau khi cài xong, mở terminal/CMD và kiểm tra:

```bash
node --version   # v18+ hoặc v20+
npm --version
```

---

### Bước 2: Cài đặt dependencies

Mở terminal, trỏ vào thư mục dự án rồi chạy:

```bash
npm install
```

---

### Bước 3: Tạo Supabase project

1. Truy cập https://supabase.com → **New Project**
2. Đặt tên project, chọn region **Singapore** (gần Việt Nam nhất)
3. Vào **SQL Editor** → dán toàn bộ nội dung file `supabase/schema.sql` → **Run**

---

### Bước 4: Lấy Supabase Keys

Vào **Project Settings → API**:

| Thông tin cần lấy | Vị trí |
|---|---|
| `Project URL` | Mục "Project URL" |
| `anon public` key | Mục "Project API keys" |

---

### Bước 5: Tạo file `.env.local`

Tạo file `.env.local` trong thư mục gốc dự án (cùng cấp với `package.json`):

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...your-full-anon-key
```

---

### Bước 6: Chạy ứng dụng

```bash
npm run dev
```

Mở trình duyệt: **http://localhost:3000**

Đăng nhập thử với MSNV: `NV001` hoặc `QL001`

---

## 🌐 Triển Khai Lên Vercel

### Bước 1: Đẩy code lên GitHub

```bash
# Khởi tạo git (nếu chưa có)
git init
git add .
git commit -m "Initial commit: OVN Production App"

# Tạo repo trên github.com rồi kết nối:
git remote add origin https://github.com/YOUR_USERNAME/ovn-production.git
git branch -M main
git push -u origin main
```

### Bước 2: Deploy trên Vercel

1. Truy cập https://vercel.com → **Add New → Project**
2. Import repo GitHub vừa tạo
3. Vercel tự nhận đây là Next.js project
4. Vào **Environment Variables** → thêm 2 biến:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Click **Deploy** → ✅ Done!

---

## 📱 Tài Khoản Mẫu

| MSNV | Tên | Bộ phận |
|---|---|---|
| NV001 | Nguyễn Văn An | Chuyền 1 |
| NV002 | Trần Thị Bình | Chuyền 2 |
| NV003 | Lê Văn Cường | Chuyền 3 |
| NV004 | Phạm Thị Dung | QC |
| NV005 | Hoàng Văn Em | Chuyền 1 |
| QL001 | Lâm Supervisor | Giám Sát |

---

## 📐 Cấu Trúc Dự Án

```
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Redirect logic
│   │   ├── globals.css         # Global styles
│   │   ├── login/page.tsx      # Trang đăng nhập MSNV
│   │   └── dashboard/page.tsx  # Dashboard chính
│   ├── components/
│   │   ├── layout/Header.tsx   # Header sticky
│   │   ├── tabs/
│   │   │   ├── ProductionTab.tsx    # Tab Sản Lượng & KPI
│   │   │   └── Changelog4MTab.tsx  # Tab Biến Động 4M
│   │   └── ui/
│   │       ├── SuccessModal.tsx    # Animation thành công
│   │       └── ThemeToggle.tsx     # Dark/Light toggle
│   ├── lib/
│   │   ├── supabase.ts         # Supabase client
│   │   └── session.ts          # Session localStorage
│   └── types/index.ts          # TypeScript interfaces
├── supabase/schema.sql          # ← Chạy cái này trong Supabase
└── .env.local                   # ← Bạn tự tạo, điền key Supabase
```

---

## 🔧 Công Thức Tính KPI

```
Điểm Năng Suất = (Sản Lượng Thực / (Mục Tiêu/Giờ × Số Giờ Làm)) × 15
                 Tối đa 15 điểm
```

| Điểm | Đánh giá |
|---|---|
| ≥ 12 | 🟢 Xuất sắc |
| ≥ 8 | 🟡 Tốt |
| ≥ 4 | 🟠 Trung bình |
| < 4 | 🔴 Cần cải thiện |
