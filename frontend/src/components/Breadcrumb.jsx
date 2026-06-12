import { Link, useSearchParams, useLocation } from "react-router-dom";
import { useContext, useEffect, useState } from "react";
import { useLanguage } from "../hooks/useLanguage";
import { AuthContext } from "../context/AuthContext";
import { IglesiaContext } from "../context/IglesiaContext";
import { ClubContext } from "../context/ClubContext";
import { clubDisplayName } from "../utils/club";
import { getUserRole, isSuperAdmin, isAdminOrAbove } from "../utils/permissions";
import * as IglesiasModel from "../mvc/models/iglesias.model";

export default function Breadcrumb() {
  const [params] = useSearchParams();
  const location = useLocation();
  const { t } = useLanguage();
  const { user, userData } = useContext(AuthContext);
  const { activeIglesia } = useContext(IglesiaContext);
  const { activeClub } = useContext(ClubContext);
  const [iglesiaNombre, setIglesiaNombre] = useState('');
  const superadmin = isSuperAdmin(getUserRole(user, userData));
  const adminOrAbove = isAdminOrAbove(getUserRole(user, userData));

  const iglesiaId = params.get("iglesia") || activeIglesia;
  const clubId = params.get("club") || activeClub?.id;
  const onMembersPage = location.pathname.includes('/miembros');

  useEffect(() => {
    if (!iglesiaId) {
      setIglesiaNombre(userData?.iglesia_nombre || '');
      return;
    }
    IglesiasModel.fetchIglesiaById(iglesiaId).then(({ data }) => {
      setIglesiaNombre(data?.nombre || userData?.iglesia_nombre || '');
    });
  }, [iglesiaId, userData?.iglesia_nombre]);

  const churchLabel = iglesiaNombre || t('clubs');

  return (
    <div style={{ marginBottom: "10px", fontSize: '14px' }}>
      {superadmin ? (
        <Link to="/dashboard/iglesias">{t('churches')}</Link>
      ) : adminOrAbove ? (
        <Link to="/dashboard/iglesias">{t('myChurch')}</Link>
      ) : (
        <Link to="/dashboard/clubes">{t('clubs')}</Link>
      )}

      {iglesiaId && (
        <>
          {" > "}
          {superadmin ? (
            <Link to={`/dashboard/clubes?iglesia=${iglesiaId}`}>{churchLabel}</Link>
          ) : (
            <span>{churchLabel}</span>
          )}
        </>
      )}

      {!iglesiaId && superadmin && (
        <>
          {" > "}
          <Link to="/dashboard/clubes">{t('clubs')}</Link>
        </>
      )}

      {clubId && activeClub && (
        <>
          {" > "}
          <Link to={`/dashboard/miembros?club=${clubId}`}>
            {clubDisplayName(activeClub)}
          </Link>
        </>
      )}

      {onMembersPage && clubId && (
        <>
          {" > "}
          <span style={{ color: '#666' }}>{t('members')}</span>
        </>
      )}
    </div>
  );
}
