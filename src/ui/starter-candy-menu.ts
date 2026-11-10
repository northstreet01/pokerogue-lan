// Ported from upstream StarterSelectUiHandler.showUseCandies. The menu order,
// labels, eligibility styling and two-layer candy icons are retained. Handlers
// delegate to the early client's atomic purchase interface instead of saveSystem.
import type BattleScene from '../battle-scene';
import type {OptionSelectConfig, OptionSelectItem} from './abstact-option-select-ui-handler';
import {Mode} from './ui';
import {TextStyle} from './text';
import {getStarterColors} from './starter-candy-display';
import i18next from '../i18n';

type Upgrade = 'passive' | 'toggle' | 'reduction' | 'egg';
type Purchase = {kind: Upgrade; label: string; price: number};

export function candyUpgradeOptions(info: any, colors: [string, string], purchase: (action: Purchase) => void,
  unavailable: () => void, cancel: () => void): OptionSelectItem[] {
  const options: OptionSelectItem[] = [];
  const add = (kind: Upgrade, key: string, price: number, available: boolean, args = {}) => {
    const label = `${kind === 'toggle' ? '' : `×${price} `}${i18next.t('starterSelectUiHandler:' + key, args)}`;
    options.push({label, keepOpen: true, handler: () => available ? purchase({kind, label, price}) : unavailable(),
      style: available ? TextStyle.WINDOW : TextStyle.SHADOW_TEXT,
      item: 'candy', itemArgs: available ? colors : ['808080', '808080']});
  };
  if (!info.passive) add('passive', 'unlockPassive', info.passivePrice,
    info.eligible && info.passiveAvailable && info.candies >= info.passivePrice);
  else add('toggle', info.passive === 2 ? 'disablePassive' : 'enablePassive', 0, info.eligible && info.passiveAvailable);
  if (info.price !== null) add('reduction', 'reduceCost', info.price,
    info.eligible && info.candies >= info.price, {newCost: info.nextCost});
  add('egg', 'sameSpeciesEgg', info.eggPrice, info.eligible && !info.eggFull && info.candies >= info.eggPrice);
  options.push({label: i18next.t('menu:cancel'), keepOpen: true, handler: cancel});
  return options;
}

export class StarterCandyMenu {
  private active = false;
  private busy = false;
  private generation = 0;
  private speciesId: number;
  private rootId: number;
  private pending?: Purchase;
  get isBusy() { return this.busy; }
  constructor(private scene: BattleScene, private personal: any, private current: () => boolean,
    private notice: (text: string) => void, private saved: (id: number) => void) {}

  open(speciesId: number, rootId: number) {
    if (!this.current() || !this.personal.canBuyCandyReduction) return;
    if (!this.pending) { this.speciesId = speciesId; this.rootId = rootId; }
    else this.notice('请先重试：' + this.personal.candyInfo(this.speciesId).candySpeciesName + ' · ' + this.pending.label);
    this.active = true;
    this.render();
  }
  private show(options: OptionSelectItem[], noCancel = false) {
    const version = ++this.generation;
    const config: OptionSelectConfig = {captureMenu: true, noCancel, options: options.map(option => ({...option,
      keepOpen: true, handler: () => {
        if (version === this.generation && this.active && this.current() && this.scene.ui.getMode() === Mode.OPTION_SELECT) option.handler();
      }}))};
    if (this.scene.ui.getMode() === Mode.OPTION_SELECT) this.scene.ui.getHandler().show([config]);
    else void this.scene.ui.setOverlayMode(Mode.OPTION_SELECT, config).catch(() => {
      this.active = false;
      if (this.current()) this.notice('糖果菜单读取失败，请返回重试');
    });
  }
  private render() {
    if (this.pending) { this.showRetry(); return; }
    const info = this.personal.candyInfo(this.speciesId);
    this.show(candyUpgradeOptions(info, getStarterColors(this.rootId), action => {
      // Use the original option selector for confirmation; the permanent write
      // starts only after Yes. Replacing its config avoids growing the mode stack.
      this.notice(`确认：${info.candySpeciesName} · ${action.label}`);
      this.show([
        {label: i18next.t('menu:yes'), handler: () => { void this.commit(action); }},
        {label: i18next.t('menu:no'), handler: () => { this.notice(''); this.render(); }}
      ]);
    }, () => { this.scene.ui.playError(); this.notice('当前操作不可用，请检查本人解锁、糖果余额、被动支持情况或蛋库存'); }, () => { void this.close(); }));
  }
  private showRetry() {
    this.show([
      {label: '重试：' + this.pending.label, handler: () => { void this.commit(this.pending); }},
      {label: i18next.t('menu:cancel'), handler: () => { void this.close(); }}
    ]);
  }
  private async commit(action: Purchase) {
    if (this.busy || !this.active || !this.current()) return;
    this.busy = true; this.pending = action;
    this.notice('正在保存…');
    this.show([{label: '正在保存…', handler: () => {}}], true);
    try {
      await this.personal.purchaseCandyUpgrade(this.speciesId, action.kind);
      this.pending = undefined;
      if (!this.active || !this.current()) return;
      this.scene.playSound('buy');
      const id = this.speciesId;
      await this.close();
      if (this.current()) this.saved(id);
    } catch (error) {
      if (this.active && this.current()) {
        const message = ({CANDY_INSUFFICIENT: '糖果不足', CANDY_RETRY_PENDING: '请先重试上一笔尚未保存的操作',
          GACHA_INVENTORY_FULL: '蛋库存已满', CANDY_SPECIES_LOCKED: '本人尚未解锁该物种'})[error.message];
        if (this.pending) {
          this.notice(message ?? '保存失败，请重试；同一笔操作不会重复扣款'); this.showRetry();
        } else this.notice('已保存，界面刷新失败，请重新进入');
      }
    } finally { this.busy = false; }
  }
  private async close() {
    if (this.busy && this.pending) return;
    this.active = false; this.generation++;
    if (this.scene.ui.getMode() === Mode.OPTION_SELECT) await this.scene.ui.revertMode();
    if (this.current()) this.notice('');
  }
  destroy() { this.active = false; this.generation++; }
}
