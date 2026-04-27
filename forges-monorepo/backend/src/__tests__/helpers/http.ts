import { NextFunction, Request, Response } from 'express';

type MockRequestInput = Omit<Partial<Request>, 'user'> & {
  user?: any;
};

export function createMockReq(overrides: MockRequestInput = {}) {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    ip: '127.0.0.1',
    user: {
      userId: 'user-01',
      role: 'ADMIN',
      langue: 'FR',
    },
    ...overrides,
  } as Partial<Request> as Request;
}

export function createMockRes() {
  const res = {} as Response & {
    status: jest.Mock;
    json: jest.Mock;
    send: jest.Mock;
    setHeader: jest.Mock;
  };

  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);

  return res;
}

export function createNext() {
  return jest.fn() as jest.MockedFunction<NextFunction>;
}
