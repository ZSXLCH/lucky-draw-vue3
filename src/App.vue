<template>
  <div id="root">
    <header>
      <Publicity v-show="!running" />
      <el-button
        class="audio"
        type="text"
        @click="playAudio(!audioPlaying)"
      >
        <i
          class="iconfont"
          :class="[audioPlaying ? 'iconstop' : 'iconplay1']"
        ></i>
      </el-button>
      <el-button class="res" type="text" @click="showResult = true">
        抽奖结果
      </el-button>
      <el-button class="con" type="text" @click="showConfig = true">
        抽奖配置
      </el-button>
    </header>
    <div id="main" :class="{ mask: showRes || showDrawCard || showLoadingAnimation }"></div>
    <div id="tags">
      <ul v-for="item in datas" :key="item.key">
        <li>
          <a
            href="javascript:void(0);"
            :style="{
              color: item.winner ? '#ffd700' : '#fff',
            }"
          >
            {{ item.name ? item.name : item.key }}
            <img v-if="item.photo" :src="item.photo" :width="50" :height="50" />
          </a>
        </li>
      </ul>
    </div>
    
    <!-- 抽奖结果计算中的过渡动画 -->
    <transition name="fade">
      <div v-if="showLoadingAnimation" class="loading-animation-container">
        <div class="loading-spinner"></div>
        <div class="loading-text">
          <h2>{{ loadingText }}</h2>
          <p>{{ loadingSubText }}</p>
        </div>
      </div>
    </transition>
    <!-- 堆叠卡片抽奖结果 -->
    <transition name="fade">
      <div v-show="showDrawCard" id="stackedCardContainer">
        <div class="card-stack">
          <!-- 只渲染顶部卡片，确保状态控制精确 -->
          <div 
            v-if="remainingCards.length > 0"
            class="stacked-card active"
            :class="{
              'flipped': isTopCardFlipped,
              'flying-out': isTopCardFlyingOut,
              'visible': isTopCardVisible
            }"
            :style="{
              zIndex: 1000,
              transform: '',
              boxShadow: '0 8px 32px rgba(255, 215, 0, 0.3)'
            }"
            @click="handleTopCardClick()"
          >
            <div class="card-inner">
              <!-- 正面：点击揭晓 -->
              <div class="card-front">
                <div class="card-content">
                  <h2>点击揭晓</h2>
                  <p>{{ resArr.length - remainingCards.length + 1 }} / {{ resArr.length }}</p>
                </div>
              </div>
              <!-- 背面：中奖信息 -->
              <div class="card-back">
                <div class="card-content">
                  <p class="winner-name">{{ getWinnerInfo(remainingCards[0])?.type || '-' }}: {{ getWinnerInfo(remainingCards[0])?.name || '' }}</p>
                  <img v-if="getWinnerInfo(remainingCards[0])?.photo" :src="getWinnerInfo(remainingCards[0]).photo" class="winner-photo" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>
    
    <transition name="bounce">
      <div id="resbox" v-show="showRes">
        <div class="resbox-header">
          <p>{{ categoryName }}抽奖结果：</p>
          <button class="close-button" @click="showRes = false">×</button>
        </div>
        <div v-if="currentPageData.length > 0">
          <div class="grid-container">
            <div 
              v-for="(res, i) in currentPageData" 
              :key="i" 
              class="grid-item"
            >
              <span class="result-text">
                {{ (list.find((d) => d.key === res) || {}).type || '-' }}：{{ (list.find((d) => d.key === res) || {}).name || res }}
              </span>
            </div>
          </div>
          <div v-if="totalPages > 1" class="pagination-container">
              <el-pagination
                v-model:current-page="currentPage"
                :page-size="pageSize"
                layout="prev, pager, next"
                :total="resArr.length"
                @current-change="handlePageChange"
              />
          </div>
        </div>
      </div>
    </transition>

    <LotteryConfig v-model:visible="showConfig" @resetconfig="reloadTagCanvas" />
    <Tool
      @toggle="toggle"
      @resetConfig="reloadTagCanvas"
      @getPhoto="getPhoto"
      :running="running"
      :closeRes="closeRes"
    />
    <Result v-model:visible="showResult"></Result>
    
    <audio
      id="audiobg"
      preload="auto"
      controls
      autoplay
      loop
      @play="playHandler"
      @pause="pauseHandler"
    >
      <source :src="audioSrc" />
      你的浏览器不支持audio标签
    </audio>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue';
