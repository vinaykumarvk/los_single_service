import express from 'express';
import { json } from 'express';

const app = express();
app.use(json());

app.get('/health', (_req, res) => res.status(200).send('OK'));

// Placeholder endpoints for products/rates/fees/documents (maker-checker later)
app.get('/api/masters/products', (_req, res) => {
  res.status(200).json([]);
});

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3004;
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Masters service listening on ${port}`);
});


