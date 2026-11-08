import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {titleMusic,musicLabel,showMusicCaption} from '../src/ui/music-caption.mjs';
test('seasonal title uses winter music only in December and the first half of January',()=>{
  for(const [month,day,expected] of [[10,8,'title'],[11,1,'winter_title'],[0,15,'winter_title'],[0,16,'title']])
    assert.equal(titleMusic(new Date(2026,month,day)),expected);
});
test('music display is unique, text-only and shows mute state',()=>{
  const dom=new JSDOM('<nav id="desktopControls"></nav>');globalThis.document=dom.window.document;
  showMusicCaption('title');showMusicCaption('winter_title',true);
  assert.equal(document.querySelectorAll('#now-playing').length,1);
  assert.match(document.getElementById('now-playing').textContent,/Andr06.*静音/);
  showMusicCaption('<img_src=x>');assert.equal(document.querySelector('#now-playing img'),null);
  assert.equal(musicLabel('battle_wild'),'battle wild');dom.window.close();delete globalThis.document;
});
