import CarnetCard from './CarnetCard';
import * as CarnetModel from '../mvc/models/carnet.model';

function CarnetCombinedSheet({
  pageMembers,
  pageIndex,
  totalPages,
  club,
  tokens,
  expirationLabel,
  t,
}) {
  const slots = CarnetModel.buildCombinedSheetSlots(pageMembers);

  return (
    <div className="carnet-combined-sheet">
      <div className="carnet-combined-sheet-label no-print">
        {t('carnetCombinedSheetLabel')} {pageIndex + 1}/{totalPages}
      </div>
      <div className="carnet-combined-grid">
        {slots.map((member, slotIdx) => (
          <div
            key={slotIdx}
            className={`carnet-pair-slot${member ? '' : ' carnet-pair-slot--empty'}`}
          >
            {member && (
              <>
                <CarnetCard
                  member={member}
                  club={club}
                  medical={member.medical}
                  token={tokens[member.id]}
                  expirationLabel={expirationLabel}
                  t={t}
                  sides="front"
                />
                <CarnetCard
                  member={member}
                  club={club}
                  medical={member.medical}
                  token={tokens[member.id]}
                  expirationLabel={expirationLabel}
                  t={t}
                  sides="back"
                />
              </>
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
  const pages = CarnetModel.chunkMembersForCombinedSheets(members);

  return (
    <>
      {pages.map((pageMembers, pageIndex) => (
        <CarnetCombinedSheet
          key={`sheet-${pageIndex}`}
          pageMembers={pageMembers}
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
