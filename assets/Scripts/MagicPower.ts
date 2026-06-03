import { _decorator, Component, Node, Label, sys } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('MagicPower')
export class MagicPower extends Component {
    // 绑定编辑器里的魔力值显示文本
    public magicLabel: Label = null!;

    // 配置
    private readonly MAX_MAGIC = 10;           // 每日上限10点
    private readonly MAGIC_COST_PER_GAME = 1;  // 每局消耗1点

    // 存储KEY
    private readonly KEY_CURRENT = "magic_current";
    private readonly KEY_LAST_RESET = "magic_last_reset_date";

    onLoad() {
        this.magicLabel = this.node.getComponent(Label);
        // 启动时自动检查是否需要刷新日期
        this.checkAndResetDailyMagic();
        // 更新UI显示
        this.updateMagicLabel();
    }

    /**
     * 检查日期，如果是新的一天 → 重置魔力值为10
     */
    checkAndResetDailyMagic() {
        const today = this.getTodayDateString();
        const lastResetDate = sys.localStorage.getItem(this.KEY_LAST_RESET);

        // 如果是新的一天，重置
        if (lastResetDate !== today) {
            this.setMagic(this.MAX_MAGIC);
            sys.localStorage.setItem(this.KEY_LAST_RESET, today);
        }
    }

    /**
     * 读取当前剩余魔力
     */
    getMagic(): number {
        const val = sys.localStorage.getItem(this.KEY_CURRENT);
        return val ? parseInt(val) : this.MAX_MAGIC;
    }

    /**
     * 设置魔力值（带上下限保护）
     */
    setMagic(value: number) {
        let final = Math.max(0, Math.min(this.MAX_MAGIC, value));
        sys.localStorage.setItem(this.KEY_CURRENT, final.toString());
        this.updateMagicLabel();
    }

    /**
     * 直接设置剩余魔力值
     * @param value 要设置的魔力值（会自动限制在0-MAX_MAGIC范围内）
     */
    setRemainingMagic(value: number) {
        this.setMagic(value);
    }

    /**
     * 消耗 1 点魔力（开始游戏时调用）
     */
    costMagic(): boolean {
        let current = this.getMagic();
        if (current <= 0) return false;

        current -= this.MAGIC_COST_PER_GAME;
        this.setMagic(current);
        return true;
    }

    /**
     * 判断是否可以开始游戏（魔力>0 返回true）
     */
    canPlayGame(): boolean {
        return this.getMagic() > 0;
    }

    /**
     * 更新UI显示：格式 总魔力/剩余魔力
     * 例：10/8
     */
    updateMagicLabel() {
        if (!this.magicLabel) return;
        const current = this.getMagic();
        this.magicLabel.string = `${this.MAX_MAGIC}/${current}`;
    }

    // ====================== 工具方法 ======================

    /**
     * 获取今天日期字符串（用于判断是否跨天）
     * 每天 00:00 自动刷新
     */
    private getTodayDateString(): string {
        const now = new Date();
        return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    }
}