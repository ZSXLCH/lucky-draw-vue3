# Electron 快速打包 Windows 程序步骤

## 前置条件



* 已安装 Node.js（建议 v14+），可通过 `node -v` 验证安装状态

* 已准备好待打包的项目 `dist` 文件夹

## 操作步骤

### 1. 放置项目文件

将需要打包的 `dist` 文件夹复制到 Electron 项目根目录下



### 2. 安装依赖与配置命令



1. 打开终端，进入项目根目录，安装基础依赖：



```
npm install
```



2. 安装打包工具（若未安装）：



```
npm install electron-packager --save-dev
```



3. 在 `package.json` 中配置打包脚本：



```
"scripts": {

&#x20; "packager": "electron-packager ./ test --platform=win32 --arch=x64 --icon=./dist/favicon.ico --overwrite"

}
```



* 其中 `"test"` 为打包后生成的 exe 文件名，可自定义

### 3. 执行打包

在终端中运行命令：



```
npm run packager
```

## 打包结果

打包完成后，项目根目录会生成类似 `test-win32-x64` 的文件夹，内部可找到 `test.exe` 可执行文件

