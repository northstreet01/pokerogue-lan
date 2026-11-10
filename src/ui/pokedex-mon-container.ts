// Ported from pagefaultgames/pokerogue src/ui/containers/pokedex-mon-container.ts; AGPL-3.0.
// Source SHA256: 36cb0f03971d7471f6b488cc435d7b539a2fd21c77c68a7ea5ded6bcca9823ef
// Reproduce using scripts/import-pokedex-components.mjs.
import type BattleScene from "../battle-scene";
import type PokemonSpecies from "../data/pokemon-species";
import { TextStyle } from "./text";
import { addTextObject } from "./text";

interface SpeciesDetails {
  shiny?: boolean;
  formIndex?: number;
  female?: boolean;
  variant?: number;
}

export class PokedexMonContainer extends Phaser.GameObjects.Container {
  public species: PokemonSpecies;
  public icon: Phaser.GameObjects.Sprite;
  public shinyIcons: Phaser.GameObjects.Image[] = [];
  public label: Phaser.GameObjects.Text;
  public starterPassiveBgs: Phaser.GameObjects.Image;
  public hiddenAbilityIcon: Phaser.GameObjects.Image;
  public favoriteIcon: Phaser.GameObjects.Image;
  public classicWinIcon: Phaser.GameObjects.Image;
  public candyUpgradeIcon: Phaser.GameObjects.Image;
  public candyUpgradeOverlayIcon: Phaser.GameObjects.Image;
  public eggMove1Icon: Phaser.GameObjects.Image;
  public tmMove1Icon: Phaser.GameObjects.Image;
  public eggMove2Icon: Phaser.GameObjects.Image;
  public tmMove2Icon: Phaser.GameObjects.Image;
  public passive1Icon: Phaser.GameObjects.Image;
  public passive2Icon: Phaser.GameObjects.Image;
  public passive1OverlayIcon: Phaser.GameObjects.Image;
  public passive2OverlayIcon: Phaser.GameObjects.Image;
  public cost = 0;

  constructor(private readonly host: BattleScene, private readonly catalogue: any, species: PokemonSpecies, options: SpeciesDetails = {}) {
    super(host, 0, 0);

    this.setSpecies(species, options);

    // starter passive bg
    const starterPassiveBg = this.host.add.image(2, 5, "passive_bg");
    starterPassiveBg.setOrigin(0, 0);
    starterPassiveBg.setScale(0.75);
    starterPassiveBg.setVisible(false);
    this.add(starterPassiveBg);
    this.starterPassiveBgs = starterPassiveBg;

    // shiny icons
    for (let i = 0; i < 1; i++) {
      const shinyIcon = this.host.add.image(i * -3 + 12, 2, "shiny_star_small");
      shinyIcon.setScale(0.5);
      shinyIcon.setOrigin(0, 0);
      shinyIcon.setVisible(false);
      this.shinyIcons.push(shinyIcon);
    }
    this.add(this.shinyIcons);

    // value label
    const label = addTextObject(this.host, 1, 2, "0", TextStyle.WINDOW, {
      fontSize: "32px",
    });
    label.setShadowOffset(2, 2);
    label.setOrigin(0, 0);
    label.setVisible(false);
    this.add(label);
    this.label = label;

    // hidden ability icon
    const abilityIcon = this.host.add.image(12, 7, "ha_capsule");
    abilityIcon.setOrigin(0, 0);
    abilityIcon.setScale(0.5);
    abilityIcon.setVisible(false);
    this.add(abilityIcon);
    this.hiddenAbilityIcon = abilityIcon;

    // favorite icon
    const favoriteIcon = this.host.add.image(0, 7, "favorite");
    favoriteIcon.setOrigin(0, 0);
    favoriteIcon.setScale(0.5);
    favoriteIcon.setVisible(false);
    this.add(favoriteIcon);
    this.favoriteIcon = favoriteIcon;

    // classic win icon
    const classicWinIcon = this.host.add.image(0, 12, "champion_ribbon");
    classicWinIcon.setOrigin(0, 0);
    classicWinIcon.setScale(0.5);
    classicWinIcon.setVisible(false);
    this.add(classicWinIcon);
    this.classicWinIcon = classicWinIcon;

    // candy upgrade icon
    const candyUpgradeIcon = this.host.add.image(12, 12, "candy");
    candyUpgradeIcon.setOrigin(0, 0);
    candyUpgradeIcon.setScale(0.25);
    candyUpgradeIcon.setVisible(false);
    this.add(candyUpgradeIcon);
    this.candyUpgradeIcon = candyUpgradeIcon;

    // candy upgrade overlay icon
    const candyUpgradeOverlayIcon = this.host.add.image(12, 12, "candy_overlay");
    candyUpgradeOverlayIcon.setOrigin(0, 0);
    candyUpgradeOverlayIcon.setScale(0.25);
    candyUpgradeOverlayIcon.setVisible(false);
    this.add(candyUpgradeOverlayIcon);
    this.candyUpgradeOverlayIcon = candyUpgradeOverlayIcon;

    // move icons
    const eggMove1Icon = this.host.add.image(0, 12, "common_egg");
    eggMove1Icon.setOrigin(0, -0.03);
    eggMove1Icon.setScale(0.24);
    eggMove1Icon.setVisible(false);
    this.add(eggMove1Icon);
    this.eggMove1Icon = eggMove1Icon;

    // move icons
    const tmMove1Icon = this.host.add.image(0, 12, "normal_memory");
    tmMove1Icon.setOrigin(0, 0);
    tmMove1Icon.setScale(0.25);
    tmMove1Icon.setVisible(false);
    this.add(tmMove1Icon);
    this.tmMove1Icon = tmMove1Icon;

    // move icons
    const eggMove2Icon = this.host.add.image(7, 12, "common_egg");
    eggMove2Icon.setOrigin(0, 0);
    eggMove2Icon.setScale(0.25);
    eggMove2Icon.setVisible(false);
    this.add(eggMove2Icon);
    this.eggMove2Icon = eggMove2Icon;

    // move icons
    const tmMove2Icon = this.host.add.image(7, 12, "normal_memory");
    tmMove2Icon.setOrigin(0, 0);
    tmMove2Icon.setScale(0.25);
    tmMove2Icon.setVisible(false);
    this.add(tmMove2Icon);
    this.tmMove2Icon = tmMove2Icon;

    // passive icons
    const passive1Icon = this.host.add.image(3, 3, "candy");
    passive1Icon.setOrigin(0, 0);
    passive1Icon.setScale(0.25);
    passive1Icon.setVisible(false);
    this.add(passive1Icon);
    this.passive1Icon = passive1Icon;

    const passive1OverlayIcon = this.host.add.image(12, 12, "candy_overlay");
    passive1OverlayIcon.setOrigin(0, 0);
    passive1OverlayIcon.setScale(0.25);
    passive1OverlayIcon.setVisible(false);
    this.add(passive1OverlayIcon);
    this.passive1OverlayIcon = passive1OverlayIcon;

    // passive icons
    const passive2Icon = this.host.add.image(12, 3, "candy");
    passive2Icon.setOrigin(0, 0);
    passive2Icon.setScale(0.25);
    passive2Icon.setVisible(false);
    this.add(passive2Icon);
    this.passive2Icon = passive2Icon;

    const passive2OverlayIcon = this.host.add.image(12, 12, "candy_overlay");
    passive2OverlayIcon.setOrigin(0, 0);
    passive2OverlayIcon.setScale(0.25);
    passive2OverlayIcon.setVisible(false);
    this.add(passive2OverlayIcon);
    this.passive2OverlayIcon = passive2OverlayIcon;
  }

