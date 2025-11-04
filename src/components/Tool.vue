<template>
  <div id="tool">
    <el-button @click="startHandler" type="primary" size="small">{{
      running ? '停止' : '开始'
    }}</el-button>
    <el-button size="small" @click="showRemoveoptions = true">
      重置
    </el-button>
    <el-button size="small" @click="showImport = true">
      导入名单
    </el-button>
    <el-button size="small" @click="exportListExcel">
      导出名单
    </el-button>
    <el-button size="small" @click="showImportphoto = true">
      导入照片
    </el-button>
    <el-dialog
      :append-to-body="true"
      v-model="showSetwat"
      class="setwat-dialog"
      width="400px"
    >
      <el-form ref="formRef" :model="form" label-width="80px" size="small">
        <el-form-item label="抽取奖项">
          <el-select
            v-model="form.category"
            :disabled="categorys.length === 0"
            :placeholder="categorys.length ? '请选取本次抽取的奖项' : '未设置奖项'"
          >
            <el-option
              :label="item.label"
              :value="item.value"
              v-for="(item, index) in categorys"
              :key="index"
            ></el-option>
          </el-select>
        </el-form-item>

        <el-form-item label=" " v-if="form.category">
          <span>
            共&nbsp;
            <span class="colorred">{{ config[form.category] }}</span>
            &nbsp;名
          </span>
          <span :style="{ marginLeft: '20px' }">
            剩余&nbsp;
            <span class="colorred">{{ remain }}</span>
            &nbsp;名
          </span>
        </el-form-item>

        <el-form-item label="抽取方式">
          <el-select v-model="form.mode" placeholder="请选取本次抽取方式">
            <el-option label="抽1人" :value="1"></el-option>
            <el-option label="抽5人" :value="5"></el-option>
            <el-option label="一次抽取完" :value="0"></el-option>
            <el-option label="自定义" :value="99"></el-option>
          </el-select>
        </el-form-item>

        <el-form-item label="抽取人数" v-if="form.mode === 99">
          <el-input
            v-model="form.qty"
            type="number"
            :clearable="true"
            :min="1"
            :max="remain ? remain : 100"
            :step="1"
          ></el-input>
        </el-form-item>

        <el-form-item label="全员参与">
          <el-switch v-model="form.allin"></el-switch>
          <span :style="{ fontSize: '12px' }">
            (开启后将在全体成员[无论有无中奖]中抽奖)
          </span>
        </el-form-item>

        <el-form-item label="分组抽奖">
          <el-switch v-model="form.groupDraw" :disabled="!canGroupDraw"></el-switch>
          <span :style="{ fontSize: '12px', marginLeft: '10px', color: '#409eff' }">
            (当前名单中有{{ groupCount }}个小组)
          </span>
          <span :style="{ fontSize: '12px', marginLeft: '10px' }" v-if="canGroupDraw && form.groupDraw">
            平均每组抽取{{ Math.floor((form.mode === 99 ? form.qty : (form.mode === 0 ? remain : form.mode)) / groupCount) }}人，余{{ (form.mode === 99 ? form.qty : (form.mode === 0 ? remain : form.mode)) % groupCount }}人在全体中抽取
          </span>
          <span v-else-if="groupCount < 1" style="font-size: '12px'; color: #909399">
            (无分组数据，无法开启)
          </span>
          <span v-else-if="!canGroupDraw" style="font-size: '12px'; color: #909399">
            (抽奖数小于分组数，无法开启)
          </span>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :disabled="!form.category || categorys.length === 0" @click="onSubmit">立即抽奖</el-button>
          <el-button @click="showSetwat = false">取消</el-button>
        </el-form-item>
      </el-form>
    </el-dialog>

    <el-dialog
      :append-to-body="true"
      v-model="showImport"
      class="import-dialog"
      width="500px"
    >
      <el-input
        type="textarea"
        :rows="8"
        placeholder="请输入四列数据(可直接从Excel复制)，格式为：序号 分组 类型 姓名。示例：
        1 第一组 技术部 张三
        2 第二组 市场部 李四
        3 第一组 行政 王五"
        v-model="listStr"
      ></el-input>
      <div class="footer">
        <div class="button-group">
          <el-button size="small" @click="downloadSampleExcel">示例文件下载</el-button>
          <el-upload
            :show-file-list="false"
            :auto-upload="false"
            accept=".xlsx,.xls"
            :on-change="handleUploadChange"
            class="inline-upload"
          >
            <el-button size="small">导入Excel</el-button>
          </el-upload>
          <el-button size="small" type="primary" @click="transformList">确定</el-button>
          <el-button size="small" @click="showImport = false">取消</el-button>
        </div>
      </div>
    </el-dialog>
    <Importphoto
      v-model:visible="showImportphoto"
      @getPhoto="$emit('getPhoto')"
    ></Importphoto>

    <el-dialog
      v-model="showRemoveoptions"
      width="300px"
      class="c-removeoptions"
      :append-to-body="true"
    >
      <el-form ref="removeFormRef" :model="removeInfo" label-width="80px" size="small">
        <el-form-item label="重置选项">
          <el-radio-group v-model="removeInfo.type">
            <el-radio border :label="0">重置全部数据</el-radio>
            <el-radio border :label="1">重置抽奖配置</el-radio>
            <el-radio border :label="2">重置名单</el-radio>
            <el-radio border :label="3">重置照片</el-radio>
            <el-radio border :label="4">重置抽奖结果</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="resetConfig">确定重置</el-button>
          <el-button @click="showRemoveoptions = false">取消</el-button>
        </el-form-item>
      </el-form>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch, defineProps, defineEmits, nextTick } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useLuckyStore } from '@/stores';
