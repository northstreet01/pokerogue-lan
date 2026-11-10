// Integration adapter for the upstream FilterBar / DropDown / FilterText components.
// Selection and purchases still use the early client's existing authoritative paths.
import BattleScene, { Button } from '../battle-scene';
import PokemonSpecies from '../data/pokemon-species';
import { allAbilities, getSpeciesPassive } from '../data/ability';
import { allMoves } from '../data/move';
import { speciesEggMoves } from '../data/egg-moves';
import { tmSpecies } from '../data/tms';
import { Type } from '../data/type';
import i18next from '../i18n';
import { addTextInputObject, addTextObject, TextStyle } from './text';
import { addWindow } from './window';
import { FilterBar } from './filter-bar';
import { FilterText } from './filter-text';
import { DropDown, DropDownLabel, DropDownOption, DropDownState as State, DropDownType, SortCriteria } from './dropdown';
import { DropDownColumn as Col } from './drop-down-column';
import { ScrollBar } from './scroll-bar';
import { browserScroll, filterOriginalCatalogue } from './original-browser-model.mjs';
import {StarterCandyDisplay, getStarterColors} from './starter-candy-display';
import {StarterCandyMenu} from './starter-candy-menu';
import {PokedexMonContainer} from './pokedex-mon-container';
import {PokedexDetails} from './pokedex-details';
import {biomeIds, biomeName, buildHabitatIndex, evolutionFamily} from './pokedex-world-data';

interface BrowserOptions {
  entries: PokemonSpecies[];
  data: any;
  personal: any;
  readOnly: boolean;
  blocked: (id: number) => boolean;
  pokerus: (id: number) => boolean;
  preview: (species: PokemonSpecies, formIndex?: number, detailOnly?: boolean) => void;
  detailPreview?: (active: boolean) => void;
  choose: (species: PokemonSpecies) => void;
  allowed: () => boolean;
  bind: (target: Phaser.GameObjects.GameObject, action: () => void) => void;
}

export class OriginalStarterBrowser {
  private root: Phaser.GameObjects.Container;
  private panel: Phaser.GameObjects.Container;
  private bar: FilterBar;
  private textFilters: FilterText;
  private cells: {root: PokedexMonContainer; hit: Phaser.GameObjects.Rectangle; occupied: Phaser.GameObjects.Text; readonly icon: Phaser.GameObjects.Sprite}[] = [];
  private rows: PokemonSpecies[] = [];
  private facts = new Map<number, any>();
  private cursor = 0;
  private firstRow = 0;
  private filterCursor = 0;
  private toolCursor = 0;
  private textCursor = 0;
  private focus: 'grid' | 'bar' | 'tools' | 'text' = 'grid';
  private tools: Phaser.GameObjects.Text[] = [];
  private status: Phaser.GameObjects.Text;
  private selection: Phaser.GameObjects.NineSlice;
  private scroll: ScrollBar;
  private detail?: PokedexDetails;
  private detailHistory: {species: PokemonSpecies; formIndex?: number; category: number}[] = [];
  private detailLocation?: {species: PokemonSpecies; formIndex?: number; category: number};
  private detailActions: (() => void)[] = [];
  private detailLabels: Phaser.GameObjects.Text[] = [];
  private detailCursor = 0;
  private input?: ReturnType<typeof addTextInputObject>;
  private entry?: Phaser.GameObjects.Container;
  private inputValues: string[] = [];
  private inputCursor = 0;
  private candyDisplay: StarterCandyDisplay;
  private candyMenu: StarterCandyMenu;
  private purchaseNotice?: Phaser.GameObjects.Text;
  private get busy() { return this.candyMenu?.isBusy ?? false; }
  private alive = true;
  private previewId?: number;
  private pausedKeyboard = false;
  public opened = false;

