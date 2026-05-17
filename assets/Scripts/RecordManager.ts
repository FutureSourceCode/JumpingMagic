import { _decorator, Component, Label } from 'cc';
const { ccclass, property } = _decorator;

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
        this.refreshShow();
    }

    // 读取本地记录
    loadLocalRecord() {
        const saveStr = localStorage.getItem(this.RECORD_KEY);
        if (saveStr) {
            try {
                this.nowRecord = JSON.parse(saveStr);
            } catch (e) {
                this.nowRecord = { maxSteps: 0, useTime: "00:00.00" };
            }
        }
    }

    // 刷新UI显示
    refreshShow() {
        if (!this.recordLabel) return;
        this.recordLabel.string = `最高记录：${this.nowRecord.maxSteps}步  用时：${this.nowRecord.useTime}`;
    }

    // 对比并保存新记录
    saveNewRecord(curStep: number, curTime: string) {
        if (curStep > this.nowRecord.maxSteps) {
            this.nowRecord.maxSteps = curStep;
            this.nowRecord.useTime = curTime;
            localStorage.setItem(this.RECORD_KEY, JSON.stringify(this.nowRecord));
        }
        this.refreshShow();
    }

    //清除数据
    // protected start(): void {
    //     this.node.clearAllRecord();
    // }

}