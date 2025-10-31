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
    // 分组抽奖逻辑
    // 1. 按分组统计人员
    const groups = {};
    list.forEach(item => {
      const groupName = item.group || 'default';
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      // 添加人员ID到对应分组
      if (peolist.includes(item.key)) {
        // 检查是否已中奖且不是全员参与
        if (allin || !wons.includes(item.key)) {
          groups[groupName].push(item.key);
        }
      }
    });
    
    // 2. 计算每组抽取人数
    const groupKeys = Object.keys(groups);
    const avgPerGroup = Math.floor(num / groupKeys.length);
    const remainder = num % groupKeys.length;
    
    // 3. 从每个分组中抽取平均人数
    groupKeys.forEach(groupName => {
      const groupMembers = groups[groupName];
      if (groupMembers.length > 0) {
        // 打乱数组以确保随机性
        const shuffled = [...groupMembers].sort(() => Math.random() - 0.5);
        // 抽取平均人数（但不超过该组实际人数）
        const takeCount = Math.min(avgPerGroup, shuffled.length);
        const selected = shuffled.slice(0, takeCount);
        
        // 添加到结果并更新已中奖列表
        res.push(...selected);
        selected.forEach(id => {
          wons.push(id);
        });
      }
    });
    
    // 4. 如果分组抽取后还不够，从全体未中奖人员中抽取剩余人数
    if (res.length < num) {
      const allAvailable = allin ? peolist : peolist.filter(item => !wons.includes(item));
      while (res.length < num && allAvailable.length > 0) {
        const selected = allAvailable[randomNum(1, allAvailable.length) - 1];
        res.push(selected);
        const index = allAvailable.indexOf(selected);
        if (index > -1) {
          allAvailable.splice(index, 1);
        }
        wons.push(selected);
      }
    }
  }
  
  return res;
}
