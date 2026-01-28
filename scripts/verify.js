const http = require('http');
const assert = require('assert');
const fs = require('fs');
const { join } = require('path');

const API_URL = 'http://localhost:8080/api';

// Helper to standard request
function request(method, path, body = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...headers,
            },
        };

        const req = http.request(API_URL + path, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = data ? JSON.parse(data) : {};
                    resolve({ status: res.statusCode, headers: res.headers, body: json });
                } catch (e) {
                    resolve({ status: res.statusCode, headers: res.headers, body: data });
                }
            });
        });

        req.on('error', reject);
        req.on('timeout', () => req.destroy());

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

// Colors
const PASSED = '\x1b[32mPASSED\x1b[0m';
const FAILED = '\x1b[31mFAILED\x1b[0m';

async function runTests() {
    console.log('Starting Evaluation...\n');
    let passed = 0;
    let total = 0;

    async function test(name, fn) {
        total++;
        process.stdout.write(`Tests ${total}: ${name}... `);
        try {
            await fn();
            console.log(PASSED);
            passed++;
        } catch (err) {
            console.log(FAILED);
            console.error('  Error:', err.message);
            if (err.response) console.error('  Response:', err.response);
        }
    }

    // check .env (Req 2)
    await test('Requirement 2: .env.example exists', async () => {
        if (!fs.existsSync(join(__dirname, '../.env.example'))) throw new Error('.env.example validation missing');
        const content = fs.readFileSync(join(__dirname, '../.env.example'), 'utf8');
        if (!content.includes('JWT_SECRET') || !content.includes('DATABASE_URL')) throw new Error('Missing keys in .env.example');
    });

    // check submission.json (Req 4)
    let adminCreds, userCreds;
    await test('Requirement 4: submission.json exists and valid', async () => {
        if (!fs.existsSync(join(__dirname, '../submission.json'))) throw new Error('submission.json missing');
        const sub = JSON.parse(fs.readFileSync(join(__dirname, '../submission.json'), 'utf8'));
        adminCreds = sub.testCredentials.adminUser;
        userCreds = sub.testCredentials.regularUser;
        if (!adminCreds || !userCreds) throw new Error('Invalid submission.json structure');
    });

    // Wait for healthcheck (Req 1)
    console.log('Waiting for service health...');
    // Simple retry loop
    for (let i = 0; i < 30; i++) {
        try {
            const res = await request('GET', '/../health'); // localhost:8080/health (not /api/health)
            // Correct URL tweak
            const healthRes = await new Promise((resolve) => {
                http.get('http://localhost:8080/health', (res) => resolve(res)).on('error', () => resolve({ statusCode: 500 }));
            });
            if (healthRes.statusCode === 200) break;
        } catch (e) { }
        await new Promise(r => setTimeout(r, 2000));
    }

    // Req 5: Register
    const newUser = {
        name: "New Recruits",
        email: `test${Date.now()}@example.com`,
        password: "AvailablePassword123!"
    };

    await test('Requirement 5: User Registration', async () => {
        const res = await request('POST', '/auth/register', newUser);
        if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}`);
        if (res.body.email !== newUser.email) throw new Error('Response email mismatch');

        // Duplicate check
        const res2 = await request('POST', '/auth/register', newUser);
        if (res2.status !== 409) throw new Error(`Expected 409 for duplicate, got ${res2.status}`);

        // Invalid check
        const res3 = await request('POST', '/auth/register', { ...newUser, email: 'invalid' });
        if (res3.status !== 400) throw new Error(`Expected 400 for invalid email, got ${res3.status}`);
    });

    // Req 6: Login
    let userTokens;
    await test('Requirement 6: User Login', async () => {
        const res = await request('POST', '/auth/login', { email: newUser.email, password: newUser.password });
        if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
        if (!res.body.accessToken || !res.body.refreshToken) throw new Error('Tokens missing');
        userTokens = res.body;

        const resFail = await request('POST', '/auth/login', { email: newUser.email, password: 'WrongPassword' });
        if (resFail.status !== 401) throw new Error(`Expected 401 for bad pass, got ${resFail.status}`);
    });

    // Req 10: Get Profile
    await test('Requirement 10: Get Profile', async () => {
        const res = await request('GET', '/users/me', null, { Authorization: `Bearer ${userTokens.accessToken}` });
        if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
        if (res.body.email !== newUser.email) throw new Error('Profile mismatch');

        const resFail = await request('GET', '/users/me');
        if (resFail.status !== 401) throw new Error(`Expected 401 no token, got ${resFail.status}`);
    });

    // Req 11: Update Profile
    await test('Requirement 11: Update Profile', async () => {
        const newName = "Updated Name";
        const res = await request('PATCH', '/users/me', { name: newName }, { Authorization: `Bearer ${userTokens.accessToken}` });
        if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
        if (res.body.name !== newName) throw new Error('Name not updated');

        // Verify persistence
        const resGet = await request('GET', '/users/me', null, { Authorization: `Bearer ${userTokens.accessToken}` });
        if (resGet.body.name !== newName) throw new Error('Update not persisted');
    });

    // Req 9: Refresh Token
    await test('Requirement 9: Refresh Token', async () => {
        const res = await request('POST', '/auth/refresh', { refreshToken: userTokens.refreshToken });
        if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
        if (!res.body.accessToken) throw new Error('Access token missing in refresh');

        // Update our token to the new one (optional, but good practice)
        // userTokens.accessToken = res.body.accessToken;

        const resFail = await request('POST', '/auth/refresh', { refreshToken: 'invalid' });
        if (resFail.status !== 401) throw new Error(`Expected 401 for invalid refresh, got ${resFail.status}`);
    });

    // Req 7: OAuth Redirects
    await test('Requirement 7: OAuth Redirects', async () => {
        const resGoogle = await request('GET', '/auth/google');
        // Node http client follows redirects by default? No, it doesn't.
        // But let's check basic response. Wait, http.request does NOT follow redirects automatically.
        // So checking status 302 is correct.
        // Actually `http.request` might return 302.
        if (resGoogle.status !== 302) throw new Error(`Expected 302 google, got ${resGoogle.status}`);
        if (!resGoogle.headers.location.includes('accounts.google.com')) throw new Error('Invalid Google Redirect');

        const resGithub = await request('GET', '/auth/github');
        if (resGithub.status !== 302) throw new Error(`Expected 302 github, got ${resGithub.status}`);
        if (!resGithub.headers.location.includes('github.com')) throw new Error('Invalid GitHub Redirect');
    });

    // Req 8: OAuth Callback Simulation
    await test('Requirement 8: OAuth Callback', async () => {
        // Simulate Google Callback with mock params
        const mockId = 'google123';
        const mockEmail = `google${Date.now()}@test.com`;
        const path = `/auth/google/callback?id=${mockId}&email=${mockEmail}&name=GoogleTest`;

        const res = await request('GET', path);
        if (res.status !== 200) throw new Error(`Expected 200 for callback, got ${res.status}`);
        if (!res.body.accessToken) throw new Error('Token missing in callback');

        // Login again (should exist)
        const res2 = await request('GET', path);
        if (res2.status !== 200) throw new Error(`Expected 200 for cleanup login, got ${res2.status}`);
    });

    // Req 12: RBAC
    await test('Requirement 12: RBAC', async () => {
        // Log in as Admin
        const resAdminLogin = await request('POST', '/auth/login', { email: adminCreds.email, password: adminCreds.password });
        if (resAdminLogin.status !== 200) throw new Error('Admin login failed');
        const adminToken = resAdminLogin.body.accessToken;

        // Access Users as Admin
        const resAdminAccess = await request('GET', '/users', null, { Authorization: `Bearer ${adminToken}` });
        if (resAdminAccess.status !== 200) throw new Error(`Expected 200 for admin, got ${resAdminAccess.status}`);
        if (!Array.isArray(resAdminAccess.body)) throw new Error('Expected array of users');

        // Access Users as Normal User (using previously created userTokens)
        const resUserAccess = await request('GET', '/users', null, { Authorization: `Bearer ${userTokens.accessToken}` });
        if (resUserAccess.status !== 403) throw new Error(`Expected 403 for user, got ${resUserAccess.status}`);
    });

    // Req 13: Rate Limiting
    await test('Requirement 13: Rate Limiting', async () => {
        // Send 10 failed requests
        const limit = 10;
        for (let i = 0; i < limit; i++) {
            await request('POST', '/auth/login', { email: 'spam@spam.com', password: 'spam' });
        }

        // 11th should be 429
        const res = await request('POST', '/auth/login', { email: 'spam@spam.com', password: 'spam' });
        if (res.status !== 429) throw new Error(`Expected 429, got ${res.status}`);

        if (!res.headers['x-ratelimit-remaining']) throw new Error('Rate limit headers missing');
    });

    console.log(`\nEvaluation Complete: ${passed}/${total} Passed.`);
}

runTests();
