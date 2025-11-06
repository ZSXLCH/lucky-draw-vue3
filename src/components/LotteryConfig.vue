<template>
  <el-dialog
    v-model="dialogVisible"
    :append-to-body="true"
    width="640px"
    class="c-LotteryConfig"
  >
    <template #header>
      <div class="c-LotteryConfigtitle">
        <span :style="{ fontSize: '16px', marginRight: '20px' }">
          抽奖配置
        </span>
        <el-button size="small" @click="addLottery">增加奖项</el-button>
        <el-button size="small" type="primary" @click="onSubmit"
          >保存配置</el-button
        >
        <el-button size="small" @click="closeDialog"
          >取消</el-button
        >
      </div>
    </template>
    <div class="container">
      <el-form ref="formRef" :model="form" size="small">
        <el-form-item label="抽奖标题">
          <el-input v-model="form.name"></el-input>
        </el-form-item>
        <el-form-item label="抽奖总人数">
          <el-input
            type="number"
            v-model="form.number"
            :min="1"
            :step="1"
          ></el-input>
        </el-form-item>

        <!-- 默认奖项：名驹（不可编辑名额、不可重命名/删除） -->
        <el-form-item class="prize-item">
          <div class="prize-label">名驹</div>
          <span class="prize-count-label">人数：</span>
          <el-input type="number" :min="0" :step="1" v-model="form.firstPrize" disabled></el-input>
          <span class="prize-count-label" style="margin-left: 10px;">剩余：</span>
          <span>{{ defaultRemain }}</span>
        </el-form-item>

        <el-form-item
          v-for="(newitem, index) in storeNewLottery"
          :key="newitem.key"
          class="prize-item"
        >
          <div class="prize-label">{{ newitem.name }}</div>
          <span class="prize-count-label">人数：</span>
          <el-input
            type="number"
            :min="0"
            :step="1"
            v-model="form[newitem.key]"
            @change="
              val => {
                form[newitem.key] = Number(val);
              }
            "
          ></el-input>
          <div class="prize-actions">
            <el-button size="small" type="primary" @click="renamePrize(newitem)">重命名</el-button>
            <el-button size="small" type="danger" @click="deletePrize(newitem, index)">删除</el-button>
          </div>
          <el-icon class="drag-handle" @mousedown="startDrag($event, index)"><Rank /></el-icon>
        </el-form-item>
      </el-form>
    </div>

    <el-dialog
      v-model="showAddLottery"
      :append-to-body="true"
      width="300px"
      class="dialog-showAddLottery"
    >
      <template #header>
        <div class="add-title">增加奖项</div>
      </template>
      <el-form ref="newLotteryRef" :model="newLottery" size="small">
        <el-form-item label="奖项名称">
          <el-input v-model="newLottery.name"></el-input>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="addHandler">增加奖项</el-button>
          <el-button @click="showAddLottery = false">取消</el-button>
        </el-form-item>
      </el-form>
    </el-dialog>
    
    <!-- 重命名对话框 -->
    <el-dialog
      v-model="showRenameLottery"
      :append-to-body="true"
      width="300px"
      class="dialog-showRenameLottery"
    >
      <template #header>
        <div class="rename-title">重命名奖项</div>
      </template>
      <el-form ref="renameLotteryRef" :model="renameLotteryData" size="small">
        <el-form-item label="奖项名称">
          <el-input v-model="renameLotteryData.name"></el-input>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="renameHandler">确定</el-button>
          <el-button @click="showRenameLottery = false">取消</el-button>
        </el-form-item>
      </el-form>
    </el-dialog>
  </el-dialog>
</template>

<script setup>
import { ref, computed, nextTick, defineProps, defineEmits } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useLuckyStore } from '@/stores';
import { setData, configField } from '@/helper/index';
import { randomNum } from '@/helper/algorithm';
import { Rank } from '@element-plus/icons-vue';

// 定义属性和事件
const props = defineProps({
  visible: Boolean
});

const emit = defineEmits(['update:visible', 'resetconfig']);

// 使用 Pinia store
const store = useLuckyStore();

// 响应式数据
const showAddLottery = ref(false);
const showRenameLottery = ref(false);
const newLottery = ref({ name: '' });
const renameLotteryData = ref({ name: '', key: '', index: -1 });
const formRef = ref(null);
const newLotteryRef = ref(null);
const renameLotteryRef = ref(null);
const dragItem = ref(null);

// 计算属性
const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
});

const form = computed({
  get: () => store.config,
  set: (val) => val
});

// 默认奖项剩余人数
const defaultRemain = computed(() => {
  const total = store.config.firstPrize || 0;
  const arr = (store.result.firstPrize || []);
  return total - arr.length;
});

const storeNewLottery = computed(() => store.newLottery);

// 方法
const closeDialog = () => {
  dialogVisible.value = false;
};

