import { useContext, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useLanguage } from '../../hooks/useLanguage';
import { AuthContext } from '../../context/AuthContext';
import { ClubContext } from '../../context/ClubContext';
import { useMemberPortal } from '../../context/MemberPortalContext';
import { useScopedIglesia } from '../../hooks/useScopedIglesia';
import * as LandingModel from '../models/landing.model';
import * as NoticiasModel from '../models/noticias.model';

export function usePublicNoticiaController() {
  const { id } = useParams();
  const { language, t } = useLanguage();
  const { user } = useContext(AuthContext);
  const { activeClub } = useContext(ClubContext);
  const { session: portalSession } = useMemberPortal();
  const { effectiveIglesiaId } = useScopedIglesia();
  const [noticia, setNoticia] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [requiresAuth, setRequiresAuth] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setNotFound(false);
      setRequiresAuth(false);
      setNoticia(null);

      const { data, error, requiresAuth: needsAuth } = await NoticiasModel.fetchNoticiaForShare(id, {
        iglesiaId: effectiveIglesiaId,
        clubId: activeClub?.id,
        portalSessionToken: portalSession?.sessionToken,
        isAuthenticated: Boolean(user),
      });

      if (!active) return;

      if (error) {
        setNotFound(true);
      } else if (data) {
        setNoticia(data);
      } else if (needsAuth) {
        setRequiresAuth(true);
      } else {
        setNotFound(true);
      }

      setLoading(false);
    }

    if (id) {
      load();
    } else {
      setLoading(false);
      setNotFound(true);
    }

    return () => { active = false; };
  }, [id, user, effectiveIglesiaId, activeClub?.id, portalSession?.sessionToken]);

  function formatDate(dateStr) {
    return LandingModel.formatLandingDate(dateStr, language);
  }

  return {
    noticia,
    loading,
    notFound,
    requiresAuth,
    formatDate,
    t,
    language,
  };
}
