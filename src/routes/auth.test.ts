/* eslint-disable  @typescript-eslint/no-explicit-any, import/no-extraneous-dependencies */
import supertest from 'supertest';
// @ts-ignore
import session from 'supertest-session';
import app from '../app';
// @ts-ignore
import TestSetup from '../test/testSetup';
import TestConstants from '../test/testConstants';
import { UserDocument } from '../models/user';
import DoneCallback = jest.DoneCallback;

const api = supertest(app);
const testSession = session(app);
let authenticatedAPI: any;

let user: UserDocument;

beforeAll(async (done: DoneCallback) => {
  await TestSetup.initTestDatabase();
  user = await TestSetup.insertTestUser();
  testSession
    .post('/api/auth/login/')
    .send({
      username: TestConstants.initialUser.username,
      password: TestConstants.initialUser.password,
    })
    .end((error: any) => {
      if (error) {
        return done();
      }
      authenticatedAPI = testSession;
      return done();
    });
});

/*
Timeout needed
https://github.com/facebook/jest/issues/8554
*/
afterAll(async (done: DoneCallback) => {
  await TestSetup.closeTestDatabase(done);
});

describe('Login', () => {
  it('Login fails with invalid username', async () => {
    const result = await api
      .post('/api/auth/login/')
      .send({
        username: 'wrongUsername',
        password: TestConstants.initialUser.password,
      })
      .expect(401);

    const errorMessage = JSON.parse(
      JSON.stringify({ error: 'invalid username or password' }),
    );
    expect(result.body)
      .toEqual(errorMessage);
  });

  it('Login fails with invalid password', async () => {
    const result = await api
      .post('/api/auth/login/')
      .send({
        username: TestConstants.initialUser.username,
        password: 'wrongPassword',
      })
      .expect(401);

    const errorMessage = JSON.parse(
      JSON.stringify({ error: 'invalid username or password' }),
    );
    expect(result.body)
      .toEqual(errorMessage);
  });

  it('Login succeeds with valid credentials', async () => {
    const result = await api
      .post('/api/auth/login/')
      .send({
        username: 'username',
        password: 'password',
      })
      .expect(200);

    const expectedResult = {
      // eslint-disable-next-line no-underscore-dangle
      id: user._id.toString(),
      name: user.name,
      username: user.username,
    };

    expect(result.body)
      .toEqual(expectedResult);
  });
});

describe('Session', () => {
  it('Fetch session fails without valid session', async () => {
    const result = await api.get('/api/auth/session/')
      .expect(401);

    const errorMessage = JSON.parse(
      JSON.stringify({ error: 'Session is invalid' }),
    );
    expect(result.body)
      .toEqual(errorMessage);
  });

  it('Fetch session succeeds with valid session', async () => {
    const result = await authenticatedAPI
      .get('/api/auth/session/')
      .expect(200);

    const expectedResult = JSON.parse(JSON.stringify({
      // eslint-disable-next-line no-underscore-dangle
      id: user._id.toString(),
      name: user.name,
      username: user.username,
    }));

    expect(result.body)
      .toEqual(expectedResult);
  });
});

describe('Logout', () => {
  it('Logout destroys session', async () => {
    await authenticatedAPI.post('/api/auth/login/')
      .send({
        username: 'username',
        password: 'password',
      })
      .expect(200);

    await testSession
      .post('/api/auth/logout/')
      .expect('Location', '/');
  });
});
