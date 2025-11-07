/**
 * chrome v8 实现
 */
/*
// ECMA 262 - 15.8.2.14
	var rngstate;  // Initialized to a Uint32Array during genesis.
	function MathRandom() {
		var r0 = (MathImul(18030, rngstate[0] & 0xFFFF) + (rngstate[0] >>> 16)) | 0;
		rngstate[0] = r0;
		var r1 = (MathImul(36969, rngstate[1] & 0xFFFF) + (rngstate[1] >>> 16)) | 0;
		rngstate[1] = r1;
		var x = ((r0 << 16) + (r1 & 0xFFFF)) | 0;
		// Division by 0x100000000 through multiplication by reciprocal.
		return (x < 0 ? (x + 0x100000000) : x) * 2.3283064365386962890625e-10;
	} 
*/

export function generateArray(start, end) {
  return Array.from(new Array(end + 1).keys()).slice(start);
}

/**
 * 取范围内随机整数
 * @param {number} minNum
 * @param {number} maxNum
 */
export function randomNum(minNum = 1, maxNum) {
  return parseInt(Math.random() * (maxNum - minNum + 1) + minNum, 10);
}
/**
 * 单次抽奖
 * @param {number} total 总人数
 * @param {array} won 已中奖
 * @param {number} num 本次抽取人数
 * @param {boolean} allin 是否全员参与
 * @param {boolean} groupDraw 是否分组抽奖
 * @param {array} list 人员列表（包含分组信息）
 */
export function luckydrawHandler(total, won = [], num, allin = false, groupDraw = false, list = []) {
  const peolist = generateArray(1, Number(total));
  const wons = Array.isArray(won) ? [...won] : [];
  const res = [];
  
  // 如果不开启分组抽奖，使用原来的逻辑
  if (!groupDraw || !list || list.length === 0) {
    for (let j = 0; j < num; j++) {
      const nodraws = allin ? peolist : peolist.filter(item => !wons.includes(item));
      if (nodraws.length === 0) break;
      const current = nodraws[randomNum(1, nodraws.length) - 1];
      res.push(current);
      wons.push(current);
    }
  } else {
    // 分组抽奖逻辑（增强：尽量保证同组内类型不重复）
    // 1. 按分组统计有效候选人（过滤已中奖且非全员参与）
    const groups = {};
    list.forEach(item => {
      const groupName = item.group || 'default';
      const keyNum = typeof item.key === 'number' ? item.key : Number(item.key);
      if (!peolist.includes(keyNum)) return;
      if (!allin && wons.includes(keyNum)) return;
      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push({ key: keyNum, type: item.type ?? null });
    });
    
    const groupKeys = Object.keys(groups);
    if (groupKeys.length === 0) {
      // 无有效分组候选，退回到非分组逻辑
      for (let j = 0; j < num; j++) {
        const nodraws = allin ? peolist : peolist.filter(item => !wons.includes(item));
        if (nodraws.length === 0) break;
        const current = nodraws[randomNum(1, nodraws.length) - 1];
        res.push(current);
        wons.push(current);
      }
      return res;
    }

    // 2. 计算每组基础抽取人数，并分配余数（尽量均匀）
    const basePerGroup = Math.floor(num / groupKeys.length);
    let remainder = num % groupKeys.length;

    // 3. 每组选择：优先选择类型不重复的候选
    const selectedTypesByGroup = {}; // { group: Set(types) }
    groupKeys.forEach((groupName, idx) => {
      const candidates = groups[groupName];
      if (!candidates || candidates.length === 0) return;
      const takeCount = Math.min(basePerGroup + (remainder > 0 ? 1 : 0), candidates.length);
      if (remainder > 0) remainder--;

      // 打乱候选，保证随机性
      const shuffled = [...candidates].sort(() => Math.random() - 0.5);
      const picked = [];
      const usedTypes = new Set();

      // 第一轮：按类型去重选取
      for (const c of shuffled) {
        const t = c.type ?? '__NULL_TYPE__';
        if (!usedTypes.has(t)) {
          picked.push(c);
          usedTypes.add(t);
          if (picked.length >= takeCount) break;
        }
      }
      // 第二轮：如果不足，再补全（允许类型重复）
      if (picked.length < takeCount) {
        for (const c of shuffled) {
          if (picked.find(p => p.key === c.key)) continue;
          picked.push(c);
          if (picked.length >= takeCount) break;
        }
      }

      if (!selectedTypesByGroup[groupName]) selectedTypesByGroup[groupName] = new Set();
      picked.forEach(p => {
        res.push(p.key);
        wons.push(p.key);
        selectedTypesByGroup[groupName].add(p.type ?? '__NULL_TYPE__');
      });
    });

    // 4. 若还未达到目标数量，再全体补充：仍尽量避免同组类型重复
    if (res.length < num) {
      const allAvailableKeys = allin ? peolist : peolist.filter(item => !wons.includes(item));
      if (allAvailableKeys.length > 0) {
        // 将可用键映射为包含类型与分组的对象
        const availableCandidates = [];
        const byKey = new Map(list.map(it => [typeof it.key === 'number' ? it.key : Number(it.key), it]));
        for (const k of allAvailableKeys) {
          const info = byKey.get(k);
          if (!info) continue;
          availableCandidates.push({ key: k, group: info.group || 'default', type: info.type ?? null });
        }
        // 打乱
        const shuffledAvail = availableCandidates.sort(() => Math.random() - 0.5);

        // 优先挑选不会造成同组类型重复的
        for (const c of shuffledAvail) {
          if (res.length >= num) break;
          const g = c.group;
          const t = c.type ?? '__NULL_TYPE__';
          const used = selectedTypesByGroup[g] || new Set();
          if (!used.has(t)) {
            res.push(c.key);
            wons.push(c.key);
            used.add(t);
            selectedTypesByGroup[g] = used;
          }
        }
        // 如果仍不足，允许重复类型补齐
        if (res.length < num) {
          for (const c of shuffledAvail) {
            if (res.length >= num) break;
            if (wons.includes(c.key)) continue; // 可能已在前一步选中
            res.push(c.key);
            wons.push(c.key);
          }
        }
      }
    }
  }
  
  return res;
}
