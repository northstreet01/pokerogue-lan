import { Egg, GachaType } from "../data/egg";

export default class EggData {
  public id: integer;
  public gachaType: GachaType;
  public hatchWaves: integer;
  public timestamp: integer;
  public speciesId?: number;

  constructor(source: Egg | any) {
    const sourceEgg = source instanceof Egg ? source as Egg : null;
    this.id = sourceEgg ? sourceEgg.id : source.id;
    this.gachaType = sourceEgg ? sourceEgg.gachaType : source.gachaType;
    this.hatchWaves = sourceEgg ? sourceEgg.hatchWaves : source.hatchWaves;
    this.timestamp = sourceEgg ? sourceEgg.timestamp : source.timestamp;
    if(source.speciesId!==undefined)this.speciesId=source.speciesId;
  }

  toEgg(): Egg {
    const egg=new Egg(this.id, this.gachaType, this.hatchWaves, this.timestamp);
    if(this.speciesId!==undefined)egg.speciesId=this.speciesId;
    return egg;
  }
}
