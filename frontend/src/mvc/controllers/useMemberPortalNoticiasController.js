import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import { useMemberPortal } from '../../context/MemberPortalContext';
import * as MemberPortalModel from '../models/memberPortal.model';

export function useMemberPortalNoticiasController() {
  const { t, language } = useLanguage();
  const { session } = useMemberPortal();
  const [news, setNews] = useState([]);
  const [expandedNewsId, setExpandedNewsId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const formatNewsDate = useMemo(() => (date) => {
    if (!date) return '';
    const locale = language === 'en' ? 'en-US' : 'es-CO';
    return new Date(`${date}T12:00:00`).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }, [language]);

  async function load() {
    if (!session?.sessionToken) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    const { data, error: loadError } = await MemberPortalModel.fetchPortalNoticias(session.sessionToken, {
      placements: ['dashboard'],
      limit: 30,
    });

    if (loadError) {
      setError(loadError.message);
      setNews([]);
    } else {
      setNews(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [session?.sessionToken]);

  return {
    news,
    expandedNewsId,
    setExpandedNewsId,
    loading,
    error,
    t,
    formatNewsDate,
  };
}
