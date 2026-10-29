import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';

import errorHandler from './middlewares/error.middleware.js';

import authRoutes from './routes/auth.routes.js';
import productRoutes from './routes/product.routes.js';
import saleRoutes from './routes/sale.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import cashierRoutes from './routes/cashier.routes.js';
import heldCartRoutes from './routes/heldCart.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import reportRoutes from './routes/report.routes.js'; // <-- ADD THIS

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' } // Allows frontend to load images
}));
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Serve static files (Avatars and Logos)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/cashiers', cashierRoutes);
app.use('/api/suspended-carts', heldCartRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes); // <-- ADD THIS

// 404 Handler
app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

// Global Error Handler
app.use(errorHandler);

export default app;