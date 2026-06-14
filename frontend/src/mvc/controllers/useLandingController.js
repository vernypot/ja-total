import { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { useLanguage } from '../../hooks/useLanguage';
import * as LandingModel from '../models/landing.model';
import { DASHBOARD_HOME_PATH } from '../../utils/dashboardRoutes';

const HERO_INTERVAL_MS = 6000;

export function useLandingController() {
  const { user } = useContext(AuthContext);
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [heroIndex, setHeroIndex] = useState(0);

  const heroSlides = useMemo(() => LandingModel.getHeroSlides(), []);
  const programs = useMemo(() => LandingModel.getPrograms(), []);
  const stats = useMemo(() => LandingModel.getStats(), []);
  const news = useMemo(() => LandingModel.getLandingNews(language), [language]);
  const events = useMemo(() => LandingModel.getLandingEvents(language), [language]);

  useEffect(() => {
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
    heroSlides,
    heroIndex,
    setHeroIndex,
    programs,
    stats,
    news,
    events,
    goToLogin,
    goToDashboard,
    formatDate,
    eventDayParts,
  };
}
