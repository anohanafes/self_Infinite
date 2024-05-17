
## SelfInfinite

##目的：
* 为了实现一个无缝无限滚动的插件，虽然已经有 vue-seamless-scroll 很强大的插件了，但是在之前 vue项目中 使用时遇到一个BUG：第二次渲染的列表数据行点击click事件无效   
    
    **原因：** 因为无缝滚动插件的原理其实就是列表 copy 后拼接，所以由于dom的重复渲染，相同的部分绑定的事件不能同时运行   
    
    **解决方法：** 利用js的事件委托，为 vue-seamless-scroll 的父元素添加一个 @click 事件（例：@click = 'fn($event)'），再给 vue-seamless-scroll 内的每一行DOM添加一个自定义属性 "data-xxx" 用来存放当前行数据，点击某行时，因为最外层元素绑定了 click 事件，所以由于事件冒泡会触发最外层的 fn 点击事件，在 fn事件 里通过 $event.target.dataset.xxx 获取这行数据...

##有问题反馈
这是我在 NPM上 的第二个手写插件，主要是为了锻炼自身的开发思维和技术,希望各位大佬在使用中有任何问题及性能优化建议，欢迎反馈给我，可以用以下联系方式跟我交流，感谢！

* 邮件(519855937#qq.com, 把#换成@)
* 微信:wqn30303
* QQ: 519855937

##tips：

在兴趣的驱动下,写一个`免费`的东西，有欣喜，也还有汗水，希望你喜欢我的作品，同时也能支持一下。

##关于作者

```javascript
var author = {
  nickName:"王秋宁",
  direction:"一个平平无奇不愿意做搬砖的小前端~~~~"
}
```

##关于使用

* jq 项目中，可以直接 npm install 下载下来后，引入 xxx/index-static.js：

```javascript
直接在 index.html 引用 (详请见 demo-index-static.html)：
html部分：
 
 ......

js部分：
<script src='xxx/self_Infinite/index-static.js'></script>
<script>
    let params = {
        scrollNode: document.querySelector('xxx'),// 需滚动元素
        addNodePNode: document.querySelector('xxx'),// 需添加子元素的父元素
        dataSource: 'xxx' 或 [...], // 数据源(JS项目中固定传字符串 'DOM')
        transVal: 0.5 // 每 1/60 次移动的距离(60帧：requestAnimationframe 使浏览器一秒绘制 60 次)
    };

    let thisScroll = new InfiniteScroll(params);
    
    {/* * 初始化滚动（开始滚动） */}
    thisScroll.init();

    {/* * 停止滚动 */}
    function stopFn(){
        thisScroll.cancelListen();
        thisScroll.stopMove();
    }

    {/* * 重置滚动 */}
    function restartFn(){
        thisScroll.reset();
    }

    {/* * 暂停滚动 */}
    function pauseFn(){
        thisScroll.pause();
    }

    {/* * 继续滚动 */}
    function continueFn(){
        thisScroll.continue();
    }
   
</script>
```


* MVVM框架 项目中，npm install self-infinite

```javascript
js部分：
<script>
    import {InfiniteScroll} from 'self-infinite';

    以 VUE 为例：

    例：
    
    let params = {
        scrollNode: document.querySelector('xxx'),// 需滚动元素
        addNodePNode: document.querySelector('xxx'),// 需添加子元素的父元素
        dataSource: [
            {id:1,name:2},
            {id:2,name:3},
            {id:3,name:4}
        ], // 数据源(MVVM项目中传入需要滚动的数据List)
        transVal: 0.5 // 每 1/60 次移动的距离(60帧：requestAnimationframe 使浏览器一秒绘制 60 次)
    };
    
    let _infiScroll = new InfiniteScroll(params);

    _infiScroll.init();
</script>
```