  setSpecies(species: PokemonSpecies, options: SpeciesDetails = {}) {
    this.species = species;

    const { shiny, formIndex, female, variant } = options;

    const defaultDexAttr = this.catalogue.getSpeciesDefaultDexAttr(species);
    const defaultProps = this.catalogue.getSpeciesDexAttrProps(species, defaultDexAttr);

    if (formIndex != null) {
      defaultProps.formIndex = formIndex;
    }
    if (shiny != null) {
      defaultProps.shiny = shiny;
    }
    if (variant != null) {
      defaultProps.variant = variant;
    }
    if (female != null) {
      defaultProps.female = female;
    }

    if (this.icon) {
      this.remove(this.icon);
      this.icon.destroy(); // Properly removes the sprite from memory
    }

    // icon
    this.icon = this.host.add.sprite(
      -2,
      2,
      species.getIconAtlasKey(defaultProps.formIndex),
    );
    this.icon.setScale(0.5);
    this.icon.setOrigin(0, 0);
    this.icon.setFrame(
      species.getIconId(defaultProps.female, defaultProps.formIndex, defaultProps.shiny),
    );
    this.checkIconId(defaultProps.female, defaultProps.formIndex, defaultProps.shiny);
    this.add(this.icon);

    [
      this.hiddenAbilityIcon,
      this.favoriteIcon,
      this.classicWinIcon,
      this.candyUpgradeIcon,
      this.candyUpgradeOverlayIcon,
      this.eggMove1Icon,
      this.tmMove1Icon,
      this.eggMove2Icon,
      this.tmMove2Icon,
      this.passive1Icon,
      this.passive2Icon,
      this.passive1OverlayIcon,
      this.passive2OverlayIcon,
    ].forEach(icon => {
      if (icon) {
        this.bringToTop(icon);
      }
    });
  }

  checkIconId(female, formIndex, shiny, variant = 0) {
    if (this.icon.frame.name !== this.species.getIconId(female, formIndex, shiny)) {
      console.log(`${this.species.name}'s variant icon does not exist. Replacing with default.`);
      this.icon.setTexture(this.species.getIconAtlasKey(formIndex));
      this.icon.setFrame(this.species.getIconId(female, formIndex, false));
    }
  }
}
