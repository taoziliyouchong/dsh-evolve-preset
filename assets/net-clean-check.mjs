#!/usr/bin/env node
// 净版交付物校验：扫「项目推进过程」痕迹词（净版门禁的可执行判据）。
// 用法：node net-clean-check.mjs <净版文件> [更多文件...]
// 退出码：0＝干净；1＝有命中（A 组必删，B 组论证连词通常也该删）；2＝用法错误
//
// 判据：净版只写「做什么」（规则）＋「最终结论数字」（结果表）；
// 「我为什么这么定」（实测/对照/已验证/已删/试过/扫描/配对…）属项目说明。
import fs from 'node:fs';

const A = ['实测', '对照', '验证', '已删', '删掉', '删前', '删后', '不是漏了', '试过', '测过',
  '迭代', '批次', '候选', '扫描', '逐位', '配对', '改善占比', '样本外', '回归确认', '推翻',
  '否决', '项目说明', '台账', '枚举', '踩坑', '自伤', '口径讨论', '当初', '此前'];
const B = ['因为', '由于', '所以', '原因是', '之所以', '既然如此'];

const files = process.argv.slice(2);
if (!files.length) {
  console.log('用法：node net-clean-check.mjs <净版文件> [更多文件...]');
  process.exit(2);
}
let hit = 0;
for (const f of files) {
  let txt;
  try {
    txt = fs.readFileSync(f, 'utf8');
  } catch (e) {
    console.log(`\n== ${f} ==\n  ! 读不到：${e.message}`);
    hit += 1;
    continue;
  }
  const rows = [];
  txt.split(/\r?\n/).forEach((ln, i) => {
    const scan = ln.replace(/`[^`]*`/g, '`…`');   // 反引号里的文件名/命令是引用，不算正文
    for (const w of A) if (scan.includes(w)) rows.push([i + 1, 'A', w, ln.trim().slice(0, 88)]);
    for (const w of B) if (scan.includes(w)) rows.push([i + 1, 'B', w, ln.trim().slice(0, 88)]);
  });
  console.log(`\n== ${f} ==`);
  if (!rows.length) {
    console.log('  ✓ 未命中过程痕迹词');
    continue;
  }
  hit += rows.length;
  for (const [n, lv, w, s] of rows) console.log(`  [${lv}] 第 ${n} 行 命中「${w}」：${s}`);
}
console.log(`\n合计命中 ${hit} 处${hit ? '（A 组必删或搬去项目说明；B 组论证连词，净版里通常也该删）' : ''}`);
process.exit(hit ? 1 : 0);
