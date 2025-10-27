<template>
  <el-dialog
    :modelValue="visible"
    @update:modelValue="$emit('update:visible', $event)"
    width="800px"
    class="c-Result"
  >
    <div class="result-container">
      <div v-for="(item, key) in result" :key="key" class="result-item">
        <div class="title">{{ conversionCategoryName(key) }}抽奖结果：</div>
        <div class="content-lines">
          <div class="line" v-for="(res, i) in item" :key="i">
            <span class="seq">{{ res }}</span>
            <span class="type">{{ (list.find((d) => d.key === res) || {}).type || '-' }}</span>
            <span class="name">{{ (list.find((d) => d.key === res) || {}).name || res }}</span>
          </div>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { computed, defineProps, defineEmits } from 'vue';
import { useLuckyStore } from '@/stores';
import { conversionCategoryName } from '@/helper/index';

// 定义属性
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
});

// 定义事件
const emit = defineEmits(['update:visible']);

// 使用 Pinia store
const store = useLuckyStore();

// 计算属性
const result = computed(() => store.result);
const list = computed(() => store.list);
</script>

<style lang="scss" scoped>
.c-Result {
  .result-container {
    max-height: 500px;
    overflow-y: auto;
    .result-item {
      margin-bottom: 20px;
      .title {
        font-size: 18px;
        font-weight: bold;
        margin-bottom: 10px;
      }
      .content-lines {
        display: flex;
        flex-direction: column;
        align-items: center; /* 居中每一行 */
        .line {
          display: flex;
          align-items: center;
          justify-content: center; /* 三列居中排列 */
          padding: 10px 12px;
          border-bottom: 1px solid #eee;
          font-size: 20px; /* 字体调大 */
        }
        .line .seq { width: 100px; color: #333; text-align: center; font-weight: bold; }
        .line .type { width: 160px; color: #333; text-align: center; }
        .line .name { flex: 0 0 280px; color: #000; text-align: center; font-weight: bold; }
      }
    }
  }
}
</style>
