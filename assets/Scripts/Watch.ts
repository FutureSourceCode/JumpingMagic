import { _decorator, Component, Label } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Watch')
export class Watch extends Component {
    // 场景中的时间显示文本
    @property(Label)
    timeLabel: Label = null!;

    // 计时时间（秒）
    private time: number = 0;
    // 是否运行中
    private isRun: boolean = false;

    // 开始计时
    startBtn() {
        if (this.isRun) return;
        this.isRun = true;
        this.schedule(this.updateTime, 0.01);
    }

    // 暂停计时
    pauseBtn() {
        this.isRun = false;
        this.unschedule(this.updateTime);
    }

    // 重置计时
    resetBtn() {
        this.pauseBtn();
        this.time = 0;
        this.timeLabel.string = "00:00.00";
    }

    // 更新时间显示
    updateTime() {
        this.time += 0.01;

        // 计算分、秒、毫秒
        const minute = Math.floor(this.time / 60).toString().padStart(2, '0');
        const second = Math.floor(this.time % 60).toString().padStart(2, '0');
        const millisecond = Math.floor((this.time * 100) % 100).toString().padStart(2, '0');
        // 更新文本显示
        this.timeLabel.string = `${minute}:${second}.${millisecond}`;
    }

}

