// ===========================================================================
//  TASK7 — 流体シミュレーション (Cellular-Automaton Fluid Simulation)
//
//  水と溶岩を「セルオートマトン方式」で実際に流れるようにする。
//
//  ・各液体セルは “量(level)” を持つ:
//      LEVEL_SOURCE(8) = 水源/溶岩源(無限に湧き出す本体)
//      1..7            = 流れ(flowing)。数字が小さいほど薄い(端っこ)。
//      0/未登録         = 液体なし。
//  ・毎ティック、各アクティブセルについて:
//      1) 真下が空けば全量を下へ落とす(縦方向は減衰しない)。
//      2) 下が埋まっていれば、四方の低いレベルの隣へ水平に広がる。
//         水平に広がるたびに level が 1 ずつ減り、やがて 0 になって消える。
//  ・水源は隣接 2 つ以上の水源があれば自己再生(無限水)。溶岩源は再生しない。
//  ・相互作用(これが本タスクの肝):
//      - 流れる水が「溶岩源」に触れる        → 溶岩源が【黒曜石】になる
//      - 流れる水が「流れる溶岩」に触れる    → 流れる溶岩が【丸石】になる
//      - 流れる溶岩が「水(源/流れ)」に触れる→ 流れる溶岩が【黒曜石/丸石】になる
//    (Minecraft と同じ挙動: 水源×溶岩源=黒曜石、水×流溶岩=丸石)
//
//  パフォーマンス: 全 512x96x512 を毎フレーム走査するのは不可能なので、
//  「アクティブセル」だけをキューで追跡し、プレイヤー周辺(シミュレーション
//  半径内)に限ってシミュレートする。setBlock / 採掘 / 設置で近傍を起こす。
// ===========================================================================
"use strict";

