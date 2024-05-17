export class InfiniteScroll {
    constructor({transAdd, transAddRecord, resetFlag, resetFlagStart, resetFlagEnd,cycleCount = 2,scrollNode,addNodePNode,dataSource,transVal}) {
        this.transAdd = transAdd; // 目标滚动元素当前位移值
        this.transAddRecord = transAddRecord; // 记录满足开始 DOM 插入而非拼接数据列表时目标元素当前的 transform 值
        this.resetFlag = resetFlag; // 当前计数器里的数值
        this.resetFlagStart = resetFlagStart; // 起始位移时计数器里的数字
        this.resetFlagEnd = resetFlagEnd;// 到达最大位移值时计数器里的数字（意味着一次数据列表循环结束）
        this.cycleCount = cycleCount; // 数据列表最大循环的次数
        this.dataSource = dataSource; // 数据源
        this.transVal = transVal; // 每 1/60 次移动的距离(60帧：requestAnimationframe 使浏览器一秒绘制 60 次)

        this.scrollNode = scrollNode;// 需滚动元素
        this.addNodePNode = addNodePNode;// 需添加子元素的父元素

        this.obs = null;// 使用 IntersectionObserver 监听某个元素是否出现在页面上（表示页面中是否开始下一个列表循环）
        this.rqaFlag = true;
        this.rqa = null;// 使用 requestAnimationFrame 将目标元素不停的往上滑动
        // 因为 es6 的 Class 中的方法里面的 this 指向为该方法运行时所在的环境，需要用过 bind 重新绑定 this，使其全部指向为当前 Class 类

        this.init = this.init.bind(this);
        
        this.createListenDom = this.createListenDom.bind(this);
        this.scrollFn = this.scrollFn.bind(this);
        this.timer = this.timer.bind(this);
        this.addOrReplaceTr = this.addOrReplaceTr.bind(this);
        this.moveScroll = this.moveScroll.bind(this);
        this.checkIsTouchBot = this.checkIsTouchBot.bind(this);
        this.cancelListen = this.cancelListen.bind(this);

        this.stopMove = this.stopMove.bind(this);
        this.continue = this.continue.bind(this);
        this.pause = this.pause.bind(this);
        this.reset = this.reset.bind(this);

        this.cloneDomList = [];// html + js原生项目初始化时需要拷贝数据源，用于第一次循环拼接用

        this.listenDomWidth = '2px';
        this.listenDomHeight = 30;
    }
    continue(){
        let _this = this;
        _this.rqaFlag = true;
    }
    pause(){
        let _this = this;
        _this.rqaFlag = false;
    }
    reset(){
        let _this = this;
        _this.rqaFlag = true;
        _this.transAdd = 0; 
        _this.transAddRecord = 0; 
        _this.resetFlagStart = 0; 
        _this.resetFlag = _this.resetFlagStart; 
        _this.resetFlagEnd = 0;
        _this.cloneDomList = [];

        /***
         * 判断数据源是否为数组 --- 判断当前项目是否为 mvvm 框架（因为如果是 html + js原生项目，数据源为 addNodePNode 下的所有子元素, 
         * 如果是 mvvm 框架，数据源为单页面组件中定义的数据）
         **/ 
        if(_this.dataSource.constructor != Array){
            for(let item of _this.addNodePNode.children){
                _this.cloneDomList.push(item);
            }
        }

        // 当需添加子元素的父元素内除动态添加的监听元素的所有子元素的总高度 大于 需滚动元素的高度时，开启无限滚动
        if(_this.addNodePNode.clientHeight - _this.listenDomHeight > _this.scrollNode.clientHeight){
            _this.scrollFn();
        }
    }
    init(){
        let _this = this;
        /***
         * 判断数据源是否为数组 --- 判断当前项目是否为 mvvm 框架（因为如果是 html + js原生项目，数据源为 addNodePNode 下的所有子元素, 
         * 如果是 mvvm 框架，数据源为单页面组件中定义的数据）
         **/ 
        if(_this.dataSource.constructor != Array){
            for(let item of _this.addNodePNode.children){
                _this.cloneDomList.push(item);
            }
        }


        _this.createListenDom().then((addScroll) => {
            let addDomHeight = addScroll.clientHeight;// 动态添加的监听元素

            // 当需添加子元素的父元素内除动态添加的监听元素的所有子元素的总高度 大于 需滚动元素的高度时，开启无限滚动
            if(_this.addNodePNode.clientHeight - addDomHeight > _this.scrollNode.clientHeight){
                _this.scrollFn();
            }
        });
    }
    /***
     * 无缝循环效果的思路：
     * 0.如果是在 html + js 原生项目中使用此插件，需要在初始化 (init) 时拷贝数据源(当前需要循环的列表的所有除了 class = 'addScroll' 元素之外的所有子元素)，用于第一次循环拼接用
     * 1.使用 transform 配合 requestAnimationFrame 将目标元素不停的往上滑动
     * 2.在列表的最后一项生成一个元素（div）
     * 3.监听生成的元素，当监听的这元素即将出现在页面上的时候，判定当前单次数据列表的所有子元素已经全部展示完毕，需要进入下一个循环，需要根据情况继续拼接还是将前面的元素插入至列表末尾
     * 4.不可让目标元素无限制的往上滑动，因为这样需要一直在后面拼接无数个列表，那会让列表项越来越多，从而占用大量的浏览器内存，最后导致浏览器崩溃
     * 5.所以为了防止因列表项过多导致浏览器内存被大量占用导致崩溃，需要进行优化：
     *   5.1 首先需要记录几个值：
     *      resetFlagStart --- 起始位移时计数器里的数
     *      resetFlagEnd --- 到达最大位移值时计数器里的数（一次循环结束）
     *      transAddRecord --- 记录满足条件后目标元素当前的 transform 值
     *   5.2 当需要循环的列表的子元素满足设定的循环次数 - 1时，此为起始位移值，且需要记录目标元素当前的 transform 值
     *   5.3 当需要循环的列表的子元素满足设定的循环次数时，此为最大位移值
     *   5.4 当计数器 timer 中当前的数字到达了 最大位移值 --- resetFlagEnd 时，需要将当前目标元素位置值重置为列表开始进入循环时的位置值且计数器的数字重置为
     *       起始位移时计数器里的数值
     * 
     * 6.例：
     *   6.1 假设 当前需循环的数据列表内有7条数据，设定的循环次数为 3
     *   6.2 在一开始会给第七条数据后添加一个 div，使用 IntersectionObserver 监听这个元素是否出现在页面上
     *   6.3 同时会开启一个计数器，从 0 开始，一次浏览器动画帧重绘，加 1 递增
     *   6.4 当第一次列表循环完后（根据 IntersectionObserver 是否触发回调函数判定），当第一个列表内的7条数据即将展示完毕后，会给它后面再拼接上一个同样的数据列表,
     *       因为最大循环次数是 2 ，所以当第首次列表循环完后，此时为起始位移值，并记录下当前列表元素的 transform 值，当第 2 次列表循环完后，此时为最大位移值；
     *       计数器 timer 需要记录下到达起始位移值的数字 和 到达最大位移值时的数字
     *   6.5 当第三次列表循环完后，因为后面不再拼接数据列表，所以使用 insertBefore 将整个长列表的第一项（第一个循环列表的第一项）插入至倒数第一个元素之前（最后
     *       一个元素为监听出现的元素 DIV），使用 while 循环，直到将一次循环的列表中的所有子元素都插入完毕......
     *   6.6 因为计数器是一直在运行着，所以会形成一个无限循环，当计数器中的数字到达最大位移值的数字时，将 transform 值重置为起始位移值时 的 transform，并将计数器的数字
     *       重置为起始位移值时的数值
    */
    createListenDom(){
        let _this = this;
        return new Promise((resolve,reject) => {
            let thisDom = document.createElement('div');

            thisDom.classList.add('addScroll');
            thisDom.style.width = _this.listenDomWidth;
            thisDom.style.height = _this.listenDomHeight;
            thisDom.style.background = 'transparent';
            
            _this.addNodePNode.appendChild(thisDom);
            resolve(thisDom);
        })
    }
    scrollFn() {
        let _this = this;
        // console.log('scroll!')
        let concatList;// 需要拼接的数据源
        if(_this.dataSource.constructor == Array){ // 传入的是数组（代表是 MVVM 框架项目），拼接数据源
            concatList = function(){
               return Object.freeze(_this.dataSource.concat());
            }
        }
        else{// 传入的是需要添加子元素的 DOM对象（this.addNodePNode）下面的全部子元素
            concatList = function(){
               return _this.cloneDomList;
            };

        }

        function render(){
            // if(!_this.rqaFlag){
            //     window.cancelAnimationFrame(_this.rqa);
            //     return;
            // }
            // else{
            if(_this.rqaFlag){
                _this.timer();// 启动一个计数器，为了当目标元素滑动到最大可位移距离后，重置目标元素起始位移值
                _this.moveScroll(_this.scrollNode);
                // console.log(_this.rqaFlag);
                // window.requestAnimationFrame(render); 
            }
            window.requestAnimationFrame(render);
        }
        // debugger;

        if(_this.rqa == null){
            _this.rqa = window.requestAnimationFrame(render);
        }

        /****
           * 指定元素出现在页面上之后的行为
        ****/

        function afterShowEvent() {
            let resDom = _this.addNodePNode;// 需要循环的列表父节点
            
            // 优化：拼接一份列表或替换已有的数据列表项
            _this.addOrReplaceTr(resDom, concatList());
        }

        // 监听目标元素是否出现在页面上，从而判定展示下一个列表
        _this.checkIsTouchBot(document.querySelector('.addScroll'), afterShowEvent);
    }
    timer() {
        if (this.resetFlag == this.resetFlagEnd) {
            this.transAdd = this.transAddRecord;
            this.resetFlag = this.resetFlagStart;
        }

        this.resetFlag += 1;
    }
    /****
     *  1.当前数据列表未到设定的循环出现次数时：新增一份数据列表
     *  2.当前数据列表已到设定的循环出现次数时：将数组第一项插入列表项尾部
     * @params concatList ---> 当前需循环渲染的数据列表
     * @params resDom ---> 需要循环的列表父节点
    ****/
    addOrReplaceTr(resDom, concatList) {
        let _this = this;
        let _index = 0;// 数据列表下标初始值
        
        // 数据列表长度
        let targetLength = concatList.length;// 数据列表长度

        if (resDom.children.length - 1 == targetLength * (_this.cycleCount - 1)) {
            _this.transAddRecord = _this.transAdd;
            _this.resetFlagStart = _this.resetFlag;
        }

        if (resDom.children.length - 1 == targetLength * _this.cycleCount) {
            _this.resetFlagEnd = _this.resetFlag;
        }

        while (_index < targetLength) {

            /*** 使用当前长列表子元素数量 是否到达 (当前循环次数 * 数据列表的项数量)，例如设定的循环次数为 3 ，数据量为 7，那么当目前列表中的子元素数量为 21 时，
            后面的循环将不会拼接，而改为 DOM 插入
            */
            if (resDom.children.length > targetLength * _this.cycleCount) {
                // 当最后一次循环列表循环即将结束后,DOM 插入 ...
                let thisList = _this.addNodePNode;

                let insertDom = thisList.children[0];
                let targetDom = thisList.children[thisList.children.length - 1];

                thisList.insertBefore(insertDom, targetDom);
            }
            else {
                if(_this.dataSource.constructor == Array){ // 传入的是数组，拼接数据源
                    // 未到达最大循环次数，拼接数据列表 ...
                    _this.dataSource.push(concatList[_index]);
                }
                else{// 传入的是DOM对象子元素
                    let thisList = _this.addNodePNode;

                    let targetDom = thisList.children[thisList.children.length - 1];

                    // 未到达最大循环次数，拼接列表中的所有子元素至列表尾部 ...
                    thisList.insertBefore(_this.cloneDomList[_index].cloneNode(true),targetDom);
                }
            }

            _index += 1;
        }
    }
    moveScroll(resDom) {
        let _this = this;
        // 目标 DOM 滑动
        resDom.style.transform = `translateY(${_this.transAdd}px)`
        _this.transAdd -= _this.transVal;
    }
    /****
         * 使用 IntersectionObserver 监听传入的元素是否出现在页面上
         * @param resDom --- 监听元素
         * @param callback --- 满足条件的回调函数
         * @param conditionDis --- 取消监听的条件
     ****/
    checkIsTouchBot(resDom, callback, conditionDis) {
        let _this = this;
        let domListen = resDom;

        let ob = new IntersectionObserver(function (entries) {
            const entry = entries[0];
            // // console.log('144 ---> ',entry.isIntersecting);
            if (!entry.isIntersecting) {
                return;
            }
            // 当满足条件时，取消监听
            // if(conditionDis()){
            //     ob.disconnect()
            //     return;
            // }
            callback();

            // ob.disconnect();
            // _this.checkIsTouchBot(document.querySelector('.noHeader > .el-table__body-wrapper > table > tbody > tr:last-child'),callback);
        },
            {
                root: null,
                threshold: 0
            }
        );

        ob.observe(domListen);

        _this.obs = ob;
    }
    stopMove(){
        let _this = this;
        _this.rqaFlag = false;
        window.cancelAnimationFrame(_this.rqa);
    }
    cancelListen(){
        let _this = this;
        _this.obs.disconnect();
    }
}