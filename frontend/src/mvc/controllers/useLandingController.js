import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { useLanguage } from '../../hooks/useLanguage';
import * as LandingModel from '../models/landing.model';
import { loadLandingContent } from '../models/landingContent.model';
import { DASHBOARD_HOME_PATH } from '../../utils/dashboardRoutes';

const HERO_INTERVAL_MS = 6000;

export function useLandingController() {
  const { user } = useContext(AuthContext);
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [heroIndex, setHeroIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      const data = await loadLandingContent(language);
      if (!active) return;
      setContent(data);
      setHeroIndex(0);
      setLoading(false);
    }

    load();
    return () => { active = false; };
  }, [language]);

  const heroSlides = content?.heroSlides || [];

  useEffect(() => {
    if (!heroSlides.length) return undefined;
    const timer = setInterval(() => {
      setHeroIndex(i => (i + 1) % heroSlides.length);
    }, HERO_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  function goToLogin() {
    navigate('/login');
  }

  function goToDashboard() {
    navigate(DASHBOARD_HOME_PATH);
  }

  function formatDate(dateStr) {
    return LandingModel.formatLandingDate(dateStr, language);
  }

  function eventDayParts(dateStr) {
    return LandingModel.formatEventDay(dateStr);
  }

  return {
    user,
    loading,
    content,
    heroSlides,
    heroIndex,
    setHeroIndex,
    goToLogin,
    goToDashboard,
    formatDate,
    eventDayParts,
    language,
  };
}