import { useLuckyStore } from '@/stores';
import LotteryConfig from '@/components/LotteryConfig.vue';
import Publicity from '@/components/Publicity.vue';
import Tool from '@/components/Tool.vue';
import bgaudio from '@/assets/bg.mp3';
import beginaudio from '@/assets/begin.mp3';
import {
  getData,
  configField,
  resultField,
  newLotteryField,
  conversionCategoryName,
  listField,
} from '@/helper/index';
import { luckydrawHandler } from '@/helper/algorithm';
import Result from '@/components/Result.vue';
import { database, DB_STORE_NAME } from '@/helper/db';

// 状态管理
const store = useLuckyStore();

// 响应式数据
const running = ref(false);
const showRes = ref(false);
const showConfig = ref(false);
const showResult = ref(false);
const resArr = ref([]);
const category = ref('');
const audioPlaying = ref(false);
const audioSrc = ref(bgaudio);
const showLoadingAnimation = ref(false);
const loadingText = ref('正在抽取幸运者');
const loadingSubText = ref('请稍候...');
const loadingTexts = [
  { main: '正在抽取幸运者', sub: '请稍候...' },
  { main: '正在打乱名单', sub: '谁会是幸运儿？' },
  { main: '正在计算概率', sub: '好运即将降临...' },
  { main: '即将揭晓结果', sub: '准备好了吗？' },
  { main: '抽奖结果出炉', sub: '恭喜以下幸运儿！' }
];

// 堆叠卡片相关状态
const showDrawCard = ref(false);
const remainingCards = ref([]); // 剩余的卡片数组
const isTopCardFlipped = ref(false);
const isTopCardFlyingOut = ref(false);
const cardStackAnimation = ref(false); // 卡片堆叠动画状态
const animatedCards = ref([]); // 用于动画的卡片数组
const isTopCardVisible = ref(false); // 顶部卡片是否可见

// 分页相关数据
const pageSize = 12; // 固定每页最多显示12个
const currentPage = ref(1);

