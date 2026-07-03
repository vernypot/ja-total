import CarnetCard from './CarnetCard';
import * as CarnetModel from '../mvc/models/carnet.model';

function CarnetLetterSheet({
  pageMembers,
  side,
  pageIndex,
  totalPages,
  club,
  tokens,
  expirationLabel,
  t,
}) {
  const slots = CarnetModel.buildLetterPageSlots(pageMembers);
  const sideLabel = side === 'front' ? t('carnetLetterFronts') : t('carnetLetterBacks');

  return (
    <div className="carnet-letter-sheet" data-side={side}>
      <div className="carnet-letter-sheet-label no-print">
        {sideLabel} — {t('carnetLetterPage')} {pageIndex + 1}/{totalPages}
      </div>
      <div className="carnet-letter-grid">
        {slots.map((member, slotIdx) => (
          <div
            key={`${side}-${slotIdx}`}
            className={`carnet-grid-slot${member ? '' : ' carnet-grid-slot--empty'}`}
          >
            {member && (
              <CarnetCard
                member={member}
                club={club}
                medical={member.medical}
                token={tokens[member.id]}
                expirationLabel={expirationLabel}
                t={t}
                sides={side}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CarnetLetterBatch({
  members,
  club,
  tokens,
  expirationLabel,
  t,
}) {
  const pages = CarnetModel.chunkMembersForLetterPages(members);

  return (
    <>
      {pages.map((pageMembers, pageIndex) => (
        <CarnetLetterSheet
          key={`front-${pageIndex}`}
          pageMembers={pageMembers}
          side="front"
          pageIndex={pageIndex}
          totalPages={pages.length}
          club={club}
          tokens={tokens}
          expirationLabel={expirationLabel}
          t={t}
        />
      ))}
      {pages.map((pageMembers, pageIndex) => (
        <CarnetLetterSheet
          key={`back-${pageIndex}`}
          pageMembers={pageMembers}
          side="back"
          pageIndex={pageIndex}
          totalPages={pages.length}
          club={club}
          tokens={tokens}
          expirationLabel={expirationLabel}
          t={t}
        />
      ))}
    </>
  );
}
