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

  it('no se cae cuando el error no trae JSON, como el 502 de un proxy', async () => {
    const problem = await toProblem(new Response('nope', { status: 502 }));

    expect(problem.status).toBe(502);
    expect(problem.type).toBe(ProblemType.INTERNAL);
  });
});