// 计算属性
const totalPages = computed(() => Math.ceil(resArr.value.length / pageSize));
const currentPageData = computed(() => {
  const startIndex = (currentPage.value - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  return resArr.value.slice(startIndex, endIndex);
});

// 获取中奖者信息
const getWinnerInfo = (winnerKey) => {
  const winnerInfo = list.value.find((d) => d.key === winnerKey) || {};
  const photoInfo = photos.value.find((d) => d.id === winnerKey);
  return {
    ...winnerInfo,
    photo: photoInfo ? photoInfo.value : ''
  };
};

// 处理页码变化
const handlePageChange = (page) => {
  currentPage.value = page;
};

// 计算属性
const resCardStyle = computed(() => {
  const style = { fontSize: '30px' };
  const { number } = store.config;
  if (number < 100) {
    style.fontSize = '100px';
  } else if (number < 1000) {
    style.fontSize = '80px';
  } else if (number < 10000) {
    style.fontSize = '60px';
  }
  return style;
});

const config = computed(() => store.config);
const result = computed({
  get: () => store.result,
  set: (val) => store.setResult(val)
});
const list = computed(() => store.list);
const photos = computed(() => store.photos);

const allresult = computed(() => {
  let results = [];
  for (const key in result.value) {
    if (Object.prototype.hasOwnProperty.call(result.value, key)) {
      const element = result.value[key];
      results = results.concat(element);
    }
  }
  return results;
});

const datas = computed(() => {
  const { number } = config.value;
  const nums = number >= 1500 ? 500 : number;
  const configNum = number > 1500 ? Math.floor(number / 3) : number;
  const randomShowNums = luckydrawHandler(configNum, [], nums);
  const randomShowDatas = randomShowNums.map((item) => {
    const listData = list.value.find((d) => d.key === item);
    const photo = photos.value.find((d) => d.id === item);
    return {
      key: item * (number > 1500 ? 3 : 1),
      name: listData ? listData.name : '',
      photo: photo ? photo.value : '',
      winner: allresult.value.includes(item),
    };
  });
  return randomShowDatas;
});

const categoryName = computed(() => conversionCategoryName(category.value));

// 生命周期钩子
onMounted(() => {
  startTagCanvas();
  setTimeout(() => {
    getPhoto();
  }, 1000);
  window.addEventListener('resize', reportWindowSize);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', reportWindowSize);
});

// 监听窗口大小变化，动态调整字体大小
window.addEventListener('resize', () => {
  if (window.TagCanvas.IsLoaded('rootcanvas')) {
    const textHeight = calculateTextHeight();
    window.TagCanvas.SetOptions('rootcanvas', { textHeight: textHeight });
    window.TagCanvas.Reload('rootcanvas');
  }
});

// 初始化数据
const initData = () => {
  const data = getData(configField);
  if (data) {
    store.setConfig(Object.assign({}, data));
  }
  
  const resultData = getData(resultField);
  if (resultData) {
    store.setResult(resultData);
  }

  const newLottery = getData(newLotteryField);
  if (newLottery) {
    const configData = config.value;
    newLottery.forEach((item) => {
      store.setNewLottery(item);
      if (!configData[item.key]) {
        configData[item.key] = 0;
      }
    });
    store.setConfig(configData);
  }

  const listData = getData(listField);
  if (listData) {
    store.setList(listData);
  }
};
initData();

// 监听照片变化
watch(photos, () => {
  nextTick(() => {
    reloadTagCanvas();
  });
}, { deep: true });

// 新增：监听中奖结果变化，重新加载球体颜色
watch(result, () => {
  nextTick(() => {
    reloadTagCanvas();
  });
}, { deep: true });

// 方法
const reportWindowSize = () => {
  const AppCanvas = document.querySelector('#rootcanvas');
  if (AppCanvas && AppCanvas.parentElement) {
    AppCanvas.parentElement.removeChild(AppCanvas);
  }
  startTagCanvas();
};

const playHandler = () => {
  audioPlaying.value = true;
};

const pauseHandler = () => {
  audioPlaying.value = false;
};

const playAudio = (type) => {
  const audioBg = document.querySelector('#audiobg');
  if (type) {
    audioBg.play();
  } else {
    audioBg.pause();
  }
};

const loadAudio = () => {
  const audioBg = document.querySelector('#audiobg');
  audioBg.load();
  nextTick(() => {
    audioBg.play();
  });
};

const getPhoto = () => {
  database.getAll(DB_STORE_NAME).then((res) => {
    if (res && res.length > 0) {
      store.setPhotos(res);
    }
  });
};

const speed = () => {
  return [0.1 * Math.random() + 0.01, -(0.1 * Math.random() + 0.01)];
};

const createCanvas = () => {
  const canvas = document.createElement('canvas');
  canvas.width = document.body.offsetWidth;
  canvas.height = document.body.offsetHeight - 50; // header的高度
  canvas.id = 'rootcanvas';
  document.querySelector('#main').appendChild(canvas);
};

const calculateTextHeight = () => {
  // 获取总人数
  const totalPeople = config.value?.number || 1;
  // 获取窗口大小
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  const screenSize = Math.min(windowWidth, windowHeight);
  
  // 基础字体大小
  let baseSize = 20;
  
  // 根据总人数调整字体大小：人数越多，字体越小
  // 修改逻辑，使2000人时字体大小与400人时相同
  if (totalPeople > 400) {
    baseSize = 14; // 400人以上都使用相同大小
  } else if (totalPeople > 200) {
    baseSize = 14;
  } else if (totalPeople > 100) {
    baseSize = 16;
  } else if (totalPeople > 50) {
    baseSize = 18;
  }
  
  // 根据屏幕大小调整字体大小：屏幕越大，字体可以适当增大
  const screenFactor = screenSize / 1920; // 基于1920px宽度的屏幕作为基准
  const finalSize = Math.max(8, Math.min(30, baseSize * (1 + (screenFactor - 0.5) * 0.5)));
  
  return finalSize;
};

const startTagCanvas = () => {
  createCanvas();
  const textHeight = calculateTextHeight();
  window.TagCanvas.Start('rootcanvas', 'tags', {
    textColour: '#FFD700', // 金色
    initial: speed(),
    dragControl: 1,
    textHeight: textHeight,
    noSelect: true,
    lock: 'xy',
    padding: 5, // 添加内边距，防止文字被裁剪
    outlineMethod: 'colour', // 使用颜色描边
    outlineColour: '#FFD700', // 描边颜色与文字颜色相同
    outlineThickness: 2, // 描边厚度
  });
};

const reloadTagCanvas = () => {
  window.TagCanvas.Reload('rootcanvas');
};

const closeRes = () => {
  showRes.value = false;
};

// 处理顶部卡片点击
const handleTopCardClick = () => {
  if (!isTopCardFlipped.value) {
    // 第一次点击：翻转卡片显示中奖者信息
    isTopCardFlipped.value = true;
  } else {
    // 第二次点击：卡片向左飞出
    isTopCardFlyingOut.value = true;
    
    // 动画完成后移除顶部卡片
    setTimeout(() => {
      // 先移除卡片
      remainingCards.value.shift();
      // 重置状态
      isTopCardFlipped.value = false;
      isTopCardFlyingOut.value = false;
      
      // 检查是否还有剩余卡片
      if (remainingCards.value.length === 0) {
        // 所有卡片都处理完了，显示完整中奖名单
        setTimeout(() => {
          showDrawCard.value = false;
          showRes.value = true;
        }, 300);
      } else {
        // 准备下一张卡片的入场动画：先隐藏，再触发右入
        isTopCardVisible.value = false;
        nextTick(() => {
          // 小延迟，确保DOM已更新到新顶部卡片
          setTimeout(() => {
            isTopCardVisible.value = true;
          }, 20);
        });
      }
      // 确保下一张卡片不会自动翻转
      // 通过Vue的响应式系统，下一张卡片会自然成为新的顶部卡片且默认不翻转
    }, 600); // 与CSS动画时间同步
  }
};

// 重置卡片状态
const resetCardState = () => {
  showDrawCard.value = false;
  remainingCards.value = [];
  animatedCards.value = [];
  isTopCardFlipped.value = false;
  isTopCardFlyingOut.value = false;
  cardStackAnimation.value = false;
};

// 开始卡片入场动画（单卡顺序右入）
const startCardStackAnimation = () => {
  // 只控制顶部卡片的可见性，从右侧飞入
  isTopCardVisible.value = false;
  nextTick(() => {
    isTopCardVisible.value = true;
  });
};

const toggle = (form) => {
  if (running.value) {
    // 停止抽奖：不再计算结果，直接展示堆叠卡片（移除过渡动画）
    audioSrc.value = bgaudio;
    loadAudio();
    window.TagCanvas.SetSpeed('rootcanvas', speed());

    currentPage.value = 1;
    resetCardState();
    remainingCards.value = [...resArr.value];
    running.value = false;

    // 直接显示堆叠卡片，无任何过渡动画或等待
    showLoadingAnimation.value = false;
    showDrawCard.value = true;
    nextTick(() => {
      reloadTagCanvas();
      startCardStackAnimation();
    });
    return;
  } else {
    // 开始抽奖：仅计算结果，不展示堆叠卡片
    showRes.value = false;
    if (!form) {
      return;
    }

    audioSrc.value = beginaudio;
    loadAudio();
    window.TagCanvas.SetSpeed('rootcanvas', [5, 1]);

    // 计算抽奖结果
    const { number } = config.value;
    const { category: cat, mode, qty, remain, allin } = form;
    let num = 1;
    if (mode === 1 || mode === 5) {
      num = mode;
    } else if (mode === 0) {
      num = remain;
    } else if (mode === 99) {
      num = qty;
    }
    const resultArray = luckydrawHandler(
      number,
      allin ? [] : allresult.value,
      num,
      allin,
      form.groupDraw,
      list.value
    );
    resArr.value = resultArray;

    category.value = cat;
    if (!result.value[cat]) {
      result.value[cat] = [];
    }
    const oldRes = result.value[cat] || [];
    const data = Object.assign({}, result.value, {
      [cat]: oldRes.concat(resultArray),
    });
    result.value = data;

    // 不展示堆叠卡片，等待停止时再展示
    currentPage.value = 1;
    showLoadingAnimation.value = false;
    showDrawCard.value = false;
    resetCardState();
    running.value = true;
    nextTick(() => {
      reloadTagCanvas();
    });
  }
};
</script>

<style lang="scss">
#root {
  height: 100%;
  position: relative;
  background-image: url('./assets/bg.png');
  background-size: 100% 100%;
  background-position: center center;
  background-repeat: no-repeat;
  background-color: #121936;
  .mask {
    -webkit-filter: blur(5px);
    filter: blur(5px);
  }
  header {
    height: 50px;
    line-height: 50px;
    position: relative;
    .el-button {
      position: absolute;
      top: 10px;
      padding: 0;
      z-index: 9999;
      &.con {
        right: 20px;
        color: #ffd700;
      }
      &.res {
        right: 100px;
        color: #ffd700;
      }
      &.audio {
        left: 20px;
        width: 40px;
        height: 40px;
        line-height: 40px;
        border: 1px solid #ffd700;
        border-radius: 50%;
        padding: 0;
        text-align: center;
        .iconfont {
          position: relative;
          left: 1px;
          color: #ffd700;
        }
      }
    }
  }
  .copy-right {
    position: absolute;
    right: 10px;
    bottom: 10px;
    color: #ccc;
    z-index: 1000;
    font-size: 12px;
  }
  #audiobg{
    position: absolute;
    left: 10px;
    bottom: -100px;
  }
  .bounce-enter-active {
    animation: bounce-in 1.5s;
  }
  .bounce-leave-active {
    animation: bounce-in 0s reverse;
  }
}
#main {
  height: 100%;
}

