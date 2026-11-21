import { Link } from 'react-router-dom';
import { routes } from '@/app/routes';
import { buttonClass } from './ui/button';
import { Notice } from './ui/notice';
import { Page } from './ui/page';

export function NotFound() {
  return (
    <Page>
      <Notice
        titleAs="h1"
        title="Esta dirección no existe"
        actions={
          <Link className={buttonClass('primary')} to={routes.home}>
            Ir al inicio
          </Link>
        }
      >
        Puede que lo que buscabas se haya retirado o que el enlace esté incompleto.
      </Notice>
    </Page>
  );
}