  constructor(private scene: BattleScene, parent: Phaser.GameObjects.Container, private options: BrowserOptions) {
    this.root = scene.add.container(0, 0);
    parent.add(this.root);
    const launch = addTextObject(scene, 109, 140, '查找 M', TextStyle.WINDOW, {fontSize: '36px'});
    this.root.add(launch);
    this.bind(launch, () => this.open());
    this.panel = scene.add.container(0, 0).setVisible(false);
    this.root.add(this.panel);
    const previewShield = scene.add.rectangle(0, 0, 107, 180, 0, 0).setOrigin(0);
    this.panel.add(previewShield); this.bind(previewShield, () => {});
    const background = addWindow(scene, 107, 1, 212, 178);
    this.panel.add(background); this.bind(background, () => {});
    this.status = this.text(this.panel, 112, 19, '', 36);
    this.selection = scene.add.nineslice(0, 0, 'select_cursor', null, 21, 19, 1, 1, 1, 1).setOrigin(0);
    for (let i = 0; i < 63; i++) {
      const root = new PokedexMonContainer(scene, options.data, options.entries[0]);
      root.setPosition(112 + i % 9 * 22, 29 + Math.floor(i / 9) * 18);
      const occupied = this.text(root, 10, 11, '×', 36);
      const hit = scene.add.rectangle(0, 0, 20, 18, 0, 0).setOrigin(0); root.add(hit);
      this.panel.add(root); this.cells.push({root, hit, occupied, get icon() { return root.icon; }});
      this.bind(hit, () => { this.focus = 'grid'; this.setCursor(this.firstRow * 9 + i); });
      hit.on('pointerover', () => {
        if (this.opened && this.options.allowed() && !this.detail && !this.entry && !this.textFilters.visible && !this.bar.openDropDown) {
          this.focus = 'grid'; this.setCursor(this.firstRow * 9 + i);
        }
      });
    }

    this.panel.add(this.selection);
    this.scroll = new ScrollBar(scene, 310, 29, 5, 123, 7);
    this.panel.add(this.scroll);
    ['搜索 C', '详情', options.readOnly ? '查看' : '选用', '重置', '返回'].forEach((label, index) => {
      const node = this.text(this.panel, 112 + index * 40, 160, label, 36);
      this.tools.push(node);
      this.bind(node, () => { this.focus = 'tools'; this.toolCursor = index; this.runTool(); });
    });
    this.bar = new FilterBar(scene, 107, 1, 212, 17, 3, 3, 6);
    const label = (key: string) => i18next.t('filterBar:' + key);
    const option = (val: any, text: string, state = State.ON) => new DropDownOption(scene, val, new DropDownLabel(text, undefined, state));
    const add = (col: Col, title: string, opts: DropDownOption[], type = DropDownType.MULTI) => {
      const drop = new DropDown(scene, 0, 0, opts, () => this.refresh(), type);
      this.bar.addFilter(col, label(title), drop);
      drop.options.forEach((item, index) => this.bind(item.text, () => {
        drop.setCursor(index); drop.toggleOptionState(index);
      }));
    };
    add(Col.GEN, 'genFilter', Array.from({length: 9}, (_, n) => option(n + 1, ['I','II','III','IV','V','VI','VII','VIII','IX'][n])));
    add(Col.TYPES, 'typeFilter', Object.keys(Type).filter(k => /^\d+$/.test(k) && Number(k) >= 0)
      .map(k => option(Number(k), i18next.t(`pokemonInfo:type.${Type[Number(k)].toLowerCase()}`))));
    add(Col.BIOME, 'biomeFilter', [...biomeIds().map(id => option(id, biomeName(id))), option(-1, label('uncatchable'))], DropDownType.HYBRID);
    add(Col.CAUGHT, 'caughtFilter', [option('NORMAL', label('normal')), option('SHINY', '闪光'),
      option('UNCAUGHT', label('uncaught'), options.readOnly ? State.ON : State.OFF)]);
    const radial = (val: string, keys: string[], states = [State.OFF, State.ON, State.EXCLUDE]) =>
      new DropDownOption(scene, val, keys.map((key, n) => new DropDownLabel(label(key), undefined, states[n])));
    add(Col.UNLOCKS, 'unlocksFilter', [
      radial('PASSIVE', ['passive','passiveUnlocked','passiveLocked','passiveUnlockable'], [State.OFF,State.ON,State.EXCLUDE,State.UNLOCKABLE]),
      radial('COST_REDUCTION', ['costReduction','costReductionUnlocked','costReductionLocked','costReductionUnlockedOne','costReductionUnlockedTwo','costReductionUnlockable'],
        [State.OFF,State.ON,State.EXCLUDE,State.ONE,State.TWO,State.UNLOCKABLE])], DropDownType.RADIAL);
    add(Col.MISC, 'miscFilter', [radial('RIBBON', ['ribbon','hasWon','hasNotWon']),
      radial('HIDDEN_ABILITY', ['hiddenAbility','hasHiddenAbility','noHiddenAbility']),
      radial('SEEN_SPECIES', ['seenSpecies','isSeen','isUnseen']),
      radial('EGG', ['egg','eggPurchasable'], [State.OFF,State.ON]),
      radial('POKERUS', ['pokerus','hasPokerus','noPokerus'])], DropDownType.RADIAL);
    add(Col.SORT, 'sortFilter', ['sortByNumber','sortByCost','sortByCandies','sortByIVs','sortByName','sortByNumCaught','sortByNumHatched']
      .map((key, n) => option(n as SortCriteria, label(key), n ? State.OFF : State.ON)), DropDownType.SINGLE);
    this.panel.add(this.bar);
    // Pointer bindings are an adapter; upstream navigation/state handling is retained.
    const headings = (this.bar as any).labels as Phaser.GameObjects.Text[];
    headings.forEach((heading, index) => this.bind(heading, () => {
      this.textFilters.setVisible(false);
      this.focus = 'bar'; this.filterCursor = index; this.bar.setCursor(index); this.bar.toggleDropDown(index);
    }));
    this.textFilters = new FilterText(scene, row => this.edit(row), 108, 24, 210, 125, () => this.refresh());
    ['nameField','move1Field','move2Field','ability1Field','ability2Field'].forEach((key, index) => {
      this.textFilters.addFilter(index, i18next.t('filterText:' + key));
    });
    this.bind((this.textFilters as any).window, () => {});
    const texts = (this.textFilters as any).labels as Phaser.GameObjects.Text[];
    const values = (this.textFilters as any).selections as Phaser.GameObjects.Text[];
    texts.forEach((node, index) => this.bind(node, () => this.edit(index)));
    values.forEach((node, index) => { node.setCrop(0, 0, 880, 100); this.bind(node, () => this.edit(index)); });
    this.textFilters.setVisible(false); this.panel.add(this.textFilters);
    this.candyDisplay = new StarterCandyDisplay(scene, 258, 19); this.panel.addAt(this.candyDisplay, 2);
    this.candyMenu = new StarterCandyMenu(scene, options.personal, () => this.alive && this.opened,
      value => { this.purchaseNotice?.setText(value); }, id => {
        const location = this.detailLocation;
        const species = location?.species ?? options.entries.find(entry => entry.speciesId === id);
        this.refresh(); this.inspect(0, '已保存', species, location?.formIndex, location?.category, true);
      });
    this.buildFacts();
    scene.input.on('wheel', this.onWheel);
  }