const onSubmit = () => {
  setData(configField, form.value);
  store.setConfig(form.value);
  dialogVisible.value = false;

  ElMessage({
    message: '保存成功',
    type: 'success'
  });

  nextTick(() => {
    emit('resetconfig');
  });
};

const addLottery = () => {
  showAddLottery.value = true;
};

const randomField = () => {
  const str = 'abcdefghijklmnopqrstuvwxyz';
  let fieldStr = '';
  for (let index = 0; index < 10; index++) {
    fieldStr += str.split('')[randomNum(1, 27) - 1];
  }
  return `${fieldStr}${Date.now()}`;
};

const addHandler = () => {
  const field = randomField();
  const data = {
    key: field,
    name: newLottery.value.name
  };
  store.setNewLottery(data);

  showAddLottery.value = false;
};

// 重命名奖项
const renamePrize = (item) => {
  renameLotteryData.value = {
    name: item.name,
    key: item.key,
    index: storeNewLottery.value.findIndex(i => i.key === item.key)
  };
  showRenameLottery.value = true;
};

// 处理重命名
const renameHandler = () => {
  if (!renameLotteryData.value.name) {
    ElMessage.error('奖项名称不能为空');
    return;
  }
  
  // 更新奖项名称
  const index = renameLotteryData.value.index;
  const key = renameLotteryData.value.key;
  
  // 更新store中的奖项名称
  store.renameNewLottery({
    index,
    key,
    name: renameLotteryData.value.name
  });
  
  showRenameLottery.value = false;
  
  ElMessage({
    message: '重命名成功',
    type: 'success'
  });
};

// 删除奖项
const deletePrize = (item, index) => {
  ElMessageBox.confirm(
    '确定要删除该奖项吗？相关的中奖数据也会被删除',
    '提示',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  )
    .then(() => {
      // 删除奖项和相关中奖数据
      store.deleteNewLottery({
        key: item.key,
        index
      });
      
      ElMessage({
        type: 'success',
        message: '删除成功',
      });
    })
    .catch(() => {
      // 取消删除
    });
};

// 拖动排序相关方法
const startDrag = (event, index) => {
  dragItem.value = index;
  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', stopDrag);
};

const onDrag = (event) => {
  if (dragItem.value === null) return;
  
  // 这里可以添加拖动时的视觉效果
  // 简化实现，仅在松开鼠标时进行排序
};

const stopDrag = (event) => {
  if (dragItem.value === null) return;
  
  // 获取鼠标位置对应的目标索引
  const items = document.querySelectorAll('.prize-item');
  let targetIndex = null;
  
  items.forEach((item, index) => {
    const rect = item.getBoundingClientRect();
    if (
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom
    ) {
      targetIndex = index;
    }
  });
  
  // 如果找到有效的目标索引，执行排序
  if (targetIndex !== null && targetIndex !== dragItem.value) {
    store.reorderNewLottery(dragItem.value, targetIndex);
  }
  
  // 清理
  dragItem.value = null;
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
};
</script>

<style lang="scss" scoped>
.c-LotteryConfig {
  :deep(.el-dialog__body) {
    height: 340px;
    .container {
      height: 100%;
      overflow-y: auto;
      padding: 0 10px;
    }
  }
}

:deep(.dialog-showAddLottery),
:deep(.dialog-showRenameLottery) {
  .el-dialog {
    height: 186px;
  }
}

.prize-item {
  display: flex;
  align-items: center;
  flex-wrap: nowrap; /* 强制同一行显示 */
  margin-bottom: 10px;
  position: relative;
  padding: 10px;
  padding-right: 80px; /* 预留更大右侧空间，确保拖动图标最右且不重叠 */
  border-radius: 4px;
  border: 1px solid #ebeef5;
  background-color: #f5f7fa;
  
  &:hover {
    background-color: #ecf5ff;
    
    .drag-handle {
      opacity: 1;
    }
  }
  
  .prize-label {
    min-width: 120px;
    max-width: 220px;
    margin-right: 10px;
    font-weight: bold;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .prize-count-label {
    margin-right: 6px;
    color: #666;
  }
  
  .el-input {
    width: 140px;
    margin-right: 10px;
    flex-shrink: 0;
  }
  
  .prize-actions {
    display: flex;
    gap: 5px;
    margin-left: auto; /* 动作区靠右 */
    margin-right: 60px; /* 与拖动图标保持更大间距 */
    flex-shrink: 0; /* 防止被压缩换行 */
    position: relative;
    z-index: 1; /* 与拖动图标叠放顺序分离 */
  }
  
  .drag-handle {
    position: absolute;
    right: 0; /* 固定到最右边 */
    top: 50%;
    transform: translateY(-50%);
    cursor: move;
    opacity: 0.3;
    transition: opacity 0.3s;
    font-size: 18px;
    color: #409eff;
    z-index: 0;
    padding-right: 6px;
  }
}
</style>
