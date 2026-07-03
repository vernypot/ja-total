import { useContext, useEffect, useState } from 'react';
import { useLanguage } from '../hooks/useLanguage';
import { useScopedIglesia } from '../hooks/useScopedIglesia';
import { ClubContext } from '../context/ClubContext';
import NoticiaBanner from './NoticiaBanner';
import * as NoticiasModel from '../mvc/models/noticias.model';

export default function DashboardNoticiaBanner() {
  const { language } = useLanguage();
  const { effectiveIglesiaId } = useScopedIglesia();
  const { activeClub } = useContext(ClubContext);
  const [items, setItems] = useState([]);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!effectiveIglesiaId) {
        if (active) setItems([]);
        return;
      }

      const { data } = await NoticiasModel.fetchDashboardNoticias({
        iglesiaId: effectiveIglesiaId,
        clubId: activeClub?.id,
        placements: ['standalone_banner'],
        limit: 1,
      });

      if (active) setItems(data || []);
    }

    load();
    return () => { active = false; };
  }, [effectiveIglesiaId, activeClub?.id]);

  if (hidden || !items.length) return null;

  return (
    <div className="dashboard-banner-slot">
      <NoticiaBanner
        items={items}
        formatDate={date => NoticiasModel.formatNoticiaDate(date, language)}
        dismissible
        onDismiss={() => setHidden(true)}
      />
    </div>
  );
}