const FLUID = (function () {
  const LEVEL_SOURCE = 8;          // 水源・溶岩源(満タン)
  const MAX_FLOW = 7;              // 流れの最大レベル(源の一つ下)

  // ---- 液体レベルの疎ストレージ --------------------------------------------
  // world[] のブロック ID が WATER / LAVA のセルについて、その “量” を保持する。
  // 源(8)は省略時のデフォルトなので、わざわざ格納しなくても WATER/LAVA なら
  // 源とみなす……のではなく、明示管理する: 生成時の湖・海は「源」として扱い、
  // プレイヤーが置いた液体も源、流れだけ level<8 を Map に持たせる。
  const levels = new Map();        // blockIndex -> level(1..8)

  function idx(x, y, z) { return (y * WORLD_D + z) * WORLD_W + x; }

  function getLevel(x, y, z) {
    const id = getBlock(x, y, z);
    if (id !== B.WATER && id !== B.LAVA) return 0;
    const v = levels.get(idx(x, y, z));
    return v === undefined ? LEVEL_SOURCE : v;   // 登録が無い液体は源扱い
  }
  function setLevel(x, y, z, lv) {
    const i = idx(x, y, z);
    if (lv >= LEVEL_SOURCE) levels.delete(i);    // 源はデフォルト=非格納
    else levels.set(i, lv);
  }
  function clearLevel(x, y, z) { levels.delete(idx(x, y, z)); }

  // ---- アクティブセル管理 ----------------------------------------------------
  // 変化が起き得るセルだけを set に貯め、毎ティックそれらを処理する。処理の
  // 結果さらに変化が波及するセルは次ティックのキューへ積む。
  let active = new Set();          // 現在ティックで処理するセル
  let nextActive = new Set();      // 次ティックへ持ち越すセル

  // シミュレーション半径(チャンク)。プレイヤー周辺だけ動かす。
  const SIM_RADIUS = 6 * CHUNK;

  function inSimRange(x, y, z) {
    if (typeof player === "undefined") return true;
    const dx = x - player.pos.x, dz = z - player.pos.z;
    return dx * dx + dz * dz <= SIM_RADIUS * SIM_RADIUS;
  }

  // セルを「起こす」: そのセルと周囲6近傍を次ティックの処理対象にする。
  function wake(x, y, z) {
    if (x < 0 || x >= WORLD_W || y < 0 || y >= WORLD_H || z < 0 || z >= WORLD_D) return;
    nextActive.add(idx(x, y, z));
  }
  function wakeNeighbors(x, y, z) {
    wake(x, y, z);
    wake(x + 1, y, z); wake(x - 1, y, z);
    wake(x, y + 1, z); wake(x, y - 1, z);
    wake(x, y, z + 1); wake(x, y, z - 1);
  }

  // ---- ブロック分類ヘルパ ----------------------------------------------------
  function isWater(id) { return id === B.WATER; }
  function isLava(id) { return id === B.LAVA; }
  function isFluid(id) { return id === B.WATER || id === B.LAVA; }
  // 液体が流れ込める(置き換えられる)空き: 空気と、薄い同種液体・別種液体。
  function isReplaceable(id) {
    return id === B.AIR;
  }

  // 変更を world に反映しつつメッシュ再構築をまとめるためのバッファ。
  const dirtyChunks = new Set();
  function markChunk(x, z) {
    const cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK);
    dirtyChunks.add(cz * CHUNKS_X + cx);
    if (x % CHUNK === 0) dirtyChunks.add(cz * CHUNKS_X + (cx - 1));
    if (x % CHUNK === CHUNK - 1) dirtyChunks.add(cz * CHUNKS_X + (cx + 1));
    if (z % CHUNK === 0) dirtyChunks.add((cz - 1) * CHUNKS_X + cx);
    if (z % CHUNK === CHUNK - 1) dirtyChunks.add((cz + 1) * CHUNKS_X + cx);
  }

  // 液体専用の低レベル書き込み: world[] を直接書き換え、メッシュは後でまとめて
  // 再構築する(setBlock のような即時メッシュ更新は重いので使わない)。
  // persist=true なら worldEdits にも保存(プレイヤー設置/相互作用結果など)。
  function placeBlock(x, y, z, id, level, persist) {
    if (x < 0 || x >= WORLD_W || y < 0 || y >= WORLD_H || z < 0 || z >= WORLD_D) return;
    const i = idx(x, y, z);
    world[i] = id;
    if (id === B.WATER || id === B.LAVA) {
      if (level >= LEVEL_SOURCE) levels.delete(i); else levels.set(i, level);
    } else {
      levels.delete(i);
    }
    if (persist) { worldEdits[`${x},${y},${z}`] = id; }
    markChunk(x, z);
    wakeNeighbors(x, y, z);
  }

  // ---- 相互作用: 水 × 溶岩 ---------------------------------------------------
  // ある液体セル(x,y,z)について 6 近傍を見て、水↔溶岩の接触を解決する。
  // 何か変換が起きたら true を返す(その場合このセルの流動処理はスキップ)。
  const NB6 = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  function resolveContact(x, y, z) {
    const id = getBlock(x, y, z);
    if (!isFluid(id)) return false;
    const myLevel = getLevel(x, y, z);

    for (const [dx, dy, dz] of NB6) {
      const nid = getBlock(x + dx, y + dy, z + dz);
      if (!isFluid(nid)) continue;
      if (id === nid) continue; // 同種は無反応

      // ここに来た時点で「水」と「溶岩」が隣り合っている。
      if (isLava(id)) {
        // 自分が溶岩。隣は水。
        const nLevel = getLevel(x + dx, y + dy, z + dz);
        if (myLevel >= LEVEL_SOURCE && nLevel >= LEVEL_SOURCE) {
          // 溶岩源 × 水源 → 黒曜石
          placeBlock(x, y, z, B.OBSIDIAN, 0, true);
        } else if (myLevel >= LEVEL_SOURCE) {
          // 溶岩源 × 流れる水 → 黒曜石 (溶岩源は黒曜石化)
          placeBlock(x, y, z, B.OBSIDIAN, 0, true);
        } else {
          // 流れる溶岩 × 水(何でも) → 丸石
          placeBlock(x, y, z, B.COBBLE, 0, true);
        }
        return true;
      } else {
        // 自分が水。隣は溶岩。水側は基本そのまま(蒸発はさせない)。
        // ただし水が「流れ」で、隣が「流れる溶岩」の場合は、溶岩側が丸石化
        // するのを待つので、ここでは水は何もしない(溶岩セル側が処理する)。
        // 水源が溶岩源に触れている場合の黒曜石化は溶岩源セル側で処理される。
        // 何もしない。
      }
    }
    return false;
  }

  // ---- 1 セルの流動シミュレーション ------------------------------------------
  // 戻り値は使わない。world と levels を更新し、波及先を wake する。
  function simulateCell(x, y, z) {
    const id = getBlock(x, y, z);
    if (!isFluid(id)) return;

    // まず相互作用(水×溶岩)を解決。変換が起きたら流動はしない。
    if (resolveContact(x, y, z)) return;

    let level = getLevel(x, y, z);

    // --- 流れ(非源)の維持判定: 上流から供給され続けているか? ---
    if (level < LEVEL_SOURCE) {
      // 真上に同種液体があれば「落下流」: レベルは最大(MAX_FLOW)を維持。
      const upId = getBlock(x, y + 1, z);
      let supported = false;
      let bestSrc = 0;
      if (upId === id) {
        supported = true;
        bestSrc = MAX_FLOW; // 上から降ってくる水は強い流れ
      } else {
        // 水平な隣に「自分より高いレベルの同種液体」があれば供給される。
        for (const [dx, , dz] of [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]]) {
          const nid = getBlock(x + dx, y, z + dz);
          if (nid === id) {
            const nl = getLevel(x + dx, y, z + dz);
            if (nl > bestSrc) bestSrc = nl;
          }
        }
        supported = bestSrc >= 2; // 隣のレベル-1 が 1 以上なら維持できる
      }

      // 水源の自己再生(無限水): 水平 2 方向以上に水源があれば自分も源に。
      if (id === B.WATER) {
        let srcCount = 0;
        for (const [dx, , dz] of [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]]) {
          if (getBlock(x + dx, y, z + dz) === B.WATER && getLevel(x + dx, y, z + dz) >= LEVEL_SOURCE) srcCount++;
        }
        if (srcCount >= 2) {
          if (level !== LEVEL_SOURCE) { setLevel(x, y, z, LEVEL_SOURCE); markChunk(x, z); wakeNeighbors(x, y, z); }
          level = LEVEL_SOURCE;
        }
      }

      if (level < LEVEL_SOURCE) {
        if (!supported) {
          // 供給が絶たれた流れ → 消える(乾く)
          placeBlock(x, y, z, B.AIR, 0, false);
          // この座標の編集は保存しない(再生成で復元されるべき自然液体のため)
          delete worldEdits[`${x},${y},${z}`];
          return;
        }
        const want = upId === id ? MAX_FLOW : (bestSrc - 1);
        if (want !== level) {
          if (want <= 0) { placeBlock(x, y, z, B.AIR, 0, false); delete worldEdits[`${x},${y},${z}`]; return; }
          setLevel(x, y, z, want);
          markChunk(x, z);
          level = want;
          wakeNeighbors(x, y, z);
        }
      }
    }

    // --- 1) 真下へ落下 ---------------------------------------------------------
    const belowId = getBlock(x, y - 1, z);
    if (isReplaceable(belowId)) {
      // 落下流を作る。縦方向は減衰しないので満タン(源相当の落下)。
      placeBlock(x, y - 1, z, id, MAX_FLOW, false);
      // 下に流れたので、源でない限り自分はもう一度評価されるよう起こす
      wakeNeighbors(x, y, z);
      return;
    }
    if (isFluid(belowId)) {
      // 下が同種液体で源未満なら、満たして落下を継続させる
      if (belowId === id) {
        const bl = getLevel(x, y - 1, z);
        if (bl < MAX_FLOW) { setLevel(x, y - 1, z, MAX_FLOW); markChunk(x, z); wakeNeighbors(x, y - 1, z); }
        return; // 下に流れ続けるので水平拡散はしない
      }
      // 下が別種液体 → 接触処理は resolveContact 側に任せて起こすだけ
      wakeNeighbors(x, y - 1, z);
    }

    // --- 2) 水平に広がる -------------------------------------------------------
    // 自分のレベルが 1 以下なら、それ以上は広がれない(隣は level-1=0)。
    if (level <= 1) return;
    const spreadLevel = level - 1;
    for (const [dx, , dz] of [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]]) {
      const nx = x + dx, nz = z + dz;
      const nid = getBlock(nx, y, nz);
      if (isReplaceable(nid)) {
        if (!inSimRange(nx, y, nz)) continue;
        placeBlock(nx, y, nz, id, spreadLevel, false);
      } else if (nid === id) {
        // 同種で自分よりかなり低ければ底上げ(平準化)
        const nl = getLevel(nx, y, nz);
        if (nl < spreadLevel) {
          setLevel(nx, y, nz, spreadLevel);
          markChunk(nx, nz);
          wakeNeighbors(nx, y, nz);
        }
      } else if (isFluid(nid)) {
        // 別種液体が隣 → 接触解決を促す
        wake(nx, y, nz);
      }
    }
  }

  // ---- ティック処理 ----------------------------------------------------------
  let accum = 0;
  const WATER_TICK = 0.18;   // 秒。水の更新間隔
  const LAVA_TICK = 0.45;    // 溶岩は遅い
  let lavaPhase = 0;         // 溶岩は数ティックに 1 回だけ処理
  let initialized = false;

  // 1 ティック分のシミュレーションを実行。doLava=true のとき溶岩も処理。
  function tickOnce(doLava) {
    if (active.size === 0 && nextActive.size === 0) return;
    // 現ティックの処理対象を確定し、nextActive は新規収集用に空に。
    active = nextActive;
    nextActive = new Set();

    // セルを座標に展開。処理中に world を書き換えるが、波及先は nextActive
    // に積まれるので当ティックでは無限ループしない。
    const cells = Array.from(active);
    active.clear();

    // 処理順序の偏りを減らすため、ざっくり Y 降順(下から上)で処理すると
    // 落下が綺麗に伝播する。index = (y*D+z)*W+x なので index 昇順 ≒ y 昇順。
    // 落下を優先したいので y 昇順(下のセルを先に)で十分自然。
    cells.sort((a, b) => a - b);

    for (const i of cells) {
      // index から座標を復元
      const x = i % WORLD_W;
      const t = (i - x) / WORLD_W;
      const z = t % WORLD_D;
      const y = (t - z) / WORLD_D;
      const id = world[i];
      if (!isFluid(id)) continue;
      if (isLava(id) && !doLava) { nextActive.add(i); continue; } // 溶岩はこのティックでは処理しない→持ち越し
      if (!inSimRange(x, y, z)) { nextActive.add(i); continue; }  // 範囲外は保留(プレイヤーが近づいたら処理)
      simulateCell(x, y, z);
    }

    // たまったメッシュ更新をまとめて適用。
    flushDirtyChunks();
  }

  function flushDirtyChunks() {
    if (dirtyChunks.size === 0) return;
    for (const key of dirtyChunks) {
      const cx = key % CHUNKS_X;
      const cz = (key - cx) / CHUNKS_X;
      if (cx < 0 || cx >= CHUNKS_X || cz < 0 || cz >= CHUNKS_Z) continue;
      if (typeof chunkBuilt !== "undefined" && chunkBuilt[cz * CHUNKS_X + cx]) {
        buildChunk(cx, cz);
      }
    }
    dirtyChunks.clear();
  }

  // ---- 公開 API --------------------------------------------------------------

  // 起動時に一度だけ呼ぶ。生成直後の海/湖/溶岩湖は “平衡状態” なので、わざわざ
  // 全セルを起こす必要はない(数百万セルの走査はフリーズの元)。代わりに、
  // 既に水と溶岩が「隣接」している自然境界(溶岩湖の縁など)だけを軽く拾って
  // 黒曜石化させ、あとは setBlock/採掘/設置の notifyBlockChanged で随時起こす。
  // これによりプレイヤーが手を加えた所だけがリアルタイムに流れる。
  function seedActiveFromWorld() {
    if (initialized) return;
    initialized = true;
    // 何もしない(遅延起動)。境界の自然反応はプレイヤーが近づいて編集した
    // 時点で notifyBlockChanged 経由で発火する。
  }

  // 外部(setBlock / 採掘 / 設置)からブロックが変わったときに呼ぶ。
  // その座標とまわりの液体を起こして再評価させる。
  function notifyBlockChanged(x, y, z) {
    wakeNeighbors(x, y, z);
    // 上方向は液体が落ちてくる可能性があるので少し広めに起こす
    wake(x, y + 1, z);
    wake(x, y + 2, z);
  }

  // プレイヤーが液体(バケツ無しなので主に source 設置)を置いたとき用。
  // ここでは将来の拡張用に source を置く API を用意。
  function placeSource(x, y, z, id) {
    placeBlock(x, y, z, id, LEVEL_SOURCE, true);
    flushDirtyChunks();
  }

  // メインループから毎フレーム呼ぶ。dt 秒経過で内部ティックを進める。
  function update(dt) {
    if (typeof worldReady === "undefined" || !worldReady) return;
    if (!initialized) seedActiveFromWorld();
    accum += dt;
    while (accum >= WATER_TICK) {
      accum -= WATER_TICK;
      lavaPhase++;
      const doLava = (lavaPhase % Math.round(LAVA_TICK / WATER_TICK)) === 0;
      tickOnce(doLava);
    }
  }

  // 液体セルのレベルを描画側へ渡すためのアクセサ(render.js が使用)。
  // 流体の上面の高さを 0..1 で返す(源は 1.0、薄い流れは低い)。
  function surfaceHeight(x, y, z) {
    const id = getBlock(x, y, z);
    if (!isFluid(id)) return 0;
    // 真上に同種液体があれば満タン(柱の途中)として 1.0。
    if (getBlock(x, y + 1, z) === id) return 1.0;
    const lv = getLevel(x, y, z);
    // 源(レベル8)は満タン=深さ最大として水面を 1.0 で描画する。
    if (lv >= LEVEL_SOURCE) return 1.0;
    return Math.max(0.1, (lv / LEVEL_SOURCE) * 1.0);
  }

  return {
    update, notifyBlockChanged, placeSource, surfaceHeight,
    getLevel, LEVEL_SOURCE,
    _stats: () => ({ levels: levels.size, active: active.size + nextActive.size }),
  };
})();
