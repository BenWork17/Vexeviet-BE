import express from 'express';
import cors from 'cors';
import routes from './routes';
import { getUploadDir } from './utils/image-upload';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'user-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Uploaded images (avatars, operator galleries). Gateway proxies /api/v1/uploads here.
app.use(
  '/api/v1/uploads',
  express.static(getUploadDir(), {
    index: false,
    dotfiles: 'deny',
    maxAge: '7d',
    setHeaders: (res) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('X-Content-Type-Options', 'nosniff');
    },
  })
);

app.use('/api/v1', routes);

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.USER_SERVICE_PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 User service running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});