#resbox {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 90vw; /* 视口宽度，提升自适应比例 */
  max-width: 1800px; /* 放大上限，让两列更宽 */
  height: auto; /* 自适应内容高度 */
  max-height: 90vh; /* 最大高度，防止超出视口 */
  transform: translateX(-50%) translateY(-50%);
  text-align: center;
  z-index: 10000; /* 确保结果弹窗显示在最上层，高于右侧按钮的z-index: 9999 */
  .resbox-header {
      position: relative;
      text-align: center;
      margin-bottom: 24px;
      width: 100%;
      .close-button {
        position: absolute;
        top: 0;
        right: 0; /* 从左上改为右上 */
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background-color: #f00;
        color: #fff;
        border: none;
        font-size: 26px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10;
        &:hover {
          background-color: #d00;
        }
      }
      p {
          color: #ffd700; /* 金色文字，提升与红色背景的对比度 */
          font-size: 36px; /* 原 42px，稍微减小标题字号 */
          font-weight: 700;
          line-height: 44px;
          margin: 0;
          text-shadow: 0 0 2px rgba(255, 215, 0, 0.3), 0 0 4px rgba(255, 215, 0, 0.2);
        }
    }
  .container {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
  }
  .itemres {
    background: #fff;
    width: 160px;
    height: 160px;
    border-radius: 4px;
    border: 1px solid #ccc;
    line-height: 160px;
    font-weight: bold;
    margin-right: 20px;
    margin-bottom: 20px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    .cont {
      display: flex;
      justify-content: center;
      align-items: center;
    }
    &.numberOver::before {
      content: attr(data-id);
      width: 30px;
      height: 22px;
      line-height: 22px;
      background-color: #fff;
      position: absolute;
      bottom: 0;
      left: 0;
      font-size: 14px;
      z-index: 1;
    }
  }
}
</style>

