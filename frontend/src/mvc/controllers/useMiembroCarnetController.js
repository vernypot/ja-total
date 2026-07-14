import { useEffect, useState, useMemo, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { useLanguage } from '../../hooks/useLanguage';
import { getUserRole, canManageChurchData } from '../../utils/permissions';
import * as MiembrosModel from '../models/miembros.model';
import * as DatosMedicosModel from '../models/datosMedicos.model';
import * as CarnetModel from '../models/carnet.model';

export function useMiembroCarnetController(miembroId) {
  const { language } = useLanguage();
  const { user, userData } = useContext(AuthContext);
  const canManage = canManageChurchData(getUserRole(user, userData));
  const [member, setMember] = useState(null);
  const [medical, setMedical] = useState(null);
  const [clubs, setClubs] = useState([]);
  const [selectedClubId, setSelectedClubId] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [cardExpiresAt, setCardExpiresAt] = useState(() => CarnetModel.addOneYear(new Date()));

  const selectedClub = useMemo(
    () => clubs.find(c => c.id === selectedClubId) || clubs[0] || null,
    [clubs, selectedClubId]
  );

  const fullName = useMemo(() => CarnetModel.memberFullName(member), [member]);
  const bloodType = useMemo(
    () => CarnetModel.formatBloodType(medical?.tipo_sangre, medical?.factor_rh),
    [medical]
  );

  const expirationLabel = useMemo(
    () => CarnetModel.formatCarnetExpirationDate(cardExpiresAt, language),
    [cardExpiresAt, language]
  );

  async function load() {
    if (!miembroId) return;
    setLoading(true);
    setError('');

    const [
      { data: memberData, error: memberError },
      { data: medicalData },
      { data: clubRows },
      { data: tokenData, error: tokenError },
    ] = await Promise.all([
      MiembrosModel.fetchMiembroById(miembroId),
      DatosMedicosModel.fetchDatosMedicosByMiembro(miembroId),
      MiembrosModel.fetchMiembroClubsWithLogos(miembroId),
      CarnetModel.getOrCreateProfileToken(miembroId),
    ]);

    if (memberError) {
      setError('Error loading member: ' + memberError.message);
      setLoading(false);
      return;
    }

    setMember(memberData);
    setMedical(medicalData);
    setClubs(clubRows || []);
    if (clubRows?.length && !selectedClubId) {
      setSelectedClubId(clubRows[0].id);
    }

    if (tokenError) {
      setError('Error loading QR token: ' + tokenError.message);
    } else {
      setToken(tokenData || '');
    }

    setLoading(false);
  }

  function printCard() {
    CarnetModel.triggerCarnetPrint(() => {
      setCardExpiresAt(CarnetModel.addOneYear(new Date()));
    });
  }

  useEffect(() => {
    load();
  }, [miembroId]);

  useEffect(() => {
    if (clubs.length && !clubs.some(c => c.id === selectedClubId)) {
      setSelectedClubId(clubs[0].id);
    }
  }, [clubs, selectedClubId]);

  return {
    member,
    medical,
    clubs,
    selectedClub,
    selectedClubId,
    setSelectedClubId,
    token,
    setToken,
    fullName,
    bloodType,
    expirationLabel,
    canManage,
    error,
    loading,
    printCard,
  };
}
