import { _decorator, Component, Label, sys } from 'cc';
const { ccclass, property } = _decorator;

// 记录结构
interface GameRecord {
    maxSteps: number;
    useTime: string;
}

@ccclass('RecordManager')
export class RecordManager extends Component {
    @property(Label)
    recordLabel: Label = null!;

    private readonly RECORD_KEY = "JumpGameRecordData";
    private nowRecord: GameRecord = { maxSteps: 0, useTime: "00:00.00" };

    onLoad() {
        this.loadLocalRecord();
        this.refreshUI();
        //this.clearAllRecord()
    }

    // 微信小游戏本地存储读取
    loadLocalRecord() {
        try {
            const jsonStr = sys.localStorage.getItem(this.RECORD_KEY);
            if (jsonStr) {
                const data = JSON.parse(jsonStr);
                this.nowRecord.maxSteps = data.maxSteps ?? 0;
                this.nowRecord.useTime = data.useTime ?? "00:00.00";
            }
        } catch (err) {
            this.nowRecord = { maxSteps: 0, useTime: "00:00.00" };
        }
    }

    // 刷新界面显示
    refreshUI() {
        if (!this.recordLabel) return;
        this.recordLabel.string = `最高记录：${this.nowRecord.maxSteps}步  最快用时：${this.nowRecord.useTime}`;
    }

    // 时间字符串转总毫秒数 方便比对
    private timeToMs(timeStr: string): number {
        const arr = timeStr.split(":");
        const min = parseInt(arr[0]);
        const secMs = arr[1].split(".");
        const sec = parseInt(secMs[0]);
        const ms = parseInt(secMs[1]);
        return min * 60000 + sec * 1000 + ms;
    }

    /**
     * 死亡后比对更新记录
     * 规则：
     * 1. 当前步数 > 历史步数 → 直接更新
     * 2. 步数相等，当前用时更少 → 更新
     * 3. 都不满足 不更新
     */
    updateRecord(curSteps: number, curTime: string) {
        const oldSteps = this.nowRecord.maxSteps;
        const oldTimeMs = this.timeToMs(this.nowRecord.useTime);
        const curTimeMs = this.timeToMs(curTime);

        let needSave = false;

        if (curSteps > oldSteps) {
            needSave = true;
        } else if (curSteps === oldSteps && curTimeMs < oldTimeMs) {
            needSave = true;
        }

        if (needSave) {
            this.nowRecord.maxSteps = curSteps;
            this.nowRecord.useTime = curTime;
            // 保存到微信本地
            sys.localStorage.setItem(this.RECORD_KEY, JSON.stringify(this.nowRecord));
            console.log("刷新新纪录成功");
        }
        this.refreshUI();
    }

    // 清空记录 测试用
    clearAllRecord() {
        sys.localStorage.removeItem(this.RECORD_KEY);
        this.nowRecord = { maxSteps: 0, useTime: "00:00.00" };
        this.refreshUI();
    }
}