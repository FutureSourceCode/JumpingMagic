import { _decorator, Component, Label, sys } from 'cc';
const { ccclass, property } = _decorator;

interface GameRecord {
    maxSteps: number;
    useTime: string;
}

@ccclass('RecordManager')
export class RecordManager extends Component {
    @property(Label)
    recordLabel: Label = null!;

    private readonly RECORD_KEY = "JumpGameRecord";
    private nowRecord: GameRecord = { maxSteps: 0, useTime: "00:00.00" };

    onLoad() {
        this.loadRecord();
        this.showRecord();
    }

    // 读取记录（微信专用）
    loadRecord() {
        try {
            const data = sys.localStorage.getItem(this.RECORD_KEY);
            if (data) {
                const record = JSON.parse(data);
                this.nowRecord.maxSteps = record.maxSteps || 0;
                this.nowRecord.useTime = record.useTime || "00:00.00";
            }
        } catch (e) {
            this.nowRecord = { maxSteps: 0, useTime: "00:00.00" };
        }
    }

    // 显示到UI
    showRecord() {
        if (!this.recordLabel) return;
        this.recordLabel.string = `最高记录：${this.nowRecord.maxSteps}步  ${this.nowRecord.useTime}`;
    }

    // 死亡时调用：判断是否刷新记录
    updateRecord(curStep: number, curTime: string) {
        console.log("当前步数:", curStep, "历史最高:", this.nowRecord.maxSteps);

        // 只有超过才更新
        if (curStep > this.nowRecord.maxSteps) {
            this.nowRecord.maxSteps = curStep;
            this.nowRecord.useTime = curTime;

            // 保存到微信本地存储
            try {
                sys.localStorage.setItem(this.RECORD_KEY, JSON.stringify(this.nowRecord));
                console.log("✅ 新记录已保存！");
            } catch (e) {
                console.error("保存失败", e);
            }
        }

        // 每次死亡都刷新显示
        this.showRecord();
    }

    // 清空记录（测试用）
    clearRecord() {
        sys.localStorage.removeItem(this.RECORD_KEY);
        this.nowRecord = { maxSteps: 0, useTime: "00:00.00" };
        this.showRecord();
        console.log("🧹 记录已清空");
    }
}