import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { PrismaModule } from '../src/prisma/prisma.module';
import { createTestUser } from './testUtils';

describe('Users (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let createdUserId: number;
  let prisma: PrismaService;
  let user;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule, PrismaModule.forRoot('.env.test')],
      providers: [PrismaService],
    }).compile();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    app = moduleFixture.createNestApplication();
    await app.init();

    await prisma.user.deleteMany();

    user = await createTestUser(app, 'userTest');
    authToken = user.access_token;
  });

  afterAll(async () => {
    await prisma.user.deleteMany();
    await app.close();
  });

  it('should create a new user (POST /users)', async () => {
    const userDto = {
      name: 'newUser',
      email: 'newuser@example.com',
      password: 'password123',
    };

    const response = await request(app.getHttpServer())
      .post('/users')
      .send(userDto)
      .expect(201);

    createdUserId = response.body.id;
    expect(response.body).toHaveProperty('id');
    expect(response.body.name).toBe(userDto.name);
    expect(response.body.email).toBe(userDto.email);
  });

  it('should get all users (GET /users)', async () => {
    const response = await request(app.getHttpServer())
      .get('/users')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body).toBeInstanceOf(Array);
  });

  it('should get a user by ID (GET /users/:id)', async () => {
    const response = await request(app.getHttpServer())
      .get(`/users/${createdUserId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body).toHaveProperty('id', createdUserId);
    expect(response.body.name).toBe('newUser');
  });

  it('should update a user (PATCH /users/:id)', async () => {
    const updateUserDto = {
      name: 'updatedUser',
      email: 'updateduser@example.com',
    };

    const response = await request(app.getHttpServer())
      .patch(`/users/${createdUserId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(updateUserDto)
      .expect(200);

    expect(response.body).toHaveProperty('id', createdUserId);
    expect(response.body.name).toBe(updateUserDto.name);
    expect(response.body.email).toBe(updateUserDto.email);
  });

  it('should delete a user (DELETE /users/:id)', async () => {
    await request(app.getHttpServer())
      .delete(`/users/${createdUserId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/users/${createdUserId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404);
  });
});
