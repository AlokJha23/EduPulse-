import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { initDB } from './server/db';
import { authRouter } from './server/routes/authRoutes';
import { teacherRouter } from './server/routes/teacherRoutes';
import { studentRouter } from './server/routes/studentRoutes';
import { commonRouter } from './server/routes/commonRoutes';

dotenv.config();

// Global process error guards
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize and seed database safely
  try {
    initDB();
  } catch (dbErr) {
    console.error('Database initialization warning:', dbErr);
  }

  // Middleware
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true, limit: '20mb' }));

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      platform: 'Academiq Education Suite',
    });
  });

  // Google Search Console HTML verification file
  app.get('/googleac5181451dced2dc.html', (_req, res) => {
    res.type('text/html').send('google-site-verification: googleac5181451dced2dc.html');
  });

  // API Routes
  app.use('/api/auth', authRouter);
  app.use('/api/teacher', teacherRouter);
  app.use('/api/student', studentRouter);
  app.use('/api', commonRouter);

  // 404 handler for unmatched API routes - guarantees API calls never fall through to Vite HTML
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.url}` });
  });

  // Global API error handler ensuring JSON responses
  app.use('/api', (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Unhandled API Error:', err);
    res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
  });

  // Vite integration in dev, Static serving in production
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = fs.existsSync(path.join(process.cwd(), 'dist', 'index.html'))
      ? path.join(process.cwd(), 'dist')
      : path.join(__dirname);

    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(200).send('Academiq application is starting. Please refresh in a moment.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Academiq Education Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});

