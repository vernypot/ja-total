import { useCallback, useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import * as EventosModel from '../mvc/models/eventos.model';
import * as UsuariosModel from '../mvc/models/usuarios.model';
import { buildLinkedMemberSelfEventRow } from '../utils/linkedMemberEventConfirmation';

export { buildLinkedMemberSelfEventRow };

export function useLinkedMemberEventConfirmation() {
  const { user, userData } = useContext(AuthContext);
  const [linkedMiembroId, setLinkedMiembroId] = useState(null);
  const [loadingLinkedMember, setLoadingLinkedMember] = useState(true);
  const [savingConfirmationId, setSavingConfirmationId] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadLinkedMember() {
      if (!user?.id && !userData?.id) {
        if (!cancelled) {
          setLinkedMiembroId(null);
          setLoadingLinkedMember(false);
        }
        return;
      }

      setLoadingLinkedMember(true);
      const { data, error } = await UsuariosModel.fetchCurrentUsuarioLinkedMiembro();

      if (cancelled) return;

      if (error) {
        setLinkedMiembroId(null);
        setLoadingLinkedMember(false);
        return;
      }

      setLinkedMiembroId(data?.id || null);
      setLoadingLinkedMember(false);
    }

    loadLinkedMember();

    return () => {
      cancelled = true;
    };
  }, [user?.id, userData?.id]);

  const buildSelfRow = useCallback((assignments, evento) => (
    buildLinkedMemberSelfEventRow(assignments, evento, linkedMiembroId)
  ), [linkedMiembroId]);

  const updateConfirmation = useCallback(async (eventoMiembroId, confirmacionEstado, eventoId = null) => {
    if (!eventoMiembroId && !eventoId) {
      return { error: new Error('Missing event assignment') };
    }
    if (!['confirmado', 'rechazado', 'pendiente'].includes(confirmacionEstado)) {
      return { error: new Error('Invalid confirmation status') };
    }

    const saveKey = EventosModel.memberConfirmationSaveKey({
      id: eventoMiembroId,
      evento_id: eventoId,
    });
    setSavingConfirmationId(saveKey);

    const { error } = await EventosModel.setLinkedUsuarioEventoConfirmacion(
      eventoMiembroId,
      confirmacionEstado,
      eventoId
    );
    setSavingConfirmationId(null);

    return { error: error || null };
  }, []);

  return {
    linkedMiembroId,
    loadingLinkedMember,
    savingConfirmationId,
    buildSelfRow,
    updateConfirmation,
    canMemberConfirmEvent: EventosModel.canMemberConfirmEvent,
    memberEventConfirmationResponded: EventosModel.memberEventConfirmationResponded,
    eventRequiresConfirmation: EventosModel.eventRequiresConfirmation,
  };
}