<style lang="scss">
#resbox {
  max-height: 90vh; /* 限制最大高度，防止滚动 */
  overflow: hidden; /* 禁止滚动条 */
  padding: 20px; /* 更大的留白 */
  background-color: #ff0000; /* 纯红色背景，不透明 */
  border-radius: 8px;
  
  .grid-container {
    display: grid;
    grid-template-columns: repeat(2, 1fr); // 两列布局
    grid-template-rows: repeat(6, 1fr); // 六行，合计 12 项
    height: calc(90vh - 160px); // 预留标题与分页空间，防止溢出
    gap: 10px; // 略微缩小间距
    justify-items: stretch;
    align-items: stretch;
    align-content: stretch;
    margin-bottom: 16px;

    .grid-item {
      width: 100%;
      display: flex;
      align-items: stretch;
      justify-content: stretch;

      .result-text {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        padding: 12px 16px; // 缩小内边距以适配 6 行
        // 动态字号：基于视口高度按 6 行计算，尽量大但不裁切
        font-size: clamp(24px, calc((90vh - 160px) / 6 * 0.42), 56px);
        line-height: 1.15;
        font-weight: bold;
        color: #ffd700;
        background-color: transparent;
        border: 1px solid #ddd;
        border-radius: 8px;
        width: 98%;
        box-sizing: border-box;
        cursor: default;
        white-space: normal; // 允许自动换行，避免裁剪
        word-break: break-word; // 对英文或长字符进行换行

        &:hover {
          background-color: rgba(255, 255, 255, 0.08);
        }
      }
    }
  }

  .pagination-container {
    display: flex;
    justify-content: center;
    margin-top: 8px; // 缩小上边距
  }
}

/* 堆叠卡片效果样式 */
#stackedCardContainer {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 10001;
  background-color: rgba(0, 0, 0, 0.8);
}

/* 加载动画容器 */
.loading-animation-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  background-color: rgba(0, 0, 0, 0.8);
  color: #fff;
}

