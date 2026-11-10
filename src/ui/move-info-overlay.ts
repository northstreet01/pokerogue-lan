// Ported from pagefaultgames/pokerogue src/ui/containers/move-info-overlay.ts; AGPL-3.0.
// Source SHA256: 781a46aa0063d929b0dc900428ac8915c8abe0ac108f95d5f68d01eea36e5493
// Reproduce using scripts/import-pokedex-components.mjs.
import {getLocalizedSpriteKey} from "./localized-sprite";
import type BattleScene from "../battle-scene";
import { MoveCategory } from "../data/move";
import { Type as PokemonType } from "../data/type";
import { TextStyle } from "./text";
import type Move from "../data/move";
import { addTextObject } from "./text";
import { addWindow } from "./window";
import { fixedInt } from "../utils";
import i18next from "../i18n";

export interface MoveInfoOverlaySettings {
  /**
   * If true, showing the overlay will only set it to active and populate the fields
   * and the handler using this field has to manually call `setVisible` later.
   */
  delayVisibility?: boolean;
  /** Whether the effect box should be on top */
  top?: boolean;
  /** Whether the effect box should be on the right */
  right?: boolean;
  /** Whether the effect box should be on the side. Overrides the `top` param if `true`. */
  onSide?: boolean;
  /** `x` position of the component, unaffected by scaling */
  x?: number;
  /** `y` position of the component, unaffected by scaling */
  y?: number;
  /** Width of the component, unaffected by scaling. Defaults to half the screen width. */
  width?: number;
  /** Whether to display the small secondary box */
  hideEffectBox?: boolean;
  hideBg?: boolean;
}

const EFF_HEIGHT = 48;
const EFF_WIDTH = 82;
const DESC_HEIGHT = 48;
const BORDER = 8;
const GLOBAL_SCALE = 6;

export class MoveInfoOverlay extends Phaser.GameObjects.Container {
  public active = false;

  private textMaskRect: Phaser.GameObjects.Graphics;
  private desc: Phaser.GameObjects.Text;
  private descScroll: Phaser.Tweens.Tween | null = null;

  private val: Phaser.GameObjects.Container;
  private pp: Phaser.GameObjects.Text;
  private pow: Phaser.GameObjects.Text;
  private acc: Phaser.GameObjects.Text;
  private typ: Phaser.GameObjects.Sprite;
  private cat: Phaser.GameObjects.Sprite;
  private descBg: Phaser.GameObjects.NineSlice;

  private options: MoveInfoOverlaySettings;

