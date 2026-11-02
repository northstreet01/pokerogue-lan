import BattleScene from "./battle-scene";
import {recordDiagnostic} from './diagnostics.mjs';

export class Phase {
  protected scene: BattleScene;

  constructor(scene: BattleScene) {
    this.scene = scene;
  }

  start() {
    if(this.scene.appUrl)recordDiagnostic('phase-start',{phase:this.constructor.name,wave:this.scene.currentBattle?.waveIndex});
    console.log(`%cStart Phase ${this.constructor.name}`, 'color:green;');
  }

  end() {
    this.scene.shiftPhase();
  }
}
