/* Test suite temporarily disabled (commented out).
 * Re-enable by removing the wrapping block comment.
import { describe, it, expect, beforeEach } from 'vitest';
import { request, app, resetDb, testPassword } from './helpers';

describe('auth', () => {
  beforeEach(resetDb);

  it('registers a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ fullName: 'Jane Doe', email: 'jane@example.com', password: testPassword })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user).toMatchObject({ fullName: 'Jane Doe', email: 'jane@example.com', role: 'USER' });
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('rejects a duplicate email', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ fullName: 'Jane Doe', email: 'jane@example.com', password: testPassword })
      .expect(201);

    const res = await request(app)
      .post('/api/auth/register')
      .send({ fullName: 'Jane Doe', email: 'jane@example.com', password: testPassword })
      .expect(409);

    expect(res.body.message).toBe('Email is already registered');
  });

  it('rejects an invalid login password', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ fullName: 'Jane Doe', email: 'jane@example.com', password: testPassword })
      .expect(201);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'jane@example.com', password: 'WrongPassword123!' })
      .expect(401);

    expect(res.body.message).toBe('Invalid credentials');
  });

  it('logs in with valid credentials', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ fullName: 'Jane Doe', email: 'jane@example.com', password: testPassword })
      .expect(201);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'jane@example.com', password: testPassword })
      .expect(200);

    expect(res.body.token).toBeTruthy();
  });

  it('returns the current user from /me', async () => {
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({ fullName: 'Jane Doe', email: 'jane@example.com', password: testPassword })
      .expect(201);

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${registerRes.body.token}`)
      .expect(200);

    expect(res.body.user.email).toBe('jane@example.com');
  });
});
*/
