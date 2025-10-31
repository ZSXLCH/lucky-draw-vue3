<template>
  <el-dialog
    :modelValue="visible"
    @update:modelValue="$emit('update:visible', $event)"
    width="800px"
    class="c-Result"
  >
    <template #header>
      <div class="result-header">
        <span class="dialog-title">抽奖结果</span>
        <el-button size="small" type="primary" @click="exportWinnersExcel">导出中奖名单</el-button>
      </div>
    </template>
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
                {{ (list.find((d) => d.key === res) || {}).type || '-' }}：{{ (list.find((d) => d.key === res) || {}).name || res }}
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
import { ElMessage } from 'element-plus';
import * as XLSX from 'xlsx';

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

// 导出所有中奖名单为Excel
const exportWinnersExcel = () => {
  const resObj = result.value || {};
  const listArr = list.value || [];

  const categories = Object.keys(resObj);
  if (categories.length === 0) {
    ElMessage.error('当前无中奖数据可导出');
    return;
  }

  const header = ['序号', '奖项', '分组', '类型', '姓名'];
  const rows = [];

  categories.forEach((cat) => {
    const winners = resObj[cat] || [];
    const catName = conversionCategoryName(cat) || cat;
    winners.forEach((id) => {
      const info = listArr.find((d) => d.key === id) || {};
      rows.push([
        id,
        catName,
        info.group || '',
        info.type || '',
        info.name || id,
      ]);
    });
  });

  if (rows.length === 0) {
    ElMessage.error('当前无中奖数据可导出');
    return;
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  XLSX.utils.book_append_sheet(wb, ws, '中奖名单');
  XLSX.writeFile(wb, '中奖名单.xlsx');
  ElMessage.success('导出成功：中奖名单.xlsx');
};
</script>

<style lang="scss" scoped>
.c-Result {
  .result-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .dialog-title {
    font-size: 16px;
    font-weight: bold;
  }
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
              font-size: 24px;
              font-weight: bold;
              color: #333;
              background-color: transparent; /* 透明背景 */
              border: 1px solid #ddd;
              border-radius: 4px;
              width: 90%;
              box-sizing: border-box;
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
