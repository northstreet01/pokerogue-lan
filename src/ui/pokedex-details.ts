// PokedexPage integration: upstream category order/labels, menu descriptions,
// base stats, ability and move overlays; current selector owns the sprite preview.
import type BattleScene from '../battle-scene';
import {Button} from '../battle-scene';
import type PokemonSpecies from '../data/pokemon-species';
import {Type} from '../data/type';
import {getLocalizedSpriteKey} from './localized-sprite';
import {addTextObject, TextStyle, getTextColor} from './text';
import {addWindow} from './window';
import {Mode} from './ui';
import {BaseStatsOverlay} from './base-stats-overlay';
import {PokedexInfoOverlay} from './pokedex-info-overlay';
import {MoveInfoOverlay} from './move-info-overlay';
import {StatsContainer} from './stats-container';
import {StarterCandyDisplay} from './starter-candy-display';
import {buildPokedexDetails, PokedexDetailEntry} from './pokedex-detail-data';
import i18next from '../i18n';

interface DetailOptions {
  data: any;
  personal: any;
  current: () => boolean;
  bind: (object: Phaser.GameObjects.GameObject, action: () => void) => void;
  cancel: () => void;
  useCandies: () => void;
  formIndex?: number;
  navigate: (species: PokemonSpecies, formIndex: number, category: number) => void;
  category?: number;
}

export class PokedexDetails extends Phaser.GameObjects.Container {
  public actions: (() => void)[];
  public notice: Phaser.GameObjects.Text;
  private model: ReturnType<typeof buildPokedexDetails>;
  private categories: Phaser.GameObjects.Text[] = [];
  private cursor = 0;
  private focus: 'categories' | 'footer' = 'categories';
  private footerCursor = 0;
  private footer: Phaser.GameObjects.Text[] = [];
  private baseStats: BaseStatsOverlay;
  private ivs: StatsContainer;
  private info: PokedexInfoOverlay;
  private moves: MoveInfoOverlay;
  private ivMode = false;
  private live = true;
  private listGeneration = 0;
  private listOpen = false;
  private keys = ['BaseStats','Abilities','LevelMoves','EggMoves','TmMoves','Biomes','Natures','Ribbons','Evolutions','Forms'];