import {
  clearData,
  removeData,
  configField,
  listField,
  resultField,
  conversionCategoryName
} from '@/helper/index';
import Importphoto from './Importphoto.vue';
import { database, DB_STORE_NAME } from '@/helper/db';
import * as XLSX from 'xlsx';
// 使用 Pinia store
const store = useLuckyStore();
// 定义属性和事件
const props = defineProps({
  running: Boolean,
  closeRes: Function
});

const emit = defineEmits(['toggle', 'resetConfig', 'getPhoto']);

// 响应式数据
const showSetwat = ref(false);
const showImport = ref(false);
const showImportphoto = ref(false);
const showRemoveoptions = ref(false);
const removeInfo = ref({ type: 0 });
const form = ref({
  category: '',
  mode: 1,
  qty: 1,
  allin: false,
  groupDraw: false
});
const listStr = ref('');
const formRef = ref(null);
const removeFormRef = ref(null);

// 计算属性
const config = computed(() => store.config);
const result = computed(() => store.result);

const remain = computed(() => {
  const cat = form.value.category;
  const total = cat ? (config.value[cat] || 0) : 0;
  const arr = cat ? (result.value[cat] || []) : [];
  return total - arr.length;
});

const categorys = computed(() => {
  const options = [];
  for (const key in config.value) {
    if (Object.prototype.hasOwnProperty.call(config.value, key)) {
      const item = config.value[key];
      if (item > 0) {
        let name = conversionCategoryName(key);
        name &&
          options.push({
            label: name,
            value: key
          });
      }
    }
  }
  return options;
});

// 监听
watch(categorys, (opts) => {
  const has = Array.isArray(opts) && opts.length > 0;
  if (!has) {
    form.value.category = '';
    return;
  }
  if (!opts.find(o => o.value === form.value.category)) {
    form.value.category = '';
  }
});

watch(() => showRemoveoptions.value, (v) => {
  if (!v) {
    removeInfo.value.type = 0;
  }
});

