// Convert the requested meter radius once, then apply each skill's existing
// physical cap. The renderer, target preview and impact all share this result.
export function getSkillAreaRadius(skill, requestedMeters = skill.aoe) {
  const meters = Number.isFinite(requestedMeters) && requestedMeters > 0 ? requestedMeters : skill.aoe;
  const scale = meters / skill.aoe;
  const base = skill.spread * scale;
  switch (skill.shape) {
    case 'earthMeteorRupture': return Math.min(skill.earthMeteor.rupture.maxRadius, Math.max(1, base) * 1.12);
    case 'eternalWinter': return Math.min(skill.iceField.freeze.radius, base);
    case 'venomApocalypse': return Math.min(skill.poisonAcid.cloud.radius, Math.max(1, base));
    case 'oceanDominion': return Math.max(2, Math.min(skill.oceanDominion.tide.maxRadius / skill.oceanDominion.worldUnitsPerMeter, base));
    case 'bloodChainNet': return Math.max(4, base);
    case 'seraphicRain': return Math.max(1, base);
    case 'lightningStorm': return skill.spread * Math.max(.38, Math.min(1.6, scale));
    case 'dimensionalCollapse': return skill.spaceBlackHole.pull.maxRadius / skill.spaceBlackHole.worldUnitsPerMeter * Math.max(.38, Math.min(1.6, scale));
    case 'nightmareSpears': return skill.shadowOrbCataclysm.absorb.maxRadius / skill.shadowOrbCataclysm.worldUnitsPerMeter * Math.max(.55, Math.min(1.55, scale));
    case 'eternalRequiem': return Math.min(base, skill.timeDomain.domain.maxRadius / skill.timeDomain.worldUnitsPerMeter, skill.timeDomain.domain.shellHeight / skill.timeDomain.worldUnitsPerMeter);
    case 'atmosphericCollapse': return skill.tornado.aoeInfluenceRadius * scale;
    default: return base;
  }
}