  constructor(private host: BattleScene, species: PokemonSpecies, private options: DetailOptions) {
    super(host, 0, 0);
    this.model = buildPokedexDetails(species, options.data, options.personal, options.formIndex);
    this.model.types.filter(type => type !== null && type !== undefined && type >= 0).forEach((type, index) => {
      this.add(host.add.sprite(8 + index * 18, 98, getLocalizedSpriteKey('types'), Type[type].toLowerCase()).setScale(.5).setOrigin(0));
    });
    const shield = addWindow(host, 107, 1, 212, 178); this.add(shield); options.bind(shield, () => {});
    // Upstream PokedexPage's menu lies to the right of the 106px sprite panel.
    this.add(addWindow(host, 108, 1, 81, 132));
    this.keys.forEach((key, index) => {
      const node = this.addLabel(112, 7 + index * 12, i18next.t(key==='Forms'?'pokedexUiHandler:forms':'pokedexUiHandler:menu' + key), 42);
      this.categories.push(node); options.bind(node, () => { this.focus = 'categories'; this.cursor = index; this.activate(); });
    });
    this.baseStats = new BaseStatsOverlay(host, {x: 189, y: 1, width: 130}); this.add(this.baseStats);
    this.ivs = new StatsContainer(host, 198, 8); this.add(this.ivs); this.ivs.setVisible(false);
    this.info = new PokedexInfoOverlay(host, {x: 1, y: 103, width: 106}); this.add(this.info);
    this.moves = new MoveInfoOverlay(host, {top: true, x: 1, y: 55, width: 106}); this.add(this.moves);
    this.addLabel(112, 136, '图鉴：当前可选 · 糖果/缎带：本人', 30);
    const candy = new StarterCandyDisplay(host, 112, 146); this.add(candy); candy.update(this.model.candy, this.model.rootId);
    this.notice = this.addLabel(112, 154, '', 24).setWordWrapWidth(1200);
    this.actions = [() => this.toggleIvs()];
    const labels = ['IV'];
    if (options.personal.canBuyCandyReduction) { this.actions.push(options.useCandies); labels.push(i18next.t('starterSelectUiHandler:useCandies')); }
    this.actions.push(options.cancel); labels.push('返回 Esc');
    labels.forEach((label, index) => {
      const node = this.addLabel(112 + index * (labels.length === 3 ? 68 : 100), 165, label, 36);
      this.footer.push(node); options.bind(node, () => this.actions[index]());
    });
    this.baseStats.show(this.model.baseStats, this.model.baseTotal);
    this.cursor = options.category ?? 0; this.highlight();
  }
  private addLabel(x: number, y: number, value: string, size: number) {
    const node = addTextObject(this.host, x, y, value, TextStyle.TOOLTIP_CONTENT, {fontSize: `${size}px`}); this.add(node); return node;
  }
  private allowed(index = this.cursor) {
    return index === 7 ? this.model.ribbons[0].unlocked || this.model.seen
      : index === 6 ? this.model.caught : this.model.seen;
  }
  private highlight() {
    this.categories.forEach((node, index) => node.setColor(getTextColor(!this.allowed(index) ? TextStyle.SHADOW_TEXT
      : this.focus === 'categories' && index === this.cursor ? TextStyle.TOOLTIP_TITLE : TextStyle.WINDOW)));
    this.footer.forEach((node, index) => node.setColor(getTextColor(this.focus === 'footer' && index === this.footerCursor ? TextStyle.TOOLTIP_TITLE : TextStyle.WINDOW)));
  }
  private activate() {
    this.highlight();
    if (!this.allowed()) { this.notice.setText('尚未遇见或未解锁该项资料'); return; }
    this.notice.setText('');
    if (this.cursor === 0) { this.ivMode = false; this.ivs.setVisible(false); this.baseStats.show(this.model.baseStats, this.model.baseTotal); return; }
    const lists = [[], this.model.abilities, this.model.levelMoves, this.model.eggMoves, this.model.tmMoves, this.model.biomes, this.model.natures, this.model.ribbons, this.model.evolutions,this.model.forms];
    const entries = lists[this.cursor];
    if (!entries.length) { this.notice.setText(this.cursor === 9 ? i18next.t('pokedexLegacy:noForms') : this.cursor === 8 ? i18next.t('pokedexLegacy:noRelations') : i18next.t('pokedexUiHandler:' + ({3:'noEggMoves',4:'noTmMoves',5:'noBiomes',7:'noRibbons'}[this.cursor] ?? 'showNatures'))); return; }
    this.openList(entries);
  }
  private openList(entries: PokedexDetailEntry[]) {
    const version = ++this.listGeneration; this.listOpen = true;
    const current = () => this.live && this.options.current() && version === this.listGeneration && this.host.ui.getMode() === Mode.OPTION_SELECT;
    const show = (entry: PokedexDetailEntry) => {
      if (!current()) return;
      if (entry.move) { this.info.clear(); this.moves.show(entry.move); }
      else { this.moves.clear(); this.info.show(entry.description ?? entry.label); }
    };
    const cancel = async () => {
      if (!current()) return;
      this.info.clear(); this.moves.clear(); this.listOpen = false; this.listGeneration++;
      await this.host.ui.revertMode();
    };
    const select = async (entry: PokedexDetailEntry) => {
      if (!current()) return;
      if (!entry.species) { show(entry); return; }
      this.info.clear(); this.moves.clear(); this.listGeneration++; this.listOpen = false;
      await this.host.ui.revertMode();
      if (this.live && this.options.current()) this.options.navigate(entry.species, entry.formIndex ?? 0,this.cursor);
    };
    void this.host.ui.setOverlayMode(Mode.OPTION_SELECT, {captureMenu: true, supportHover: true, scale: .65,
      maxOptions: 8, yOffset: 47, options: [...entries.map(entry => ({label: entry.label, keepOpen: true,
        style: entry.unlocked ? TextStyle.WINDOW : TextStyle.SHADOW_TEXT,
        handler: () => { void select(entry); }, onHover: () => show(entry)})),
      {label: i18next.t('menu:cancel'), keepOpen: true, handler: cancel, onHover: () => { if (current()) { this.info.clear(); this.moves.clear(); } }}]
    }).catch(() => { if (this.live && this.options.current()) { this.listOpen = false; this.notice.setText('资料读取失败，请返回重试'); } });
  }
  private toggleIvs() {
    if (!this.model.caught) { this.notice.setText('未解锁该物种的个体资料'); return; }
    this.ivMode = !this.ivMode;
    this.ivs.setVisible(this.ivMode); this.baseStats.setVisible(!this.ivMode);
    if (this.ivMode) this.ivs.updateIvs(this.model.ivs);
    else this.ivs.updateIvs(null);
  }
  processInput(button: Button) {
    if (button === Button.CANCEL) { this.options.cancel(); return true; }
    if (button === Button.LEFT || button === Button.RIGHT) { this.focus = this.focus === 'categories' ? 'footer' : 'categories'; }
    else if (button === Button.UP || button === Button.DOWN) {
      const direction = button === Button.UP ? -1 : 1;
      if (this.focus === 'categories') this.cursor = (this.cursor + direction + this.keys.length) % this.keys.length;
      else this.footerCursor = (this.footerCursor + direction + this.actions.length) % this.actions.length;
    } else if (button === Button.ACTION) {
      if (this.focus === 'categories') this.activate(); else this.actions[this.footerCursor]();
    }
    this.highlight(); this.host.ui.playSelect(); return true;
  }
  destroy(fromScene?: boolean) { this.live = false; this.listGeneration++; super.destroy(fromScene); }
}
