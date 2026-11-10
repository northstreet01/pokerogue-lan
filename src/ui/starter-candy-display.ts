// Extracted from upstream StarterSelectUiHandler's candy display. Scene and
// early save fields are injected; icon layering, tints and crop formula match it.
import type BattleScene from '../battle-scene';
import starterColors from '../data/starter-colors.json';
import {addTextObject, TextStyle, updateCandyCountTextStyle} from './text';

export function getStarterColors(speciesId: number): [string, string] {
  return starterColors[speciesId] ?? ['ffffff', 'ffffff'];
}

export class StarterCandyDisplay extends Phaser.GameObjects.Container {
  private candy: Phaser.GameObjects.Sprite;
  private overlay: Phaser.GameObjects.Sprite;
  private darkness: Phaser.GameObjects.Sprite;
  private countText: Phaser.GameObjects.Text;
  private tooltipActive = false;
  private info: any;
  constructor(private host: BattleScene, x: number, y: number) {
    super(host, x, y);
    this.candy = host.add.sprite(0, 0, 'candy').setScale(.5).setOrigin(0);
    this.overlay = host.add.sprite(0, 0, 'candy_overlay').setScale(.5).setOrigin(0);
    this.darkness = host.add.sprite(0, 0, 'candy').setScale(.5).setOrigin(0).setTint(0).setAlpha(.5);
    this.countText = addTextObject(host, 9.5, 0, '×0', TextStyle.WINDOW, {fontSize: '42px'}).setOrigin(0);
    this.add([this.candy, this.overlay, this.darkness, this.countText]);
    this.darkness.setInteractive();
    this.darkness.on('pointerover', () => {
      if (!this.info) return;
      this.tooltipActive = true;
      host.ui.showTooltip('', `${this.info.candySpeciesName}：${this.info.friendship}/${this.info.cap}`, true);
    });
    this.darkness.on('pointerout', () => this.hideTooltip());
  }
  update(info: any, speciesId: number) {
    this.hideTooltip(); this.info = info;
    const colors = getStarterColors(speciesId).map(color => Number.parseInt(color.replace('#', ''), 16));
    this.candy.setTint(colors[0]); this.overlay.setTint(colors[1]);
    this.countText.setText(`×${info.candies}`); updateCandyCountTextStyle(this.countText, info.candies);
    const candyCropY = 16 - 16 * (info.friendship / info.cap);
    this.darkness.setCrop(0, 0, 16, candyCropY);
  }
  private hideTooltip() {
    if (this.tooltipActive) this.host.ui.hideTooltip();
    this.tooltipActive = false;
  }
  destroy(fromScene?: boolean) { this.hideTooltip(); super.destroy(fromScene); }
}
