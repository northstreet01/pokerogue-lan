// Ported from pagefaultgames/pokerogue src/ui/containers/pokedex-info-overlay.ts; AGPL-3.0.
// Source SHA256: 341bb8e0c9ffb7e5a627a52b2e8eb097ce7cd0021c674284e0fcd0b7217ed9f6
// Reproduce using scripts/import-pokedex-components.mjs.
import type BattleScene from "../battle-scene";
import { TextStyle } from "./text";
import { addTextObject } from "./text";
import { addWindow } from "./window";
import { fixedInt } from "../utils";

export interface PokedexInfoOverlaySettings {
  delayVisibility?: boolean; // if true, showing the overlay will only set it to active and populate the fields and the handler using this field has to manually call setVisible later.
  //location and width of the component; unaffected by scaling
  x?: number;
  y?: number;
  /** Default is always half the screen, regardless of scale */
  width?: number;
  /** Determines whether to display the small secondary box */
  hideEffectBox?: boolean;
  hideBg?: boolean;
}

const DESC_HEIGHT = 48;
const BORDER = 8;
const GLOBAL_SCALE = 6;

export class PokedexInfoOverlay extends Phaser.GameObjects.Container {
  public active = false;

  private readonly desc: Phaser.GameObjects.Text;
  private descScroll: Phaser.Tweens.Tween | null = null;

  private readonly descBg: Phaser.GameObjects.NineSlice;

  private readonly options: PokedexInfoOverlaySettings;

  private readonly textMaskRect: Phaser.GameObjects.Graphics;

  private readonly maskPointOriginX: number;
  private readonly maskPointOriginY: number;
  public width: number;

  constructor(private readonly host: BattleScene, options?: PokedexInfoOverlaySettings) {
    super(host, options?.x, options?.y);
    this.setScale(1);
    this.options = options || {};

    // prepare the description box
    this.width = options?.width || PokedexInfoOverlay.getWidth(); // we always want this to be half a window wide
    this.descBg = addWindow(this.host, 0, 0, this.width, DESC_HEIGHT);
    this.descBg.setOrigin(0, 0);
    this.add(this.descBg);

    // set up the description; wordWrap uses true pixels, unaffected by any scaling, while other values are affected
    this.desc = addTextObject(this.host, BORDER, BORDER - 2, "", TextStyle.BATTLE_INFO, {
      wordWrap: { width: (this.width - (BORDER - 2) * 2) * GLOBAL_SCALE },
    });

    // limit the text rendering, required for scrolling later on
    this.maskPointOriginX = options?.x || 0;
    this.maskPointOriginY = options?.y || 0;

    if (this.maskPointOriginX < 0) {
      this.maskPointOriginX += (this.host.game.canvas.width / 6);
    }
    if (this.maskPointOriginY < 0) {
      this.maskPointOriginY += (this.host.game.canvas.height / 6);
    }

    this.textMaskRect = this.host.make.graphics();
    this.textMaskRect.fillStyle(0xff0000);
    this.textMaskRect.fillRect(
      this.maskPointOriginX + BORDER,
      this.maskPointOriginY + (BORDER - 2),
      this.width - BORDER * 2,
      DESC_HEIGHT - (BORDER - 2) * 2,
    );
    this.textMaskRect.setScale(6);
    const textMask = this.createGeometryMask(this.textMaskRect);

    this.add(this.desc);
    this.desc.setMask(textMask);

    if (options?.hideBg) {
      this.descBg.setVisible(false);
    }

    // hide this component for now
    this.setVisible(false);
  }

  // show this component with infos for the specific move
  show(text: string): boolean {

    this.desc.setText(text ?? "");

    // stop previous scrolling effects and reset y position
    if (this.descScroll) {
      this.descScroll.remove();
      this.descScroll = null;
      this.desc.y = BORDER - 2;
    }

    // determine if we need to add new scrolling effects
    const lineCount = Math.floor((this.desc.displayHeight * (96 / 72)) / 14.83);

    const newHeight = lineCount >= 3 ? 48 : lineCount === 2 ? 36 : 24;
    this.textMaskRect.clear();
    this.textMaskRect.fillStyle(0xff0000);
    this.textMaskRect.fillRect(
      this.maskPointOriginX + BORDER,
      this.maskPointOriginY + (BORDER - 2) + (48 - newHeight),
      this.width - BORDER * 2,
      newHeight - (BORDER - 2) * 2,
    );
    const updatedMask = this.createGeometryMask(this.textMaskRect);
    this.desc.clearMask(true);
    this.desc.setMask(updatedMask);

    this.descBg.setSize(this.descBg.width, newHeight);
    this.descBg.setY(48 - newHeight);
    this.desc.setY(BORDER - 2 + (48 - newHeight));

    if (lineCount > 3) {
      // generate scrolling effects
      this.descScroll = this.host.tweens.add({
        targets: this.desc,
        delay: fixedInt(2000),
        loop: -1,
        hold: fixedInt(2000),
        duration: fixedInt((lineCount - 3) * 2000),
        y: `-=${14.83 * (72 / 96) * (lineCount - 3)}`,
      });
    }

    if (!this.options.delayVisibility) {
      this.setVisible(true);
    }
    this.active = true;
    return true;
  }

  clear() {
    this.descScroll?.remove(); this.descScroll = null; this.desc.y = BORDER - 2;
    this.setVisible(false);
    this.active = false;
  }

  toggleInfo(visible: boolean): void {
    if (visible) {
      this.setVisible(true);
    }
    this.host.tweens.add({
      targets: this.desc,
      duration: fixedInt(125),
      ease: "Sine.easeInOut",
      alpha: visible ? 1 : 0,
    });
    if (!visible) {
      this.setVisible(false);
    }
  }

  destroy(fromScene?: boolean) {
    this.clear(); this.host.tweens.killTweensOf(this.desc);
    this.desc.clearMask(true); this.textMaskRect.destroy(); super.destroy(fromScene);
  }

  isActive(): boolean {
    return this.active;
  }

  // width of this element
  static getWidth(): number {
    return 160; // early client: 320 logical pixels
  }

  // height of this element
  static getHeight(): number {
    return DESC_HEIGHT;
  }
}
