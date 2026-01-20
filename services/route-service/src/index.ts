import express from 'express';
import { config } from '@vexeviet/config';

const app = express();

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'route-service' });
});

const PORT = config.port || 3002;

app.listen(PORT, () => {
  console.log(`Route service running on port ${PORT}`);
});
