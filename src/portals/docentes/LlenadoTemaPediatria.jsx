import LlenadoSemaforo from './LlenadoSemaforo';

/**
 * LlenadoTemaPediatria — wrapper sobre LlenadoSemaforo con label "Pediatría".
 *
 * Pediatría tiene 9 temas con hasta 9 dimensiones por tema. El componente compartido
 * ya usa accordion (LlenadoSemaforo abre solo la dimensión activa) para que la UI
 * no muestre todo a la vez.
 */
export default function LlenadoTemaPediatria({ evaluacion, onRefetch }) {
  return (
    <LlenadoSemaforo
      evaluacion={evaluacion}
      tipoLabel="Pediatría"
      onRefetch={onRefetch}
    />
  );
}
