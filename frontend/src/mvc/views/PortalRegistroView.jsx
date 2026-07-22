import DatosMedicosView from './DatosMedicosView';
import MiembroDistincionesView from './MiembroDistincionesView';
import MiembroCargosView from './MiembroCargosView';

export default function PortalRegistroView({
  medicalProps,
  distincionesProps,
  cargosProps,
}) {
  return (
    <div className="portal-registro">
      <section className="portal-registro__section">
        <DatosMedicosView {...medicalProps} />
      </section>

      <section className="portal-registro__section">
        <MiembroDistincionesView {...distincionesProps} />
      </section>

      <section className="portal-registro__section">
        <MiembroCargosView {...cargosProps} />
      </section>
    </div>
  );
}
