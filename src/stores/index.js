import { defineStore } from 'pinia';
import { setData, resultField, newLotteryField, listField } from '@/helper/index';

export const useLuckyStore = defineStore('lucky', {
  state: () => ({
    config: {
      name: '抽奖',
      number: 70,
      firstPrize: 1
    },
    result: {
      firstPrize: []
    },
    newLottery: [],
    list: [],
    photos: []
  }),
  
  actions: {
    setClearConfig() {
      this.config = {
        name: '抽奖',
        number: 70,
        firstPrize: 1
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
      this.result = {
        firstPrize: []
      };
    },
    setClearStore() {
      this.config = {
        name: '抽奖',
        number: 70,
        firstPrize: 1
      };
      this.result = {
        firstPrize: []
      };
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