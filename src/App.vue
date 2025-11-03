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
                  <p class="winner-name">{{ getWinnerInfo(remainingCards[0])?.type || '-' }}：{{ getWinnerInfo(remainingCards[0])?.name || '' }}</p>
                  <img v-if="getWinnerInfo(remainingCards[0])?.photo" :src="getWinnerInfo(remainingCards[0]).photo" class="winner-photo" />
                </div>
              </div>
            </div>
          </div>
          
          <!-- 渲染堆叠在下面的卡片（只显示视觉效果） -->
          <div 
            v-for="(cardKey, index) in remainingCards.slice(1)" 
            :key="index"
            class="stacked-card"
            :style="{
              zIndex: 999 - index,  // 恢复原来的z-index递减顺序
              boxShadow: `0 ${(index + 1) * 2}px ${(index + 1) * 4}px rgba(0, 0, 0, 0.3)`
            }"
          >
            <div class="card-inner">
              <!-- 只显示点击揭晓的正面 -->
              <div class="card-front">
                <div class="card-content">
                  <h2>点击揭晓</h2>
                  <p>{{ resArr.length - remainingCards.length + index + 2 }} / {{ resArr.length }}</p>
                </div>
              </div>
              <!-- 背面不需要渲染，因为下层卡片不会被翻转 -->
              <div class="card-back">
                <div class="card-content">
                  <!-- 空白内容 -->
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
const pageSize = 14; // 固定每页最多显示14个
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

// 开始卡片堆叠动画
const startCardStackAnimation = () => {
  // 重置顶部卡片可见性
  isTopCardVisible.value = false;
  
  // 使用nextTick确保DOM已更新
  nextTick(() => {
    // 从最后一张开始依次添加飞入动画
    remainingCards.value.forEach((cardKey, index) => {
      setTimeout(() => {
        // 使用更可靠的选择器
        const cardElements = document.querySelectorAll('.stacked-card');
        const cardIndex = remainingCards.value.length - index - 1; // 从最后一张开始
        
        // 特殊处理顶部卡片（第一张）
        if (cardIndex === 0) {
          isTopCardVisible.value = true;
        } else if (cardElements[cardIndex]) {
          // 为下层卡片添加可见类
          cardElements[cardIndex].classList.add('visible');
          
          // 动画完成后设置堆叠样式
          setTimeout(() => {
            cardElements[cardIndex].style.transform = `translateY(-${cardIndex * 10}px) rotate(${cardIndex * 2}deg)`;
          }, 500); // 等待飞入动画完成
        }
      }, index * 300); // 每张卡片间隔300ms
    });
  });
};

