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
        <div v-if="getPages(item).length > 0">
          <div class="grid-container">
            <div 
              v-for="(res, i) in currentPageData(item, currentPages[key] || 1)" 
              :key="i" 
              class="grid-item"
            >
              <span class="result-text">
                <span class="result-data">{{ ((currentPages[key] || 1) - 1) * (pageSize.value || 10) + i + 1 }}</span>
                <span class="result-data">{{ (list.find((d) => d.key === res) || {}).type || '-' }}</span>
                <span class="result-data">{{ (list.find((d) => d.key === res) || {}).name || res }}</span>
              </span>
            </div>
          </div>
          <div v-if="getPages(item).length > 1" class="pagination-container">
            <div class="page-size-selector">
              <span>每页显示：</span>
              <el-select v-model="pageSize" size="small" style="width: 80px; margin-right: 10px;">
                <el-option label="5" :value="5" />
                <el-option label="10" :value="10" />
                <el-option label="15" :value="15" />
                <el-option label="20" :value="20" />
              </el-select>
            </div>
            <el-pagination
              v-model:current-page="currentPages[key]"
              :page-size="pageSize"
              layout="prev, pager, next"
              :total="item.length"
              @current-change="handlePageChange(key, $event)"
            />
          </div>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { computed, defineProps, defineEmits, reactive, ref } from 'vue';
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

// 分页相关数据
const pageSize = ref(10); // 可配置的每页显示数据个数
const currentPages = reactive({});

// 将结果按页分组，每页最多pageSize人
const getPages = (items) => {
  const pages = [];
  
  for (let i = 0; i < items.length; i += pageSize.value) {
    pages.push(items.slice(i, i + pageSize.value));
  }
  
  return pages;
};

// 获取当前页数据
const currentPageData = (items, page) => {
  const startIndex = (page - 1) * pageSize.value;
  const endIndex = startIndex + pageSize.value;
  return items.slice(startIndex, endIndex);
};

// 处理页码变化
const handlePageChange = (key, page) => {
  currentPages[key] = page;
};
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
        margin-bottom: 15px;
        text-align: center;
      }
      .grid-container {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
          justify-items: center;
          margin-bottom: 20px;
        .grid-item {
          width: 100%;
          text-align: center;
          .result-text {
              display: flex;
              padding: 15px 20px;
              font-size: 28px;
              font-weight: bold;
              color: #333;
              background-color: transparent; /* 透明背景 */
              border: 1px solid #ddd;
              border-radius: 4px;
              width: 90%;
              box-sizing: border-box;
              justify-content: space-between;
              align-items: center;
            }
            
            .result-data {
              flex: 1;
              text-align: center;
              margin: 0 10px;
            }
        }
      }
      .pagination-container {
        display: flex;
        justify-content: center;
        align-items: center;
        margin-top: 10px;
        .page-size-selector {
          display: flex;
          align-items: center;
          margin-right: 20px;
        }
      }
    }
  }
}
</style>
