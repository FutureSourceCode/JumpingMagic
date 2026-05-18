import { _decorator, Component, Sprite, SpriteFrame, tween, UIOpacity } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('BgSwitch')
export class BgSwitch extends Component {
    @property([SpriteFrame])
    BgList: SpriteFrame[] = [];

    private index = 0;
    private sprite: Sprite = null!;
    private opacity: UIOpacity = null!;
    private isSwitching = false;

    onLoad() {
        this.sprite = this.getComponent(Sprite)!;
        this.opacity = this.getComponent(UIOpacity)!;
        this.opacity.opacity = 255;

        if (this.BgList.length > 0) {
            this.sprite.spriteFrame = this.BgList[0];
        }
    }

    // 原有的 下一张（按钮绑定用）
    public nextBackground() {
        if (this.isSwitching) return;
        this.isSwitching = true;

        this.index = (this.index + 1) % this.BgList.length;

        tween(this.opacity)
            .to(0.5, { opacity: 0 })
            .call(() => {
                this.sprite.spriteFrame = this.BgList[this.index];
            })
            .to(0.5, { opacity: 255 })
            .call(() => {
                this.isSwitching = false;
            })
            .start();
    }

    // 上一张背景
    public prevBackground() {
        if (this.isSwitching) return;
        this.isSwitching = true;

        this.index = (this.index - 1 + this.BgList.length) % this.BgList.length;

        tween(this.opacity)
            .to(0.2, { opacity: 0 })
            .call(() => {
                this.sprite.spriteFrame = this.BgList[this.index];
            })
            .to(0.2, { opacity: 255 })
            .call(() => {
                this.isSwitching = false;
            })
            .start();
    }


    // 跳转到指定索引的背景
    public goToIndex(targetIndex: number) {
        if (this.isSwitching) return;
        if (targetIndex < 0 || targetIndex >= this.BgList.length) return;

        this.isSwitching = true;
        this.index = targetIndex;

        tween(this.opacity)
            .to(0.2, { opacity: 0 })
            .call(() => {
                this.sprite.spriteFrame = this.BgList[this.index];
            })
            .to(0.2, { opacity: 255 })
            .call(() => {
                this.isSwitching = false;
            })
            .start();
    }

    // 获取当前背景索引
    public getCurrentIndex(): number {
        return this.index;
    }

    // 获取当前背景图片
    public getCurrentSpriteFrame(): SpriteFrame | null {
        if (this.BgList[this.index]) {
            return this.BgList[this.index];
        }
        return null;
    }

    // 获取总背景数量
    public getTotalCount(): number {
        return this.BgList.length;
    }
}