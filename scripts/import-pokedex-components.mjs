import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const reference = process.argv[2];
if (!reference) throw Error('Usage: node scripts/import-pokedex-components.mjs <upstream-checkout>');
for (const file of ['pokedex-mon-container', 'base-stats-overlay', 'pokedex-info-overlay', 'move-info-overlay']) {
  const sourcePath = `src/ui/containers/${file}.ts`;
  const original = fs.readFileSync(path.join(reference, sourcePath), 'utf8');
  let code = original.replace(/\r\n/g, '\n');
  code = code.replace(/import type \{ InfoToggle \}[^;]+;\n/, '').replace(' implements InfoToggle', '')
    .replace(/import \{ globalScene \}[^;]+;/, 'import type BattleScene from "../battle-scene";')
    .replace(/import \{ settings \}[^;]+;\n/, '')
    .replace(/import type \{ Variant \}[^;]+;\n/, '').replaceAll('Variant', 'number')
    .replace(/import \{ toCamelCase \}[^;]+;\n/, '').replace('toCamelCase(shortStats[i])', 'shortStats[i].toLowerCase()')
    .replace('import type { PokemonSpecies } from "#data/pokemon-species";', 'import type PokemonSpecies from "../data/pokemon-species";')
    .replaceAll('#enums/text-style', './text').replaceAll('#ui/text', './text').replaceAll('#ui/ui-theme', './window')
    .replaceAll('#utils/common', '../utils').replaceAll('fixedInt, getLocalizedSpriteKey', 'fixedInt')
    .replaceAll('#enums/move-category', '../data/move').replaceAll('#moves/move', '../data/move')
    .replace('import type { Move }', 'import type Move')
    .replace('import { PokemonType } from "#enums/pokemon-type";', 'import { Type as PokemonType } from "../data/type";')
    .replace('from "i18next"', 'from "../i18n"')
    .replaceAll('TextStyle.MONEY_WINDOW', 'TextStyle.SETTINGS_LABEL').replaceAll('TextStyle.MOVE_INFO_CONTENT', 'TextStyle.TOOLTIP_CONTENT')
    .replaceAll('globalScene', 'this.host').replaceAll('super(this.host', 'super(host')
    .replace('return this.host.scaledCanvas.width / 2;', 'return 160; // early client: 320 logical pixels')
    .replaceAll('this.host.scaledCanvas.width', '(this.host.game.canvas.width / 6)')
    .replaceAll('this.host.scaledCanvas.height', '(this.host.game.canvas.height / 6)')
    .replaceAll('addTextObject(', 'addTextObject(this.host, ').replaceAll('addWindow(', 'addWindow(this.host, ')
    .replace(/    if \(!settings.display.enableMoveInfo\) \{\n      return false;[^\n]*\n    \}\n/g, '');
  if (file === 'pokedex-mon-container') {
    code = code.replace('constructor(species:', 'constructor(private readonly host: BattleScene, private readonly catalogue: any, species:')
      .replaceAll('this.host.gameData', 'this.catalogue').replace('getSpeciesDefaultDexAttr(species, false, true)', 'getSpeciesDefaultDexAttr(species)')
      .replace('for (let i = 0; i < 3; i++)', 'for (let i = 0; i < 1; i++)')
      .replaceAll('defaultProps.formIndex, defaultProps.shiny, defaultProps.variant', 'defaultProps.formIndex')
      .replaceAll('defaultProps.female, defaultProps.formIndex)', 'defaultProps.female, defaultProps.formIndex, defaultProps.shiny)')
      .replaceAll('defaultProps.female, defaultProps.formIndex, defaultProps.shiny, defaultProps.variant', 'defaultProps.female, defaultProps.formIndex, defaultProps.shiny')
      .replaceAll('getIconId(female, formIndex, shiny, variant)', 'getIconId(female, formIndex, shiny)')
      .replaceAll('getIconAtlasKey(formIndex, false, variant)', 'getIconAtlasKey(formIndex)')
      .replaceAll('getIconId(female, formIndex, false, variant)', 'getIconId(female, formIndex, false)')
      .replace('checkIconId(female, formIndex, shiny, variant) {', 'checkIconId(female, formIndex, shiny, variant = 0) {');
  } else {
    code = code.replace('constructor(options?:', 'constructor(private readonly host: BattleScene, options?:');
    if (file === 'move-info-overlay') code = 'import {getLocalizedSpriteKey} from "./localized-sprite";\n' + code;
    if (file === 'move-info-overlay') code = code.replaceAll('TextStyle.TOOLTIP_CONTENT);', 'TextStyle.TOOLTIP_CONTENT, {fontSize: "48px"});');
    if (file !== 'base-stats-overlay') {
      const resetY = file === 'move-info-overlay' ? '(this.options?.top ? EFF_HEIGHT : 0) + BORDER - 2' : 'BORDER - 2';
      code = code.replace('  clear() {', `  clear() {\n    this.descScroll?.remove(); this.descScroll = null; this.desc.y = ${resetY};`);
      if (file === 'move-info-overlay') {
        code = code.replace('  private desc: Phaser', '  private textMaskRect: Phaser.GameObjects.Graphics;\n  private desc: Phaser')
          .replace('const moveDescriptionTextMaskRect = this.host.make.graphics();', 'const moveDescriptionTextMaskRect = this.textMaskRect = this.host.make.graphics();');
      } else code = code.replace('    this.desc.setMask(updatedMask);', '    this.desc.clearMask(true);\n    this.desc.setMask(updatedMask);');
      code = code.replace('  isActive(): boolean {', '  destroy(fromScene?: boolean) {\n    this.clear(); this.host.tweens.killTweensOf(this.desc);\n    this.desc.clearMask(true); this.textMaskRect.destroy(); super.destroy(fromScene);\n  }\n\n  isActive(): boolean {');
    }
  }
  code = code.replace(/[ \t]+$/gm, '');
  fs.writeFileSync(`src/ui/${file}.ts`, `// Ported from pagefaultgames/pokerogue ${sourcePath}; AGPL-3.0.\n// Source SHA256: ${crypto.createHash('sha256').update(original).digest('hex')}\n// Reproduce using scripts/import-pokedex-components.mjs.\n${code}`);
}
for (const locale of ['en', 'zh-Hans']) for (const file of ['pokedex-ui-handler', 'pokemon-evolutions'])
  fs.copyFileSync(path.join(reference, `locales/${locale}/${file}.json`), `locales/${locale}/${file}.json`);
for (const asset of ['passive_bg','ha_capsule','favorite','common_egg','normal_memory'])
  fs.copyFileSync(path.join(reference, `assets/images/ui/${asset}.png`), `public/images/ui/${asset}.png`);
fs.copyFileSync(path.join(reference, 'assets/images/ui/shiny_small.png'), 'public/images/ui/shiny_star_small.png');
for (const extension of ['json', 'png']) fs.copyFileSync(path.join(reference, `assets/images/types_zh-Hans.${extension}`), `public/images/types_zh-Hans.${extension}`);