  private onWheel = (_pointer: Phaser.Input.Pointer, targets: Phaser.GameObjects.GameObject[], _dx: number, dy: number) => {
    if (!dy || !this.opened || !this.options.allowed() || this.busy || this.entry || this.detail || this.textFilters.visible) return;
    const overPanel = targets.some(target => {
      let ancestor = target;
      while (ancestor && ancestor !== this.panel) ancestor = ancestor.parentContainer;
      return ancestor === this.panel;
    });
    if (!overPanel) return;
    if (this.bar.openDropDown) {
      if (dy > 0) this.bar.incDropDownCursor(); else this.bar.decDropDownCursor();
      return;
    }
    const next = Math.max(0, Math.min(Math.max(0, Math.ceil(this.rows.length / 9) - 7), this.firstRow + Math.sign(dy) * 3));
    const offset = (next - this.firstRow) * 9;
    this.firstRow = next; this.focus = 'grid'; this.setCursor(this.cursor + offset);
  };

  private bind(target: Phaser.GameObjects.GameObject, action: () => void) {
    this.options.bind(target, () => {
      const modal = this.entry ?? this.detail;
      let ancestor = target;
      while (ancestor && ancestor !== modal) ancestor = ancestor.parentContainer;
      if (modal && !ancestor) return;
      if (this.alive && this.options.allowed() && !this.busy) { action(); this.scene.ui.playSelect(); }
    });
  }
  private text(parent: Phaser.GameObjects.Container, x: number, y: number, value: string, size = 42) {
    const node = addTextObject(this.scene, x, y, value, TextStyle.TOOLTIP_CONTENT, {fontSize: `${size}px`});
    parent.add(node); return node;
  }
  private buildFacts() {
    const habitats = buildHabitatIndex();
    for (const species of this.options.entries) {
      const forms = [species, ...species.forms], root = species.getRootSpeciesId();
      const abilities = forms.flatMap(form => [form.ability1, form.ability2, form.abilityHidden]).filter(id => id > 0).map(id => allAbilities[id]?.name);
      const passives = forms.map((_, formIndex) => getSpeciesPassive(species.speciesId, Math.max(0, formIndex - 1))?.name).filter(Boolean);
      const moves = forms.flatMap(form => form.getLevelMoves().map(move => move[1]));
      moves.push(...(speciesEggMoves[root] ?? []));
      for (const [move, compatible] of Object.entries(tmSpecies)) {
        if (compatible.some(value => Array.isArray(value) ? value[0] === species.speciesId : value === species.speciesId)) moves.push(Number(move));
      }
      this.facts.set(species.speciesId, {abilities, passives, moves: [...new Set(moves)].map(id => allMoves[id]?.name),
        biomes:[...new Set(evolutionFamily(species.speciesId).flatMap(id => (habitats.get(id) ?? []).map(row => row.biome)))],
        types: [...new Set(forms.flatMap(form => [form.type1, form.type2]).filter(type => type !== null && type !== undefined))], pokerus: this.options.pokerus(species.speciesId)});
    }
  }
  open() {
    if (!this.options.allowed()) return;
    this.opened = true; this.panel.setVisible(true); this.focus = 'grid'; this.refresh();
  }
  close() {
    if (this.busy) return;
    this.closeEntry(); this.detail?.destroy(); this.detail = undefined;
    this.detailHistory = [];
    this.detailLocation = undefined;
    this.options.detailPreview?.(false);
    this.bar.hideDropDowns(); this.textFilters.setVisible(false);
    this.opened = false; this.panel.setVisible(false);
  }
  private refresh() {
    if (!this.opened) return;
    const col = (column: Col) => this.bar.getVals(column);
    this.rows = filterOriginalCatalogue(this.options.entries, this.options.data, this.options.personal,
      {gens: col(Col.GEN), types: col(Col.TYPES), biomes: col(Col.BIOME), caught: col(Col.CAUGHT), unlocks: col(Col.UNLOCKS), misc: col(Col.MISC), sort: col(Col.SORT)},
      Array.from({length: 5}, (_, row) => this.textFilters.getValue(row)), this.facts);
    this.bar.updateFilterLabels(); this.textFilters.updateFilterLabels();
    this.setCursor(0);
  }
  private setCursor(cursor: number) {
    ({cursor: this.cursor, firstRow: this.firstRow} = browserScroll(cursor, this.rows.length, this.firstRow));
    this.cells.forEach((cell, index) => {
      const species = this.rows[this.firstRow * 9 + index];
      cell.root.setVisible(!!species); if (!species) return;
      const data = this.options.data, dex = data.dexData[species.speciesId];
      const props = data.getSpeciesDexAttrProps(species, data.getSpeciesDefaultDexAttr(species));
      const frame = species.getIconId(props.female, props.formIndex, props.shiny);
      if (cell.root.species !== species || cell.icon.frame.name !== frame) cell.root.setSpecies(species, props);
      if (dex?.caughtAttr) cell.icon.clearTint(); else cell.icon.setTint(dex?.seenAttr ? 0x808080 : 0);
      cell.root.label.setText(String(data.getSpeciesStarterValue(species.speciesId))).setVisible(true);
      const info = this.options.personal.candyInfo(species.speciesId);
      cell.root.starterPassiveBgs.setVisible(!!info.passive);
      cell.root.hiddenAbilityIcon.setVisible(!!((dex?.caughtAttr ?? 0n) & 64n));
      const upgrade = info.eligible && (info.passiveAvailable && !info.passive && info.candies >= info.passivePrice
        || info.price !== null && info.candies >= info.price || !info.eggFull && info.candies >= info.eggPrice);
      cell.root.candyUpgradeIcon.setVisible(!!upgrade); cell.root.candyUpgradeOverlayIcon.setVisible(!!upgrade);
      const colors = getStarterColors(species.getRootSpeciesId()).map(color => Number.parseInt(color.replace('#', ''), 16));
      cell.root.candyUpgradeIcon.setTint(colors[0]); cell.root.candyUpgradeOverlayIcon.setTint(colors[1]);
      cell.root.classicWinIcon.setVisible(this.options.personal.hasClassicRibbon(species.speciesId));
      cell.root.shinyIcons[0].setVisible(!!((dex?.caughtAttr ?? 0n) & 2n));
      cell.occupied.setVisible(this.options.blocked(species.speciesId));
      cell.root.bringToTop(cell.root.label); cell.root.bringToTop(cell.root.shinyIcons[0]); cell.root.bringToTop(cell.occupied);
    });
    const local = this.cursor - this.firstRow * 9;
    this.selection.setPosition(111 + local % 9 * 22, 28 + Math.floor(local / 9) * 18).setVisible(this.rows.length > 0 && this.focus === 'grid');
    this.scroll.setTotalRows(Math.max(1, Math.ceil(this.rows.length / 9))); this.scroll.setScrollCursor(this.firstRow);
    this.status.setText(this.rows.length ? `${this.rows.length} · ${this.rows[this.cursor].name}${this.options.blocked(this.rows[this.cursor].speciesId) ? ' · 队友已选' : ''}` : '无匹配结果，请修改或重置筛选');
    this.status.setCrop(0, 0, 800, 70);
    const focused = this.rows[this.cursor];
    this.candyDisplay.setVisible(!!focused);
    if (focused) this.candyDisplay.update(this.options.personal.candyInfo(focused.speciesId), focused.getRootSpeciesId());
    if (this.rows.length && this.previewId !== this.rows[this.cursor].speciesId) {
      this.previewId = this.rows[this.cursor].speciesId;
      this.options.preview(this.rows[this.cursor]);
    }
    this.bar.cursorObj.setVisible(this.focus === 'bar');
    this.tools.forEach((node, i) => node.setColor(this.focus === 'tools' && i === this.toolCursor ? '#b05018' : '#484848'));
  }
  private runTool() {
    if (this.toolCursor === 0) { this.focus = 'text'; this.textFilters.setVisible(true); this.textFilters.cursorObj.setVisible(true); this.textFilters.setCursor(this.textCursor); }
    else if (this.toolCursor === 1) this.inspect();
    else if (this.toolCursor === 2) this.choose();
    else if (this.toolCursor === 3) { this.bar.setValsToDefault(); this.textFilters.setValsToDefault(); this.focus = 'grid'; this.refresh(); }
    else this.close();
  }
  private choose() {
    const species = this.rows[this.cursor]; if (!species) return;
    if (this.options.readOnly) { this.inspect(); return; }
    this.close(); this.options.choose(species);
  }

