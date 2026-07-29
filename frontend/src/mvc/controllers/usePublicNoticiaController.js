import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useLanguage } from '../../hooks/useLanguage';
import * as LandingModel from '../models/landing.model';
import * as NoticiasModel from '../models/noticias.model';

export function usePublicNoticiaController() {
  const { id } = useParams();
  const { language, t } = useLanguage();
  const [noticia, setNoticia] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setNotFound(false);
      setNoticia(null);

      const { data, error } = await NoticiasModel.fetchPublicNoticiaById(id);
      if (!active) return;

      if (error) {
        setNotFound(true);
      } else if (!data) {
        setNotFound(true);
      } else {
        setNoticia(data);
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
  }, [id]);

  function formatDate(dateStr) {
    return LandingModel.formatLandingDate(dateStr, language);
  }

  return {
    noticia,
    loading,
    notFound,
    formatDate,
    t,
    language,
  };
}
