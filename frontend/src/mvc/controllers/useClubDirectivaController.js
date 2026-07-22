import { useEffect, useState, useContext } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ClubContext } from '../../context/ClubContext';
import { useLanguage } from '../../hooks/useLanguage';
import { useListPagination } from '../../hooks/useListPagination';
import * as CargosModel from '../models/cargos.model';

export function useClubDirectivaController() {
  const { t } = useLanguage();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { updateActiveClub } = useContext(ClubContext);
  const clubId = params.get('club') || '';

  const [club, setClub] = useState(null);
  const [rows, setRows] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const {
    pageItems: paginatedRows,
    ...listPagination
  } = useListPagination(rows, [clubId]);

  async function load() {
    if (!clubId) {
      setError(t('clubDirectivaMissingClub'));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    const { club: clubData, rows: directivaRows, catalog: catalogRows, error: loadError } =
      await CargosModel.fetchClubDirectiva(clubId);

    if (loadError) {
      setError(`${t('errorLoadingClubDirectiva')}: ${loadError.message}`);
      setClub(clubData);
      setRows([]);
      setCatalog([]);
      setLoading(false);
      return;
    }

    setClub(clubData);
    setRows(directivaRows || []);
    setCatalog(catalogRows || []);

    if (clubData) {
      updateActiveClub({
        id: clubData.id,
        nombre: clubData.nombre,
        tipoId: clubData.tipo_id || clubData.tipos_club?.id,
        tipoNombre: clubData.tipos_club?.nombre,
        logo_url: clubData.logo_url,
        tipoLogoUrl: clubData.tipos_club?.logo_url,
      });
    }

    setLoading(false);
  }

  function navigateToMember(miembroId) {
    navigate(`/dashboard/miembro/${miembroId}/cargos?club=${clubId}`);
  }

  useEffect(() => {
    load();
  }, [clubId]);

  return {
    club,
    rows: paginatedRows,
    listPagination,
    error,
    loading,
    clubId,
    navigateToMember,
    memberDisplayName: CargosModel.memberDisplayName,
    getCargoPath: cargoId => CargosModel.getCargoPath(cargoId, catalog),
  };
}
