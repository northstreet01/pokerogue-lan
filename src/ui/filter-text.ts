// Ported from pagefaultgames/pokerogue; scene and text entry are adapted.
import BattleScene from "../battle-scene";
import {TextStyle, addTextObject, getTextColor} from "./text";
import {addWindow, WindowVariant} from "./window";

export enum FilterTextRow {
  NAME,
  MOVE_1,
  MOVE_2,
  ABILITY_1,
  ABILITY_2,
}

export class FilterText extends Phaser.GameObjects.Container {
  private window: Phaser.GameObjects.NineSlice;
  private labels: Phaser.GameObjects.Text[] = [];
  private selections: Phaser.GameObjects.Text[] = [];
  private rows: FilterTextRow[] = [];
  public cursorObj: Phaser.GameObjects.Image;
  public numFilters = 0;

  private onChange: () => void;

  public defaultText = "---";

  constructor(private readonly host: BattleScene, private readonly edit: (row: number) => void, x: number, y: number, width: number, height: number, onChange: () => void) {
    super(host, x, y);

    this.onChange = onChange;

    this.width = width;
    this.height = height;

    this.window = addWindow(this.host, 0, 0, width, height, false, false, undefined, undefined, WindowVariant.THIN);
    this.add(this.window);

    this.cursorObj = this.host.add.image(1, 1, "cursor");
    this.cursorObj.setScale(0.5);
    this.cursorObj.setVisible(false);
    this.cursorObj.setOrigin(0, 0);
    this.add(this.cursorObj);

  }

  /**
   * Add a new filter to the FilterBar, as long that a unique DropDownColumn is provided
   * @param column  the DropDownColumn that will be used to access the filter values
   * @param title   the string that will get displayed in the filter bar
   * @param dropDown the DropDown with all options for this filter
   * @returns true if successful, false if the provided column was already in use for another filter
   */
  addFilter(row: FilterTextRow, title: string): boolean {
    const paddingX = 6;
    const cursorOffset = 8;
    const extraSpaceX = 40;

    if (this.rows.includes(row)) {
      return false;
    }

    this.rows.push(row);

    const filterTypesLabel = addTextObject(this.host, paddingX + cursorOffset, 3, title, TextStyle.TOOLTIP_CONTENT);
    this.labels.push(filterTypesLabel);
    this.add(filterTypesLabel);

    const filterTypesSelection = addTextObject(this.host,
      paddingX + cursorOffset + extraSpaceX,
      3,
      this.defaultText,
      TextStyle.TOOLTIP_CONTENT,
    );
    this.selections.push(filterTypesSelection);
    this.add(filterTypesSelection);

    this.calcFilterPositions();
    this.numFilters++;

    return true;
  }

  resetSelection(index: number): void {
    this.selections[index].setText(this.defaultText);
    this.onChange();
  }

  setValsToDefault(): void {
    for (let i = 0; i < this.numFilters; i++) {
      this.resetSelection(i);
    }
  }

  startSearch(index: number): void {
    this.edit(index);
  }

  setCursor(cursor: number): void {
    const cursorOffset = 8;

    this.cursorObj.setPosition(cursorOffset, this.labels[cursor].y + 3);
  }

  /**
   * Highlight the labels of the FilterBar if the filters are different from their default values
   */
  updateFilterLabels(): void {
    for (let i = 0; i < this.numFilters; i++) {
      if (this.selections[i].text === this.defaultText) {
        this.labels[i].setColor(getTextColor(TextStyle.TOOLTIP_CONTENT, false));
      } else {
        this.labels[i].setColor(getTextColor(TextStyle.TOOLTIP_TITLE, false));
      }
    }
  }

  /**
   * Position the filter dropdowns evenly across the width of the container
   */
  private calcFilterPositions(): void {
    const paddingY = 8;

    let totalHeight = paddingY * 2;
    this.labels.forEach(label => {
      totalHeight += label.displayHeight;
    });
    const spacing = (this.height - totalHeight) / (this.labels.length - 1);
    for (let i = 0; i < this.labels.length; i++) {
      if (i === 0) {
        this.labels[i].y = paddingY;
        this.selections[i].y = paddingY;
      } else {
        const lastBottom = this.labels[i - 1].y + this.labels[i - 1].displayHeight;
        this.labels[i].y = lastBottom + spacing;
        this.selections[i].y = lastBottom + spacing;
      }
    }
  }

  getValue(row: number): string {
    return this.selections[row].text;
  }

  /**
   * Forcibly set the selection text for a specific filter row and then call the `onChange` function
   *
   * @param row - The filter row to set the text for
   * @param value - The text to set for the filter row
   */
  setValue(row: FilterTextRow, value: string) {
    this.selections[row].setText(value);
    this.onChange();
  }

  /**
   * Find the nearest filter to the provided container on the y-axis
   * @param container the StarterContainer to compare position against
   * @returns the index of the closest filter
   */
  getNearestFilter(container: { y: number; icon: { displayHeight: number } }): number {
    const midy = container.y + container.icon.displayHeight / 2;
    let nearest = 0;
    let nearestDist = 1000;
    for (let i = 0; i < this.labels.length; i++) {
      const dist = Math.abs(midy - (this.labels[i].y + this.labels[i].displayHeight / 3));
      if (dist < nearestDist) {
        nearest = i;
        nearestDist = dist;
      }
    }

    return nearest;
  }
}
