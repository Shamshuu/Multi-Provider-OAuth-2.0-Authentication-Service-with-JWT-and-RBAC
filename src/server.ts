import app from './app';
import { connectRedis } from './config/redis';
import pool from './config/db';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.API_PORT || 8080;

const startServer = async () => {
    try {
        // Connect to Redis
        await connectRedis();

        // Check DB connection
        const dbRes = await pool.query('SELECT NOW()');
        console.log(`Connected to Database at ${dbRes.rows[0].now}`);

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
};

startServer();
