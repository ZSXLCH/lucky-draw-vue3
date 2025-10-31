import { defineStore } from 'pinia';
import { setData, resultField, newLotteryField, listField, configField } from '@/helper/index';

export const useLuckyStore = defineStore('lucky', {
  state: () => {
    // 创建默认的序号数据，每个数据都带有default分组
    const createDefaultList = () => {
      const defaultList = [];
      const number = 70; // 默认70人
      for (let i = 1; i <= number; i++) {
        defaultList.push({
          key: i.toString(),
          name: i.toString(),
          type: null,
          group: 'default'
        });
      }
      return defaultList;
    };
    
    return {
      config: {
        name: '抽奖',
        number: 70
      },
      result: {},
      newLottery: [],
      list: createDefaultList(),
      photos: []
    };
  },
  
  actions: {
    setClearConfig() {
      this.config = {
        name: '抽奖',
        number: 70
      };
      this.newLottery = [];
    },
    setClearList() {
      // 重置名单后创建默认序号数据，每个数据都带有default分组
      const defaultList = [];
      const number = this.config.number || 70;
      for (let i = 1; i <= number; i++) {
        defaultList.push({
          key: i.toString(),
          name: i.toString(),
          type: null,
          group: 'default'
        });
      }
      this.list = defaultList;
      setData(listField, defaultList);
    },
    setClearPhotos() {
      this.photos = [];
    },
    setClearResult() {
      this.result = {};
    },
    setClearStore() {
      this.config = {
        name: '抽奖',
        number: 70
      };
      this.result = {};
      this.newLottery = [];
      this.list = [];
      this.photos = [];
    },
    setConfig(config) {
      this.config = config;
    },
    setResult(result = {}) {
      this.result = result;
      setData(resultField, this.result);
    },
    setNewLottery(newLottery) {
      if (this.newLottery.find(item => item.name === newLottery.name)) {
        return;
      }
      this.newLottery.push(newLottery);
      setData(newLotteryField, this.newLottery);
    },
    renameNewLottery({ index, key, name }) {
      if (index > -1) {
        this.newLottery[index].name = name;
        // 更新结果中的名称绑定
        if (this.result[key]) {
          this.result[key].forEach(item => {
            item.type = name;
          });
        }
        setData(newLotteryField, this.newLottery);
        setData(resultField, this.result);
      }
    },
    deleteNewLottery({ key, index }) {
      if (index > -1) {
        // 删除奖项
        this.newLottery.splice(index, 1);
        // 删除配置
        delete this.config[key];
        // 删除相关中奖数据
        delete this.result[key];
        
        setData(newLotteryField, this.newLottery);
        setData(configField, this.config);
        setData(resultField, this.result);
      }
    },
    reorderNewLottery(fromIndex, toIndex) {
      if (fromIndex === toIndex) return;
      
      const item = this.newLottery.splice(fromIndex, 1)[0];
      this.newLottery.splice(toIndex, 0, item);
      
      setData(newLotteryField, this.newLottery);
    },
    setList(list) {
      // 完全替换现有列表，而不是追加
      const newList = list.map(item => ({
        key: item.key,
        name: item.name,
        type: item.type,
        group: item.group || 'default'
      }));
      this.list = newList;
      setData(listField, newList);
    },
    setPhotos(photos) {
      this.photos = photos;
    }
  }
});