/* 旋转加载动画 */
.loading-spinner {
  width: 80px;
  height: 80px;
  margin-bottom: 30px;
  border: 8px solid rgba(255, 215, 0, 0.3);
  border-radius: 50%;
  border-top-color: #ffd700;
  animation: spin 1s ease-in-out infinite;
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
}

/* 加载文字样式 */
.loading-text {
  text-align: center;
  animation: pulse 0.8s ease-in-out infinite;
}

.loading-text h2 {
  font-size: 60px; /* 文字更大，提升悬念感 */
  margin-bottom: 12px;
  color: #ffd700;
  text-shadow: 0 0 12px rgba(255, 215, 0, 0.8), 0 0 24px rgba(255, 215, 0, 0.6);
}

.loading-text p {
  font-size: 24px; /* 副标题也稍微增大 */
  opacity: 0.9;
}

/* 动画关键帧 */
@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

.card-stack {
  position: relative;
  width: 95%; /* 增大卡片容器宽度 */
  height: 80vh; /* 增大卡片容器高度 */
  max-width: 1300px; /* 更大的最大宽度 */
  max-height: 900px; /* 更大的最大高度 */
  display: flex;
  justify-content: center;
  align-items: center;
}

.stacked-card {
  position: absolute;
  width: 100%;
  height: 100%;
  perspective: 1000px;
  cursor: default;
  transition: transform 0.5s ease-out, opacity 0.5s ease-out;
  /* 初始状态：在屏幕右侧外 */
  transform: translateX(150%);
  opacity: 0;
}

/* 堆叠动画效果 */
.stacked-card.visible {
  transform: translateX(0);
  opacity: 1;
}

.stacked-card.active {
  cursor: pointer;
}

.stacked-card:not(.active) {
  cursor: default;
  pointer-events: none;
}

.card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  /* 只在添加flipped类时才有过渡效果 */
}

/* 只有在明确添加flipped类时才翻转 */
.stacked-card.flipped .card-inner {
  transform: rotateY(180deg);
  transition: transform 0.6s;
}

/* 默认状态不翻转 */
.card-inner {
  transform: rotateY(0deg);
}

/* 飞出动画时保持翻转状态 */
.stacked-card.flying-out .card-inner {
  transform: rotateY(180deg);
  transition: transform 0.6s;
}

.card-front,
.card-back {
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  border-radius: 12px;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 8px 32px rgba(255, 215, 0, 0.3);
}

/* 卡片正面（初始可见面）：点击揭晓 */
.card-front {
  background: linear-gradient(135deg, #ff6b6b, #ee5a24);
  border: 4px solid #ffd700;
  z-index: 2;
}

/* 卡片背面（翻转后可见面）：中奖信息 */
.card-back {
  background: linear-gradient(135deg, #16a085, #27ae60);
  border: 4px solid #ffd700;
  transform: rotateY(180deg);
  z-index: 1;
}

/* 卡片飞出动画 */
.stacked-card.flying-out {
  animation: flyOutLeft 0.6s forwards;
}

@keyframes flyOutLeft {
  0% {
    transform: translateX(0);
    opacity: 1;
    z-index: 1000;
  }
  100% {
    transform: translateX(-150%);
    opacity: 0;
    z-index: 0;
  }
}

.card-content {
  text-align: center;
  color: #ffd700;
  padding: 40px;
  text-shadow: 0 0 2px rgba(255, 215, 0, 0.3), 0 0 4px rgba(255, 215, 0, 0.2);
}

.card-front .card-content h2 {
  font-size: 96px; /* 增大“点击揭晓”标题 */
  margin-bottom: 20px;
  color: #ffd700;
  text-shadow: 0 0 3px rgba(255, 215, 0, 0.35), 0 0 6px rgba(255, 215, 0, 0.2);
}

.card-front .card-content p {
  font-size: 54px; /* 增大进度“1/10”等文字 */
  opacity: 0.9;
  color: #ffd700;
  text-shadow: 0 0 2px rgba(255, 215, 0, 0.3);
}

.winner-name {
  font-size: min(30vh, 140px); /* 从 min(28vh, 130px) 略微增大 */
  font-weight: bold;
  margin-bottom: 20px;
  color: #ffd700;
  text-shadow: 0 0 3px rgba(255, 215, 0, 0.35), 0 0 6px rgba(255, 215, 0, 0.2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
  line-height: 1.1;
}

.winner-photo {
  width: 200px;
  height: 200px;
  border-radius: 50%;
  border: 4px solid #ffd700;
  object-fit: cover;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}



/* 淡入淡出过渡效果 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
