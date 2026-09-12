// Runs `prisma migrate deploy` ONLY during a Vercel *production* build, so prod
// (Neon) always has pending migrations applied on deploy. Skips preview builds
// and local `npm run build` (VERCEL_ENV is unset there), which must never touch
// a database. Uses the datasource's DIRECT_URL (set in Vercel prod env).
import { execSync } from 'node:child_process';

const env = process.env.VERCEL_ENV ?? 'unset';
if (env === 'production') {
  console.log('▲ Vercel production build — applying Prisma migrations to prod DB…');
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
} else {
  console.log(`↷ Skipping prisma migrate deploy (VERCEL_ENV=${env}).`);
}