// 监听
// 方法
const resetConfig = () => {
  const type = removeInfo.value.type;
  ElMessageBox.confirm('此操作将重置所选数据，是否继续?', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  })
    .then(() => {
      switch (type) {
        case 0:
          clearData();
          store.setClearStore();
          database.clear(DB_STORE_NAME);
          break;
        case 1:
          removeData(configField);
          store.setClearConfig();
          break;
        case 2:
          removeData(listField);
          store.setClearList();
          break;
        case 3:
          database.clear(DB_STORE_NAME);
          store.setClearPhotos();
          break;
        case 4:
          removeData(resultField);
          store.setClearResult();
          break;
        default:
          break;
      }

      if (props.closeRes) props.closeRes();

      showRemoveoptions.value = false;
      ElMessage({
        type: 'success',
        message: '重置成功!'
      });

      nextTick(() => {
        emit('resetConfig');
      });
    })
    .catch(() => {
      ElMessage({
        type: 'info',
        message: '已取消'
      });
    });
};

const onSubmit = () => {
  if (!form.value.category) {
    return ElMessage.error('请选择本次抽取的奖项');
  }
  if (remain.value <= 0) {
    return ElMessage.error('该奖项剩余人数不足');
  }
  if (form.value.mode === 99) {
    if (form.value.qty <= 0) {
      return ElMessage.error('必须输入本次抽取人数');
    }
    if (form.value.qty > remain.value) {
      return ElMessage.error('本次抽奖人数已超过本奖项的剩余人数');
    }
  }
  if (form.value.mode === 1 || form.value.mode === 5) {
    if (form.value.mode > remain.value) {
      return ElMessage.error('本次抽奖人数已超过本奖项的剩余人数');
    }
  }
  showSetwat.value = false;
  // 如果没有导入名单且开启了分组抽奖，设置默认分组为'default'
  if (form.value.groupDraw && (!store.list || store.list.length === 0)) {
    ElMessage.warning('未导入名单，所有人员将默认分配到"default"分组');
  }
  
  emit(
    'toggle',
    Object.assign({}, form.value, { remain: remain.value })
  );
};

const startHandler = () => {
  if (props.running) {
    // 停止抽奖时，需要传递form参数
    emit(
      'toggle',
      Object.assign({}, form.value, { remain: remain.value })
    );
  } else {
    // 开始抽奖时，不需要传递form参数
    emit('toggle');
    showSetwat.value = true;
  }
};

const transformList = () => {
  if (!listStr.value) {
    ElMessage.error('没有数据');
    return;
  }
  const list = [];
  const rows = listStr.value.split('\n');
  if (rows && rows.length > 0) {
    rows.forEach(item => {
      const cols = item.trim().split(/\t|,|\s+/);
      if (cols.length >= 3) {
        const key = Number(cols[0].trim());
        const group = (cols[1] || 'default').trim();
        const type = cols.length >= 4 ? (cols[2] || '').trim() : '';
        const name = cols.length >= 4 ? cols.slice(3).join(' ').trim() : cols.slice(2).join(' ').trim();
        key &&
          list.push({
            key,
            group,
            type,
            name
          });
      }
    });
  }
  // 清空现有名单，然后导入新名单
  store.setClearList();
  store.setList(list);

  ElMessage({
    message: '保存成功',
    type: 'success'
  });
  showImport.value = false;
  nextTick(() => {
    emit('resetConfig');
  });
};

// Excel 导入：处理文件选择
const handleUploadChange = (file) => {
  const raw = file && file.raw ? file.raw : null;
  if (!raw) {
    ElMessage.error('未获取到文件');
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const wb = XLSX.read(data, { type: 'array' });
      const wsName = wb.SheetNames[0];
      const ws = wb.Sheets[wsName];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
      if (!rows || rows.length < 2) {
        ElMessage.error('表格无有效数据');
        return;
      }
      const header = rows[0].map(String);
      const expect = ['序号', '分组', '类型', '姓名'];
      const isHeaderOk =
        header.length >= 4 &&
        header[0].trim() === expect[0] &&
        header[1].trim() === expect[1] &&
        header[2].trim() === expect[2] &&
        header[3].trim() === expect[3];
      if (!isHeaderOk) {
        ElMessage.error('表头需为：序号 分组 类型 姓名');
        return;
      }
      
      // 将Excel内容转换为文本显示在输入框中
      let importText = '';
      rows.slice(1).forEach((row) => {
        if (!row || row.length === 0) return;
        const key = String(row[0] ?? '').trim();
        const group = String(row[1] ?? 'default').trim();
        const type = String(row[2] ?? '').trim();
        const name = String(row[3] ?? '').trim();
        if (key && name) {
          importText += `${key} ${group} ${type} ${name}\n`;
        }
      });
      
      if (!importText) {
        ElMessage.error('没有可导入的数据');
        return;
      }
      
      // 更新输入框内容而不是直接导入
      listStr.value = importText;
      ElMessage.success('Excel解析成功，请检查内容并点击"确定"导入');
    } catch (err) {
      ElMessage.error('解析Excel失败');
      console.error(err);
    }
  };
  reader.onerror = () => ElMessage.error('读取文件失败');
  reader.readAsArrayBuffer(raw);
};