  private edit(row: number) {
    this.textCursor = row; this.closeEntry();
    const scene = this.scene;
    this.entry = scene.add.container(0, 0); this.panel.add(this.entry);
    const background = addWindow(scene, 108, 19, 210, 160);
    this.entry.add(background); this.bind(background, () => {});
    this.text(this.entry, 114, 24, row === 0 ? '名称 / 编号' : row < 3 ? '搜索招式（含蛋招、招式机）' : '搜索特性（含被动）');
    this.input = addTextInputObject(scene, 114, 35, 1170, 102, TextStyle.TOOLTIP_CONTENT, {maxLength: 48, type: 'text', backgroundColor: '#f8f8e8', color: '#343847'});
    this.input.setOrigin(0); this.entry.add(this.input);
    const current = this.textFilters.getValue(row); this.input.text = current === '---' ? '' : current;
    const suggestions = scene.add.container(114, 57); this.entry.add(suggestions);
    const vocabulary = row === 0 ? this.options.entries.map(s => s.name)
      : [...new Set([...this.facts.values()].flatMap(f => row < 3 ? f.moves : [...f.abilities, ...f.passives]))].filter(Boolean).sort((a, b) => a.localeCompare(b));
    const accept = (value: string) => {
      try {
        if (this.alive && this.options.allowed()) this.textFilters.setValue(row, value || '---');
      } finally {
        this.closeEntry();
        if (this.alive) this.textFilters.setCursor(row);
      }
    };
    const show = () => {
      suggestions.removeAll(true);
      const query = this.input.text.trim().toLocaleLowerCase();
      this.inputValues = vocabulary.filter(value => value.toLocaleLowerCase().includes(query)
        || row === 0 && this.options.entries.some(s => String(s.speciesId) === query && s.name === value)).slice(0, 8);
      this.inputCursor = 0;
      this.inputValues.forEach((value, i) => this.bind(this.text(suggestions, 0, i * 11, value), () => accept(value)));
      if (!this.inputValues.length) this.text(suggestions, 0, 0, '无匹配项；可清空条件');
      this.highlightSuggestions(suggestions);
    };
    this.bind(this.text(this.entry, 114, 157, '应用'), () => accept(this.inputValues[this.inputCursor] ?? this.input.text.trim()));
    this.bind(this.text(this.entry, 161, 157, '清空'), () => accept(''));
    this.bind(this.text(this.entry, 211, 157, '取消 Esc'), () => this.closeEntry());
    this.input.on('textchange', show);
    const node = this.input.node as HTMLInputElement;
    node.setAttribute('aria-label', row === 0 ? '搜索精灵名称或编号' : row < 3 ? '搜索招式' : '搜索特性');
    node.addEventListener('keydown', event => {
      event.stopPropagation();
      if (event.isComposing) return;
      if (event.key === 'Escape') { event.preventDefault(); this.closeEntry(); }
      else if (event.key === 'Enter') { event.preventDefault(); accept(this.inputValues[this.inputCursor] ?? this.input.text.trim()); }
      else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault(); this.inputCursor = Math.max(0, Math.min(this.inputValues.length - 1, this.inputCursor + (event.key === 'ArrowDown' ? 1 : -1)));
        this.highlightSuggestions(suggestions);
      }
    });
    node.addEventListener('keyup', event => event.stopPropagation());
    this.pausedKeyboard = !!scene.input.keyboard?.enabled;
    if (scene.input.keyboard) scene.input.keyboard.enabled = false;
    show(); this.input.setFocus();
  }
  private highlightSuggestions(parent: Phaser.GameObjects.Container) {
    parent.getAll().forEach((node: Phaser.GameObjects.Text, index) => node.setColor(index === this.inputCursor ? '#b05018' : '#484848'));
  }
  private closeEntry() {
    this.input?.setBlur(); this.input = undefined;
    this.entry?.destroy(); this.entry = undefined;
    if (this.pausedKeyboard && this.scene.input.keyboard) {
      this.scene.input.keyboard.resetKeys(); this.scene.input.keyboard.enabled = true;
    }
    this.pausedKeyboard = false;
  }

  private inspect(_page = 0, notice = '', species = this.rows[this.cursor], formIndex?: number, category = 0, navigating = false) {
    if (!species) return;
    if (!navigating) this.detailHistory = [];
    this.detailLocation = {species,formIndex,category};
    this.detail?.destroy(); this.options.preview(species, formIndex, true); this.previewId = species.speciesId;
    this.options.detailPreview?.(true);
    const page = new PokedexDetails(this.scene, species, {
      data: this.options.data, personal: this.options.personal,
      formIndex, category,
      current: () => this.alive && this.opened && this.detail === page,
      bind: (object, action) => this.bind(object, action),
      cancel: () => {
        const previous = this.detailHistory.pop();
        if (previous) { this.inspect(0, '', previous.species, previous.formIndex, previous.category, true); return; }
        page.destroy(); this.detail = undefined; this.detailLocation = undefined; this.options.detailPreview?.(false); this.previewId = undefined; this.setCursor(this.cursor);
      },
      navigate: (target, targetForm, targetCategory) => {
        this.detailHistory.push({species, formIndex, category:targetCategory});
        this.inspect(0, '', target, targetForm, targetCategory, true);
      },
      useCandies: () => this.candyMenu.open(species.speciesId, species.getRootSpeciesId())
    });
    this.detail = page; this.panel.add(page); this.detailActions = page.actions;
    this.purchaseNotice = page.notice; this.purchaseNotice.setText(notice);
  }

  processInput(button: Button): boolean {
    if (!this.opened) {
      if (button !== Button.MENU || !this.options.allowed()) return false;
      this.open(); this.scene.ui.playSelect(); return true;
    }
    if (this.busy) return true;
    if (this.entry) { if (button === Button.CANCEL) this.closeEntry(); return true; }
    if (this.detail) return this.detail.processInput(button);
    if (this.textFilters.visible) {
      if (button === Button.CANCEL) { this.textFilters.setVisible(false); this.focus = 'grid'; }
      else if (button === Button.UP || button === Button.DOWN) {
        this.textCursor = (this.textCursor + (button === Button.UP ? 4 : 1)) % 5; this.textFilters.setCursor(this.textCursor);
      } else if (button === Button.ACTION) this.textFilters.startSearch(this.textCursor);
    } else if (button === Button.CANCEL) {
      if (this.bar.openDropDown) this.bar.hideDropDowns(); else this.close();
    } else if (button === Button.SUBMIT) { this.toolCursor = 0; this.runTool(); }
    else if (button === Button.MENU) { this.focus = 'bar'; this.bar.setCursor(this.filterCursor); }
    else if (this.focus === 'bar') {
      if (button === Button.LEFT || button === Button.RIGHT) {
        this.filterCursor = (this.filterCursor + (button === Button.LEFT ? this.bar.numFilters - 1 : 1)) % this.bar.numFilters; this.bar.setCursor(this.filterCursor);
      } else if (button === Button.UP && this.bar.openDropDown) this.bar.decDropDownCursor();
      else if (button === Button.DOWN && this.bar.openDropDown) this.bar.incDropDownCursor();
      else if (button === Button.DOWN) this.focus = 'grid';
      else if (button === Button.ACTION) {
        if (this.bar.openDropDown) this.bar.toggleOptionState(); else this.bar.toggleDropDown(this.filterCursor);
      }
    } else if (this.focus === 'tools') {
      if (button === Button.LEFT || button === Button.RIGHT) this.toolCursor = (this.toolCursor + (button === Button.LEFT ? 4 : 1)) % 5;
      else if (button === Button.UP) this.focus = 'grid';
      else if (button === Button.ACTION) this.runTool();
    } else if (button === Button.ACTION) this.choose();
    else if (button === Button.UP && this.cursor < 9) { this.focus = 'bar'; this.bar.setCursor(this.filterCursor); }
    else if (button === Button.DOWN && this.cursor + 9 >= this.rows.length) this.focus = 'tools';
    else if ([Button.UP,Button.DOWN,Button.LEFT,Button.RIGHT].includes(button)) {
      this.setCursor(this.cursor + (button === Button.UP ? -9 : button === Button.DOWN ? 9 : button === Button.LEFT ? -1 : 1));
    }
    if (this.opened && !this.detail && !this.entry) this.setCursor(this.cursor);
    this.scene.ui.playSelect(); return true;
  }
  destroy() {
    this.alive = false; this.candyMenu?.destroy(); this.scene.input.off('wheel', this.onWheel);
    this.closeEntry(); this.root.destroy(); this.opened = false;
  }
}
