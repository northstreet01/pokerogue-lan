import {readFile,writeFile,mkdtemp,mkdir,rm} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {desktopOutput} from './desktop-output.mjs';
import {ownedPackagePath,publishDesktopPackage} from './desktop-package.mjs';

async function packageDesktop(){
  const {packager}=await import('@electron/packager');
  const output=desktopOutput();await mkdir(output,{recursive:true});
  const staging=ownedPackagePath(output,await mkdtemp(join(output,'package-staging-')));
  try {
    const pkg=JSON.parse(await readFile('node_modules/electron/package.json','utf8'));
    const paths=await packager({dir:join(output,'app'),out:staging,name:'PokeRogue-LAN',
      electronZipDir:process.env.POKEROGUE_ELECTRON_ZIP_DIR||undefined,
      platform:'win32',arch:'x64',electronVersion:pkg.version,asar:false,overwrite:false,prune:false,
      executableName:'PokeRogue-LAN',
      win32metadata:{ProductName:'PokeRogue LAN',FileDescription:'Local LAN cooperative game'}});
    const app=JSON.parse(await readFile(join(output,'app/package.json'),'utf8'));
    await writeFile(join(paths[0],'开始游戏.txt'),[
      `PokéRogue LAN ${app.version} — Windows x64 测试版`,
      '',
      '请完整解压文件夹，再运行 PokeRogue-LAN.exe。不要只复制 EXE，无需安装 Node.js。',
      '先在大厅创建或选择个人档案。双方须使用同一版本。',
      '',
      '局域网：房主点击“创建房间”；队友输入六位房间码，自动搜索加入。',
      '未找到时检查网络与房间码，再通过手动入口填写房主地址。',
      '远程联机需要自行配置可直连网络或虚拟局域网，游戏不提供穿透或中继。',
      '',
      '卡住时先点底栏“导出联机诊断”，再尝试“重载存档”。',
      '更新前请备份；个人数据在 %APPDATA%\\PokeRogue-LAN，不要公开数据库或席位凭据。',
      '',
      '部分特殊招式、形态及长局同步仍可能异常。详细已知问题和使用说明：',
      `https://github.com/northstreet01/pokerogue-lan/blob/v${app.version}/README.md`,
      '',
      '游戏源码许可：resources/app/LICENSE；Electron 及 Chromium 许可见本目录许可文件。',
      ''
    ].join('\r\n'),'utf8');
    console.log(await publishDesktopPackage({output,staged:paths[0]}));
  } finally { await rm(ownedPackagePath(output,staging),{recursive:true,force:true,maxRetries:3,retryDelay:100}); }
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await packageDesktop();