// 示例Excel下载
// 计算属性：分组数量
const groupCount = computed(() => {
  const list = store.list || [];
  const groups = new Set();
  list.forEach(item => {
    groups.add(item.group || 'default');
  });
  return groups.size;
});

// 计算属性：是否可以开启分组抽奖
const canGroupDraw = computed(() => {
  let qty;
  if (form.value.mode === 99) {
    qty = form.value.qty;
  } else if (form.value.mode === 0) {
    qty = remain.value;
  } else {
    qty = form.value.mode;
  }
  return qty >= groupCount.value && groupCount.value > 0;
});

// 监听canGroupDraw变化，当不能分组抽奖时自动关闭分组抽奖开关
watch(canGroupDraw, (newVal) => {
  if (!newVal && form.value.groupDraw) {
    form.value.groupDraw = false;
  }
});

const downloadSampleExcel = () => {
  const wb = XLSX.utils.book_new();
  const data = [
    ['序号', '分组', '类型', '姓名'],
    [1, '第一组', '技术部', '张三'],
    [2, '第二组', '市场部', '李四'],
    [3, '第一组', '行政', '王五']
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, '示例');
  XLSX.writeFile(wb, '示例导入文件.xlsx');
};

// 导出当前名单为Excel
const exportListExcel = () => {
  const list = store.list || [];
  if (!list || list.length === 0) {
    ElMessage.error('当前无名单可导出');
    return;
  }
  const data = [
    ['序号', '分组', '类型', '姓名'],
    ...list.map(item => [
      item.key,
      item.group || 'default',
      item.type || '',
      item.name || ''
    ])
  ];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, '当前名单');
  XLSX.writeFile(wb, '当前名单.xlsx');
};
</script>

<style lang="scss" scoped>
#tool {
  position: fixed;
  width: 60px;
  top: 50%;
  right: 20px;
  transform: translateY(-50%);
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  .el-button + .el-button {
    margin-top: 20px;
    margin-left: 0px;
  }
  .el-button {
    color: #ffd700; /* 按钮文字金色 */
    background-color: #ff0000; /* 按钮背景红色 */
    border-color: #ff0000; /* 按钮边框红色 */
    &:hover {
      background-color: #cc0000; /* 鼠标悬停时背景深红色 */
      border-color: #cc0000; /* 鼠标悬停时边框深红色 */
    }
  }
}

.tool {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  padding: 10px;
}
.tool-item {
  margin: 5px;
}
.footer {
  margin-top: 15px;
  display: flex;
  justify-content: center;
}
.button-group {
  display: flex;
  flex-wrap: nowrap;
  justify-content: center;
  gap: 10px;
  align-items: center;
}
.inline-upload {
  display: inline-flex;
  align-items: center;
  vertical-align: middle;
}
.import-dialog :deep(.el-dialog__body) {
  padding: 20px;
}
</style>

<!-- 添加全局样式 -->
<style lang="scss">
.setwat-dialog {
  .colorred {
    color: red;
    font-weight: bold;
  }
}

.import-dialog {
  .footer {
    height: 50px;
    line-height: 50px;
    text-align: center;
  }
}

.c-removeoptions {
  .el-dialog {
    height: 290px;
  }
  .el-radio.is-bordered + .el-radio.is-bordered {
    margin-left: 0px;
  }
  .el-radio.is-bordered {
    margin-bottom: 10px;
  }
}
</style>
