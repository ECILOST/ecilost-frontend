import { describe, expect, it } from 'vitest';
import { ProblemType, toProblem } from './problem-details';

describe('toProblem', () => {
  it('deja pasar el Problem Details de catalog tal cual', async () => {
    const body = {
      type: ProblemType.VERSION_CONFLICT,
      title: 'Conflicto de version',
      status: 409,
      detail: 'Otra persona edito el objeto',
    };

    const problem = await toProblem(
      new Response(JSON.stringify(body), { status: 409 }),
    );

    expect(problem).toEqual(body);
  });

  it('traduce el cuerpo de auth, que responde en el formato de OAuth', async () => {
    const response = new Response(
      JSON.stringify({ error: 'invalid_grant', message: 'La sesion expiro' }),
      { status: 401 },
    );

    const problem = await toProblem(response);

    expect(problem).toEqual({
      type: '/problems/invalid_grant',
      title: 'invalid_grant',
      status: 401,
      detail: 'La sesion expiro',
    });
  });

  it('traduce el cuerpo por defecto de Nest, que es el de wallet', async () => {
    const response = new Response(
      JSON.stringify({
        statusCode: 404,
        message: 'Wallet does not exist for this user',
        error: 'Not Found',
      }),
      { status: 404 },
    );

    const problem = await toProblem(response);

    expect(problem).toEqual({
      type: ProblemType.NOT_FOUND,
      title: 'Not Found',
      status: 404,
      detail: 'Wallet does not exist for this user',
    });
  });

  it('reparte en `errors` los mensajes que ValidationPipe manda en arreglo', async () => {
    // Es la forma que toma un 400 de wallet: `message` deja de ser una cadena. Sin este
    // caso, un arreglo acabaria en `detail`, que las pantallas pintan como texto.
    const response = new Response(
      JSON.stringify({
        statusCode: 400,
        message: ['amount must be a positive number'],
        error: 'Bad Request',
      }),
      { status: 400 },
    );

    const problem = await toProblem(response);

    expect(problem.type).toBe(ProblemType.VALIDATION);
    expect(problem.errors).toEqual(['amount must be a positive number']);
    expect(problem.detail).toBeUndefined();
  });

  it('no confunde el formato de Nest con el de auth, que tambien trae `error`', async () => {
    // Los dos llevan `error`; solo el de Nest lleva `statusCode`, y por ahi se distinguen.
    const auth = await toProblem(
      new Response(JSON.stringify({ error: 'invalid_grant' }), { status: 401 }),
    );

    expect(auth.title).toBe('invalid_grant');
  });

  it('no se cae cuando el error no trae JSON, como el 502 de un proxy', async () => {
    const problem = await toProblem(new Response('nope', { status: 502 }));

    expect(problem.status).toBe(502);
    expect(problem.type).toBe(ProblemType.INTERNAL);
  });
});