const toggle = (form) => {
  if (running.value) {
    // 停止抽奖时的逻辑
    audioSrc.value = bgaudio;
    loadAudio();
    
    // 显示加载动画
    showLoadingAnimation.value = true;
    
    // 随机选择一个加载文本
    const randomTextIndex = Math.floor(Math.random() * loadingTexts.length);
    loadingText.value = loadingTexts[randomTextIndex].main;
    loadingSubText.value = loadingTexts[randomTextIndex].sub;
    
    // 使用setTimeout模拟处理时间，并添加文字变化增加悬念
    let textChangeCount = 0;
    const textChangeInterval = setInterval(() => {
      textChangeCount++;
      const nextIndex = (randomTextIndex + textChangeCount) % loadingTexts.length;
      loadingText.value = loadingTexts[nextIndex].main;
      loadingSubText.value = loadingTexts[nextIndex].sub;
    }, 800);

    // 延迟执行抽奖结果计算，给用户一个视觉反馈
    setTimeout(() => {
      clearInterval(textChangeInterval);
      
      // 只有在停止时才生成抽奖结果
      if (form) {
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
      }

      window.TagCanvas.SetSpeed('rootcanvas', speed());
      // 重置页码
      currentPage.value = 1;
      
      // 最后一个文本显示
      loadingText.value = loadingTexts[loadingTexts.length - 1].main;
      loadingSubText.value = loadingTexts[loadingTexts.length - 1].sub;
      
      // 再延迟一会儿，让用户看到最后的文本
      setTimeout(() => {
        // 隐藏加载动画
        showLoadingAnimation.value = false;
        
        // 显示堆叠卡片效果
        resetCardState();
        // 初始化剩余卡片数组，复制resArr的值
        remainingCards.value = [...resArr.value];
        showDrawCard.value = true;
        running.value = !running.value;
        nextTick(() => {
          reloadTagCanvas();
          // 开始卡片堆叠动画
          startCardStackAnimation();
        });
      }, 1000);
    }, 2000); // 延迟2秒，给用户足够的视觉反馈时间
  } else {
    // 开始抽奖时只设置状态，不生成结果
    showRes.value = false;
    if (!form) {
      return;
    }

    audioSrc.value = beginaudio;
    loadAudio();
    window.TagCanvas.SetSpeed('rootcanvas', [5, 1]);
    running.value = !running.value;
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
      }
      &.res {
        right: 100px;
      }
      &.audio {
        left: 20px;
        width: 40px;
        height: 40px;
        line-height: 40px;
        border: 1px solid #fff;
        border-radius: 50%;
        padding: 0;
        text-align: center;
        .iconfont {
          position: relative;
          left: 1px;
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
  width: 980px;
  transform: translateX(-50%) translateY(-50%);
  text-align: center;
  z-index: 10000; /* 确保结果弹窗显示在最上层，高于右侧按钮的z-index: 9999 */
  .resbox-header {
      position: relative;
      text-align: center;
      margin-bottom: 20px;
      width: 100%;
      .close-button {
        position: absolute;
        top: 0;
        right: 0; /* 从左上改为右上 */
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background-color: #f00;
        color: #fff;
        border: none;
        font-size: 24px;
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
          color: red;
          font-size: 22px;
          line-height: 30px;
          margin: 0;
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
  max-height: none;
  overflow-y: visible;
  padding: 10px;
  background-color: rgba(0, 0, 0, 0.7);
  border-radius: 8px;
  
  .grid-container {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    justify-items: center;
    margin-bottom: 20px;
    
    .grid-item {
      width: 100%;
      text-align: center;
      
      .result-text {
          display: inline-block;
          padding: 15px 20px;
          font-size: 32px;
          font-weight: bold;
          color: #fff;
          background-color: transparent; /* 透明背景 */
          border: 1px solid #ddd;
          border-radius: 4px;
          width: 90%;
          box-sizing: border-box;
          cursor: pointer;
          
          &:hover {
            background-color: rgba(255, 255, 255, 0.1);
          }
        }
    }
  }
  
  .pagination-container {
    display: flex;
    justify-content: center;
    margin-top: 10px;
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
  animation: pulse 1.5s ease-in-out infinite;
}

.loading-text h2 {
  font-size: 28px;
  margin-bottom: 10px;
  color: #ffd700;
  text-shadow: 0 0 10px rgba(255, 215, 0, 0.7);
}

.loading-text p {
  font-size: 18px;
  opacity: 0.8;
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
  width: 80%;
  height: 60vh;
  max-width: 900px;
  max-height: 600px;
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
  color: black;
  padding: 40px;
}

.card-front .card-content h2 {
  font-size: 60px;
  margin-bottom: 20px;
  color: black;
  text-shadow: 1px 1px 2px rgba(255, 255, 255, 0.5);
}

.card-front .card-content p {
  font-size: 32px;
  opacity: 0.9;
  color: black;
}

.winner-name {
  /* 稍微增大字体大小，设置为卡片高度的1/2.4左右，同时限制最大值 */
  font-size: min(25vh, 100px);
  font-weight: bold;
  margin-bottom: 20px;
  color: black;
  text-shadow: 1px 1px 2px rgba(255, 255, 255, 0.5);
  /* 确保文字可以自动换行 */
  word-wrap: break-word;
  /* 限制显示2行 */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.2;
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
