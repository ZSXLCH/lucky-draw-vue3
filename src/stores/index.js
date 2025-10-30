import { defineStore } from 'pinia';
import { setData, resultField, newLotteryField, listField, configField } from '@/helper/index';

export const useLuckyStore = defineStore('lucky', {
  state: () => ({
    config: {
      name: '抽奖',
      number: 70
    },
    result: {},
    newLottery: [],
    list: [],
    photos: []
  }),
  
  actions: {
    setClearConfig() {
      this.config = {
        name: '抽奖',
        number: 70
      };
      this.newLottery = [];
    },
    setClearList() {
      this.list = [];
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
      const arr = this.list;
      list.forEach(item => {
        const arrIndex = arr.findIndex(data => data.key === item.key);
        if (arrIndex > -1) {
          arr[arrIndex].name = item.name;
          if (item.type !== undefined) {
            arr[arrIndex].type = item.type;
          }
        } else {
          arr.push({
            key: item.key,
            name: item.name,
            type: item.type
          });
        }
      });
      this.list = arr;
      setData(listField, arr);
    },
    setPhotos(photos) {
      this.photos = photos;
    }
  }
});