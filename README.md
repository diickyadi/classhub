# ClassHub

**Smart Assignment Submission Platform**

ClassHub adalah platform pengumpulan tugas yang membantu peserta mengirimkan tugas secara terstruktur dan membantu mentor mengelola serta memantau pengumpulan tugas.

## Tech Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Supabase (Auth, PostgreSQL, Storage)
- Vercel

## Requirements

- Node.js 22+
- npm

## Getting Started

1. Clone repository.
2. Jalankan `npm install`.
3. Salin `.env.example` menjadi `.env.local`.
4. Isi kredensial Supabase di `.env.local`.
5. Jalankan `npm run dev`.
6. Buka http://localhost:3000.

## Available Scripts

- `npm run dev`
- `npm run lint`
- `npm run build`
- `npm run start`

## Security Notes

- Jangan commit `.env.local`.
- Jangan mengekspos Supabase secret key ke browser.
- Terapkan server-side authorization pada setiap endpoint.
- Terapkan Row Level Security (RLS).
- Gunakan private Storage bucket untuk file submission.

## Project Status

Initial project setup and Supabase integration foundation.