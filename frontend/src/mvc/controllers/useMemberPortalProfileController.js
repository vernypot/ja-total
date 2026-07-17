import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import { useMemberPortal } from '../../context/MemberPortalContext';
import * as MemberPortalModel from '../models/memberPortal.model';
import * as MiembrosModel from '../models/miembros.model';
import { calcularEdad } from './useDatosPersonalesController';
import { memberDisplayName } from '../../utils/memberDisplayName';

const PROFILE_FIELDS = [
  { key: 'nombre', labelKey: 'firstName' },
  { key: 'apellido1', labelKey: 'lastName1Short' },
  { key: 'apellido2', labelKey: 'lastName2Short' },
  { key: 'nombre_opcional', labelKey: 'optionalName' },
  { key: 'apellido_opcional', labelKey: 'optionalLastName' },
  { key: 'fecha_nacimiento', labelKey: 'birthDate' },
  { key: 'genero', labelKey: 'gender' },
  { key: 'documento', labelKey: 'document' },
  { key: 'email', labelKey: 'email' },
  { key: 'telefono', labelKey: 'phone' },
  { key: 'celular', labelKey: 'cellphone' },
  { key: 'ciudad', labelKey: 'city' },
  { key: 'direccion', labelKey: 'address', fullWidth: true },
];

export function useMemberPortalProfileController() {
  const { t } = useLanguage();
  const { session } = useMemberPortal();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const displayPhotoUrl = useMemo(
    () => MiembrosModel.getMiembroPhotoDisplayUrl(profile?.foto_url),
    [profile?.foto_url]
  );

  const fullName = useMemo(() => memberDisplayName(profile), [profile]);

  async function load() {
    if (!session?.sessionToken) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    const { data, error: profileError } = await MemberPortalModel.fetchPortalProfile(session.sessionToken);
    if (profileError) {
      setError(profileError.message);
      setProfile(null);
      setLoading(false);
      return;
    }

    setProfile(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [session?.sessionToken]);

  return {
    profile,
    fullName,
    displayPhotoUrl,
    fields: PROFILE_FIELDS,
    clubs: profile?.clubes || [],
    iglesias: profile?.iglesias || [],
    error,
    loading,
    calcularEdad,
    t,
  };
}
