import LandingHeroScreenshot, { resolveHeroScreenshot } from './LandingHeroScreenshot';
import { ProgramLogo } from './YouthClubIcons';

const MODULE_TYPES = ['pathfinders', 'adventurers', 'masterguide'];

export default function LandingHeroVisual({ slide, language, label = '' }) {
  const visual = slide?.visual || resolveHeroScreenshot(slide);

  if (visual === 'module-logos') {
    return (
      <div className="landing-hero-visual-panel landing-hero-visual-panel--logos" aria-hidden={!label}>
        <ProgramLogo type="ministerios" className="landing-hero-visual-logo landing-hero-visual-logo--main" language={language} />
        <div className="landing-hero-visual-logo-row">
          {MODULE_TYPES.map(type => (
            <ProgramLogo key={type} type={type} className="landing-hero-visual-logo" language={language} />
          ))}
        </div>
      </div>
    );
  }

  if (visual === 'brand-stack') {
    return (
      <LandingHeroScreenshot variant="members" language={language} label={label} />
    );
  }

  return (
    <LandingHeroScreenshot variant={visual} language={language} label={label} />
  );
}
