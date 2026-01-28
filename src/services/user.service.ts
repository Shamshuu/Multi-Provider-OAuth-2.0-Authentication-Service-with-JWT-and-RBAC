import { query } from '../config/db';
import { AppError } from '../utils/AppError';
import bcrypt from 'bcrypt';

export interface User {
    id: string;
    name: string;
    email: string;
    password_hash?: string;
    role: string;
}

export class UserService {
    static async createUser(name: string, email: string, password?: string, role: string = 'user') {
        let passwordHash = null;
        if (password) {
            passwordHash = await bcrypt.hash(password, 10);
        }

        const text = `
      INSERT INTO users (name, email, password_hash, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, email, role
    `;
        const values = [name, email, passwordHash, role];

        const res = await query(text, values);
        return res.rows[0];
    }

    static async findByEmail(email: string): Promise<User | null> {
        const res = await query('SELECT * FROM users WHERE email = $1', [email]);
        if (res.rows.length === 0) return null;
        return res.rows[0];
    }

    static async findById(id: string): Promise<User | null> {
        const res = await query('SELECT * FROM users WHERE id = $1', [id]);
        if (res.rows.length === 0) return null;
        return res.rows[0];
    }

    static async updateName(id: string, name: string) {
        const res = await query('UPDATE users SET name = $1 WHERE id = $2 RETURNING id, name, email, role', [name, id]);
        return res.rows[0];
    }

    static async listAll() {
        const res = await query('SELECT id, name, email, role FROM users');
        return res.rows;
    }

    static async createAuthProvider(userId: string, provider: string, providerUserId: string) {
        const text = `
        INSERT INTO auth_providers (user_id, provider, provider_user_id)
        VALUES ($1, $2, $3)
        RETURNING *
      `;
        await query(text, [userId, provider, providerUserId]);
    }

    static async findByProvider(provider: string, providerUserId: string) {
        const text = `
        SELECT u.* 
        FROM users u
        JOIN auth_providers ap ON u.id = ap.user_id
        WHERE ap.provider = $1 AND ap.provider_user_id = $2
      `;
        const res = await query(text, [provider, providerUserId]);
        if (res.rows.length === 0) return null;
        return res.rows[0];
    }
}