  constructor(private readonly host: BattleScene, options?: MoveInfoOverlaySettings) {
    if (options?.onSide) {
      options.top = false;
    }
    super(host, options?.x, options?.y);
    this.setScale(1);
    this.options = options || {};

    // prepare the description box
    const width = options?.width || MoveInfoOverlay.getWidth(); // we always want this to be half a window wide
    this.descBg = addWindow(this.host,
      options?.onSide && !options?.right ? EFF_WIDTH : 0,
      options?.top ? EFF_HEIGHT : 0,
      width - (options?.onSide ? EFF_WIDTH : 0),
      DESC_HEIGHT,
    );
    this.descBg.setOrigin(0, 0);
    this.add(this.descBg);

    // set up the description; wordWrap uses true pixels, unaffected by any scaling, while other values are affected
    this.desc = addTextObject(this.host,
      (options?.onSide && !options?.right ? EFF_WIDTH : 0) + BORDER,
      (options?.top ? EFF_HEIGHT : 0) + BORDER - 2,
      "",
      TextStyle.BATTLE_INFO,
      {
        wordWrap: {
          width: (width - (BORDER - 2) * 2 - (options?.onSide ? EFF_WIDTH : 0)) * GLOBAL_SCALE,
        },
      },
    );

    // limit the text rendering, required for scrolling later on
    const maskPointOrigin = {
      x: options?.x || 0,
      y: options?.y || 0,
    };
    if (maskPointOrigin.x < 0) {
      maskPointOrigin.x += (this.host.game.canvas.width / 6);
    }
    if (maskPointOrigin.y < 0) {
      maskPointOrigin.y += (this.host.game.canvas.height / 6);
    }

    const moveDescriptionTextMaskRect = this.textMaskRect = this.host.make.graphics();
    moveDescriptionTextMaskRect.fillStyle(0xff0000);
    moveDescriptionTextMaskRect.fillRect(
      maskPointOrigin.x + ((options?.onSide && !options?.right ? EFF_WIDTH : 0) + BORDER),
      maskPointOrigin.y + ((options?.top ? EFF_HEIGHT : 0) + BORDER - 2),
      width - ((options?.onSide ? EFF_WIDTH : 0) - BORDER * 2),
      DESC_HEIGHT - (BORDER - 2) * 2,
    );
    moveDescriptionTextMaskRect.setScale(6);
    const moveDescriptionTextMask = this.createGeometryMask(moveDescriptionTextMaskRect);

    this.add(this.desc);
    this.desc.setMask(moveDescriptionTextMask);

    // prepare the effect box
    this.val = new Phaser.GameObjects.Container(
      this.host,
      options?.right ? width - EFF_WIDTH : 0,
      options?.top || options?.onSide ? 0 : DESC_HEIGHT,
    );
    this.add(this.val);

    const valuesBg = addWindow(this.host, 0, 0, EFF_WIDTH, EFF_HEIGHT);
    valuesBg.setOrigin(0, 0);
    this.val.add(valuesBg);

    this.typ = this.host.add.sprite(25, EFF_HEIGHT - 35, getLocalizedSpriteKey("types"), "unknown");
    this.typ.setScale(0.8);
    this.val.add(this.typ);

    this.cat = this.host.add.sprite(57, EFF_HEIGHT - 35, "categories", "physical");
    this.val.add(this.cat);

    const ppTxt = addTextObject(this.host, 12, EFF_HEIGHT - 25, "PP", TextStyle.TOOLTIP_CONTENT, {fontSize: "48px"});
    ppTxt.setOrigin(0.0, 0.5);
    ppTxt.setText(i18next.t("fightUiHandler:pp"));
    this.val.add(ppTxt);

    this.pp = addTextObject(this.host, 70, EFF_HEIGHT - 25, "--", TextStyle.TOOLTIP_CONTENT, {fontSize: "48px"});
    this.pp.setOrigin(1, 0.5);
    this.val.add(this.pp);

    const powTxt = addTextObject(this.host, 12, EFF_HEIGHT - 17, "POWER", TextStyle.TOOLTIP_CONTENT, {fontSize: "48px"});
    powTxt.setOrigin(0.0, 0.5);
    powTxt.setText(i18next.t("fightUiHandler:power"));
    this.val.add(powTxt);

    this.pow = addTextObject(this.host, 70, EFF_HEIGHT - 17, "---", TextStyle.TOOLTIP_CONTENT, {fontSize: "48px"});
    this.pow.setOrigin(1, 0.5);
    this.val.add(this.pow);

    const accTxt = addTextObject(this.host, 12, EFF_HEIGHT - 9, "ACC", TextStyle.TOOLTIP_CONTENT, {fontSize: "48px"});
    accTxt.setOrigin(0.0, 0.5);
    accTxt.setText(i18next.t("fightUiHandler:accuracy"));
    this.val.add(accTxt);

    this.acc = addTextObject(this.host, 70, EFF_HEIGHT - 9, "---", TextStyle.TOOLTIP_CONTENT, {fontSize: "48px"});
    this.acc.setOrigin(1, 0.5);
    this.val.add(this.acc);

    if (options?.hideEffectBox) {
      this.val.setVisible(false);
    }

    if (options?.hideBg) {
      this.descBg.setVisible(false);
    }

    // hide this component for now
    this.setVisible(false);
  }

  // show this component with infos for the specific move
  show(move: Move): boolean {
    this.pow.setText(move.power >= 0 ? move.power.toString() : "---");
    this.acc.setText(move.accuracy >= 0 ? move.accuracy.toString() : "---");
    this.pp.setText(move.pp >= 0 ? move.pp.toString() : "---");
    this.typ.setTexture(getLocalizedSpriteKey("types"), PokemonType[move.type].toLowerCase());
    this.cat.setFrame(MoveCategory[move.category].toLowerCase());

    this.desc.setText(move?.effect || "");

    // stop previous scrolling effects and reset y position
    if (this.descScroll) {
      this.descScroll.remove();
      this.descScroll = null;
      this.desc.y = (this.options?.top ? EFF_HEIGHT : 0) + BORDER - 2;
    }

    // determine if we need to add new scrolling effects
    const moveDescriptionLineCount = Math.floor((this.desc.displayHeight * (96 / 72)) / 14.83);
    if (moveDescriptionLineCount > 3) {
      // generate scrolling effects
      this.descScroll = this.host.tweens.add({
        targets: this.desc,
        delay: fixedInt(2000),
        loop: -1,
        hold: fixedInt(2000),
        duration: fixedInt((moveDescriptionLineCount - 3) * 2000),
        y: `-=${14.83 * (72 / 96) * (moveDescriptionLineCount - 3)}`,
      });
    }

    if (!this.options.delayVisibility) {
      this.setVisible(true);
    }
    this.active = true;
    return true;
  }

  clear() {
    this.descScroll?.remove(); this.descScroll = null; this.desc.y = (this.options?.top ? EFF_HEIGHT : 0) + BORDER - 2;
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
  static getHeight(onSide?: boolean): number {
    return onSide ? Math.max(EFF_HEIGHT, DESC_HEIGHT) : EFF_HEIGHT + DESC_HEIGHT;
  }
}
