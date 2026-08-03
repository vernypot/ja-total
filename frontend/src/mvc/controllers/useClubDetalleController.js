import { useEffect, useState, useContext } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { ClubContext } from '../../context/ClubContext';
import { getUserRole, canManageClubs } from '../../utils/permissions';
import { validateForm } from '../../utils/validateForm';
import { emptyClubCuotaForm } from '../../utils/cuota';
import { CUOTA_FRECUENCIA_VALUES } from '../../constants/cuotaFrequencies';
import { useLanguage } from '../../hooks/useLanguage';
import * as ClubesModel from '../models/clubes.model';
import * as IglesiasModel from '../models/iglesias.model';

export function useClubDetalleController() {
  const { t } = useLanguage();
  const { clubId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, userData } = useContext(AuthContext);
  const { updateActiveClub } = useContext(ClubContext);
  const canManage = canManageClubs(getUserRole(user, userData));

  const [club, setClub] = useState(null);
  const [iglesia, setIglesia] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [logoUploading, setLogoUploading] = useState({ kind: '' });
  const [cuotaForm, setCuotaForm] = useState(emptyClubCuotaForm());
  const [cuotaFieldErrors, setCuotaFieldErrors] = useState({});
  const [savingCuota, setSavingCuota] = useState(false);

  const iglesiaQuery = params.get('iglesia') || club?.iglesia_id || '';

  async function load() {
    if (!clubId) {
      setError(t('clubDetailsMissingClub'));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    const { data: clubData, error: clubError } = await ClubesModel.fetchClubById(clubId);
    if (clubError || !clubData) {
      setError(clubError?.message || t('clubDetailsMissingClub'));
      setClub(null);
      setStats(null);
      setLoading(false);
      return;
    }

    setClub(clubData);
    setCuotaForm(emptyClubCuotaForm(clubData));
    updateActiveClub({
      id: clubData.id,
      nombre: clubData.nombre,
      tipoId: clubData.tipo_id || clubData.tipos_club?.id,
      tipoNombre: clubData.tipos_club?.nombre,
      logo_url: clubData.logo_url,
      tipoLogoUrl: clubData.tipos_club?.logo_url,
    });

    const iglesiaId = clubData.iglesia_id || iglesiaQuery;
    const requests = [
      ClubesModel.fetchClubDetailStats(clubData),
      iglesiaId ? IglesiasModel.fetchIglesiaById(iglesiaId) : Promise.resolve({ data: null }),
    ];

    const [{ stats: detailStats, error: statsError }, { data: iglesiaData }] = await Promise.all(requests);
    setStats(detailStats);
    setIglesia(iglesiaData || null);

    if (statsError) {
      console.error('Error loading club detail stats:', statsError);
    }

    setLoading(false);
  }

  function backToListing() {
    const query = iglesiaQuery ? `?iglesia=${iglesiaQuery}` : '';
    navigate(`/dashboard/clubes${query}`);
  }

  function navigateToMiembros() {
    navigate(`/dashboard/miembros?club=${clubId}`);
  }

  function navigateToEventos() {
    navigate(`/dashboard/eventos?club=${clubId}`);
  }

  function navigateToUnidades() {
    navigate(`/dashboard/unidades?club=${clubId}`);
  }

  function navigateToDirectiva() {
    navigate(`/dashboard/club-directiva?club=${clubId}`);
  }

  async function handleClubLogoUpload(file) {
    if (!canManage || !clubId) return;
    setError('');
    setLogoUploading({ kind: 'club' });
    const { error: uploadError, errorStage } = await ClubesModel.uploadClubLogo(clubId, file);
    setLogoUploading({ kind: '' });
    if (uploadError) {
      const prefix = errorStage === 'database' ? t('errorSavingClubLogo') : t('errorUploadingClubLogo');
      setError(`${prefix}: ${uploadError.message}`);
      return;
    }
    await load();
  }

  async function handleClubLogoRemove() {
    if (!canManage || !club) return;
    setError('');
    setLogoUploading({ kind: 'club' });
    const { error: removeError } = await ClubesModel.removeClubLogo(club.id, club.logo_url);
    setLogoUploading({ kind: '' });
    if (removeError) {
      setError(`${t('errorRemovingClubLogo')}: ${removeError.message}`);
      return;
    }
    await load();
  }

  async function handleTipoLogoUpload(file) {
    if (!canManage || !club?.tipo_id) return;
    setError('');
    setLogoUploading({ kind: 'tipo' });
    const { error: uploadError, errorStage } = await ClubesModel.uploadTipoClubLogo(club.tipo_id, file);
    setLogoUploading({ kind: '' });
    if (uploadError) {
      const prefix = errorStage === 'database' ? t('errorSavingClubLogo') : t('errorUploadingClubLogo');
      setError(`${prefix}: ${uploadError.message}`);
      return;
    }
    await load();
  }

  async function handleTipoLogoRemove() {
    if (!canManage || !club?.tipo_id) return;
    setError('');
    setLogoUploading({ kind: 'tipo' });
    const { error: removeError } = await ClubesModel.removeTipoClubLogo(
      club.tipo_id,
      club.tipos_club?.logo_url
    );
    setLogoUploading({ kind: '' });
    if (removeError) {
      setError(`${t('errorRemovingClubLogo')}: ${removeError.message}`);
      return;
    }
    await load();
  }

  async function saveClubCuota() {
    if (!canManage || !clubId) return;
    setError('');
    const validation = validateForm('clubCuota', cuotaForm, t);
    setCuotaFieldErrors(validation.fieldErrors);
    if (!validation.valid) {
      setError(validation.firstError);
      return;
    }

    setSavingCuota(true);
    const { error: saveError } = await ClubesModel.updateClubCuota(clubId, cuotaForm);
    setSavingCuota(false);
    if (saveError) {
      setError(`${t('errorSavingClubCuota')}: ${saveError.message}`);
      return;
    }
    await load();
  }

  useEffect(() => {
    load();
  }, [clubId]);

  return {
    club,
    iglesia,
    stats,
    error,
    loading,
    canManage,
    logoUploading,
    backToListing,
    navigateToMiembros,
    navigateToEventos,
    navigateToUnidades,
    navigateToDirectiva,
    handleClubLogoUpload,
    handleClubLogoRemove,
    handleTipoLogoUpload,
    handleTipoLogoRemove,
    cuotaForm,
    setCuotaForm,
    cuotaFieldErrors,
    savingCuota,
    saveClubCuota,
    cuotaFrequencyOptions: CUOTA_FRECUENCIA_VALUES,
  };
}
