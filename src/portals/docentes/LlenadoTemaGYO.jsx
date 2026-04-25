import LlenadoSemaforo from './LlenadoSemaforo';

/**
 * LlenadoTemaGYO — wrapper sobre LlenadoSemaforo con label "GYO".
 */
export default function LlenadoTemaGYO({ evaluacion, onRefetch }) {
  return (
    <LlenadoSemaforo
      evaluacion={evaluacion}
      tipoLabel="Ginecología y Obstetricia"
      onRefetch={onRefetch}
    />
  );
}
