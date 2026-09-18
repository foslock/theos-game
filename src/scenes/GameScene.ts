import Phaser from 'phaser';
import { FADE_MS, GAME_WIDTH, SCENE_HEIGHT, WALK_SPEED } from '../config';
import { getRoom, type Exit, type Hotspot, type Room, type PickupHotspot, type ContainerHotspot, type DecorationHotspot, type Rect, type Pt } from '../data/rooms';
import { findExit } from '../data/graph';
import { ITEMS, type ItemId } from '../data/items';
import { addItem, FLAGS, getFlag, isPickedUp, markPickedUp, setFlag, type GameState } from '../state/GameState';
import { store } from '../state/Store';
import { evaluate } from '../systems/Conditions';
import { Character } from '../systems/Walker';
import { Dialogue } from '../systems/Dialogue';
import { AmbientBackground } from '../systems/Ambient';
import { HintTimer, hintLine } from '../systems/Hints';
import { DitherFade } from '../systems/DitherFade';
import { buildWalkMap, findPath, type WalkMap } from '../systems/Pathfind';
import { arrowCursor, setCursor, type CursorKind } from '../systems/Cursor';
import { playSfx, unlockAudio } from '../systems/Sfx';
import { BreakfastController } from '../puzzles/BreakfastController';

const LUCY_FOLLOW_GAP = 56;
const LUCY_FOLLOW_DY = 6;
const LUCY_FOLLOW_DELAY_MS = 150;
const LUCY_RUN_SPEED = WALK_SPEED * 1.7;

/** Renders whichever room the store says we are in, and runs all point-and-click interaction. */
export class GameScene extends Phaser.Scene {
  theo!: Character;
  lucy: Character | null = null;
  dialogue!: Dialogue;

  private room!: Room;
  private roomObjects: Phaser.GameObjects.GameObject[] = [];
  private ambient?: AmbientBackground;
  private hints!: HintTimer;
  private walkMap!: WalkMap;
  private fade!: DitherFade;
  private breakfast!: BreakfastController;
  private pickupSprites = new Map<string, Phaser.GameObjects.Image>();
  /** Hidden pickups still to be found, by hotspot id, so hints can glint their hiding place. */
  private hiddenPickups = new Map<string, Rect>();
  /** Containers already opened this visit, so the open flash only plays once each. */
  private openedContainers = new Set<string>();
  private _busy = false;
  /** Cursor the pointer would show if nothing were happening (what it is hovering). */
  private hoverKind: CursorKind = 'default';

  /** While busy (walking, talking, changing rooms) clicks are ignored and the cursor is a faded watch. */
  private get busy(): boolean {
    return this._busy;
  }
  private set busy(value: boolean) {
    this._busy = value;
    setCursor(this, value ? 'wait' : this.hoverKind);
  }

  constructor() {
    super('Game');
  }

  create(data: { wakeUp?: boolean } = {}): void {
    this.dialogue = new Dialogue(this);
    this.breakfast = new BreakfastController(this);
    this.fade = new DitherFade(this, GAME_WIDTH, SCENE_HEIGHT);
    this.fade.setBlack();
    this.hints = new HintTimer(
      this,
      () => this.showHints(false),
      () => this.showHints(true),
    );
    const s = store.get();
    this.room = getRoom(s.currentRoom);
    const wake = !!data.wakeUp && this.room.id === 'bedroom' && ['theo_front', 'theo_asleep', 'theo_sitting'].every((k) => this.textures.exists(k));
    // In the wake-up intro the HUD (and its backpack prompt) waits until Theo is out of bed.
    if (!wake) this.scene.launch('Hud');
    this.buildRoom();

    const entryExit = s.previousRoom ? findExit(this.room.id, s.previousRoom) : undefined;
    const spawn = entryExit?.walkTo ?? this.room.restPoint;
    this.theo = new Character(this, 'theo', spawn.x, spawn.y);
    if (s.lucyJoined) {
      const dir = Math.sign(this.room.restPoint.x - spawn.x) || 1;
      this.lucy = new Character(this, 'lucy', Phaser.Math.Clamp(spawn.x - dir * LUCY_FOLLOW_GAP, 16, 624), spawn.y + LUCY_FOLLOW_DY);
    }

    this.input.on('pointerdown', () => unlockAudio());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());

    if (wake) {
      void this.wakeUp();
    } else {
      void this.fade.in(FADE_MS);
      void this.enterRoom(!!entryExit);
    }
  }

  // ---------- New-game intro: Theo wakes up in bed ----------

  /**
   * The room fades in slowly with Theo asleep in bed. He sits up and yawns, then waits for
   * a click anywhere before hopping out and walking to his usual spot.
   */
  private async wakeUp(): Promise<void> {
    this.busy = true;
    this.theo.sprite.setVisible(false);
    const bg = `${this.room.background}_0`;
    // The footboard is drawn again above the sleeper so his body reads as tucked in behind it.
    const footboard = this.add.image(0, 0, bg).setOrigin(0).setDepth(260).setCrop(120, 190, 120, 122);
    const asleep = this.add.image(176, 191, 'theo_asleep').setOrigin(0).setDepth(255);
    this.roomObjects.push(footboard, asleep);

    void this.fade.in(2600);
    await this.wait(3400);
    // A little stir under the covers, then he sits up and yawns.
    await this.tween(asleep, { y: 193 }, 220);
    await this.tween(asleep, { y: 191 }, 220);
    await this.wait(300);
    asleep.destroy();
    const sitting = this.add.image(222, 198, 'theo_sitting').setOrigin(0).setDepth(255);
    this.roomObjects.push(sitting);
    await this.tween(sitting, { y: 188 }, 320, 'Back.easeOut');
    playSfx('ding');
    void this.dialogue.say('*yaaawn* Good morning!', 254, 180, { duration: 60000 });
    await new Promise<void>((resolve) => this.input.once('pointerdown', () => resolve()));
    this.dialogue.clear();
    // Swing his legs out and hop down onto the carpet, then hand over to the walking sprite.
    sitting.destroy();
    const stander = this.add.image(262, 300, 'theo_front').setOrigin(0.5, 1).setDepth(255);
    this.roomObjects.push(stander);
    await this.tween(stander, { x: 300, y: 288 }, 200, 'Quad.easeOut');
    await this.tween(stander, { y: 342 }, 200, 'Quad.easeIn');
    stander.destroy();
    footboard.destroy();
    this.roomObjects = this.roomObjects.filter((o) => o !== stander && o !== footboard && o !== asleep && o !== sitting);
    this.theo.setPosition(300, 342);
    this.theo.sprite.setVisible(true);
    playSfx('step');
    this.scene.launch('Hud');
    this.busy = false;
    await this.enterRoom(true);
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => this.time.delayedCall(ms, resolve));
  }

  private tween(target: Phaser.GameObjects.GameObject, props: Record<string, number>, duration: number, ease = 'Sine.easeInOut'): Promise<void> {
    return new Promise((resolve) => this.tweens.add({ targets: target, ...props, duration, ease, onComplete: () => resolve() }));
  }

  // ---------- Room lifecycle ----------

  private buildRoom(): void {
    this.walkMap = buildWalkMap(this.room);
    this.ambient = new AmbientBackground(this, this.room);
    const state = store.get();

    for (const exit of this.room.exits) this.addExitZone(exit);
    for (const h of this.room.hotspots) this.addHotspot(h, state);
    if (this.room.id === 'kitchen') {
      for (const id of this.breakfast.ensureState().opened) this.showContainerOpen(id, true);
    }
  }

  private clearRoom(): void {
    this.dialogue.clear();
    this.ambient?.destroy();
    this.ambient = undefined;
    for (const o of this.roomObjects) o.destroy();
    this.roomObjects = [];
    this.pickupSprites.clear();
    this.hiddenPickups.clear();
    this.openedContainers.clear();
  }

  private teardown(): void {
    this.hints.stop();
    this.fade.destroy();
    this.clearRoom();
    this.theo?.destroy();
    this.lucy?.destroy();
    this.lucy = null;
    setCursor(this, 'default');
  }

  private async enterRoom(walkIn: boolean): Promise<void> {
    this.busy = true;
    if (walkIn) await this.moveParty(this.room.restPoint);
    else this.placeParty(this.room.restPoint);

    if (this.room.id === 'kitchen' && !store.get().lucyJoined) {
      store.update((s) => (s.lucyJoined = true));
      const lp = this.room.lucyRestPoint ?? this.room.restPoint;
      // Lucy comes running in from the family room doorway to meet him.
      const door = this.room.exits.find((e) => e.to === 'family_room')?.walkTo ?? { x: GAME_WIDTH, y: lp.y };
      this.lucy = new Character(this, 'lucy', GAME_WIDTH + 24, door.y);
      this.lucy.face(-1);
      await this.wait(400);
      await this.lucy.walkPath([{ x: door.x, y: door.y }, ...findPath(this.walkMap, door, lp)], true, LUCY_RUN_SPEED);
      this.lucy.face(this.theo.x - lp.x);
      this.breakfast.ensureState();
      await this.sayLucy("Theo! I'm sooo hungry. Can you make breakfast?");
      await this.sayTheo('Sure, Lucy! I just need to find a bowl, a spoon, cereal and milk.');
    }
    this.busy = false;
    this.hints.reset();
  }

  private placeParty(p: Pt): void {
    this.theo.setPosition(p.x, p.y);
    if (this.lucy) {
      const lp = this.lucyTarget(p);
      this.lucy.setPosition(lp.x, lp.y);
      this.lucy.face(this.theo.x - lp.x);
    }
  }

  /** Where Lucy should stand for a given Theo target: her own rest spot, or just behind him along the walk direction. */
  private lucyTarget(p: Pt, from: Pt = this.theo): Pt {
    if (this.room.lucyRestPoint && p === this.room.restPoint) return this.room.lucyRestPoint;
    const dir = Math.sign(p.x - from.x) || -1;
    const x = Phaser.Math.Clamp(p.x - dir * LUCY_FOLLOW_GAP, 16, 624);
    return { x, y: p.y + LUCY_FOLLOW_DY };
  }

  /** Theo and Lucy walk together; Lucy sets off a beat later so she reads as following him. */
  private async moveParty(p: Pt): Promise<void> {
    const lp = this.lucyTarget(p);
    const lucyWalk = this.lucy
      ? new Promise<void>((resolve) => {
          this.time.delayedCall(LUCY_FOLLOW_DELAY_MS, () => {
            if (!this.lucy) return resolve();
            void this.lucy.walkPath(findPath(this.walkMap, this.lucy, lp), false).then(resolve);
          });
        })
      : Promise.resolve();
    await Promise.all([this.theo.walkPath(findPath(this.walkMap, this.theo, p)), lucyWalk]);
    this.lucy?.face(this.theo.x - this.lucy.x);
  }

  // ---------- Zones ----------

  private zone(r: Rect): Phaser.GameObjects.Zone {
    const z = this.add.zone(r.x, r.y, r.w, r.h).setOrigin(0).setInteractive();
    this.roomObjects.push(z);
    return z;
  }

  /** Drops a click zone once its object is gone, clearing the hover cursor if the pointer is still on it. */
  private removeZone(z: Phaser.GameObjects.Zone): void {
    this.roomObjects = this.roomObjects.filter((o) => o !== z);
    z.destroy();
    this.hoverKind = 'default';
    if (!this.busy) setCursor(this, 'default');
  }

  private hover(z: Phaser.GameObjects.Zone, kind: () => CursorKind): void {
    z.on('pointerover', () => {
      this.hoverKind = kind();
      if (!this.busy) setCursor(this, this.hoverKind);
    });
    z.on('pointerout', () => {
      this.hoverKind = 'default';
      if (!this.busy) setCursor(this, 'default');
    });
  }

  private addExitZone(exit: Exit): void {
    const z = this.zone(exit.zone);
    this.hover(z, () => arrowCursor(exit.direction, !evaluate(exit.condition, store.get())));
    z.on('pointerdown', () => void this.useExit(exit));
  }

  private addHotspot(h: Hotspot, state: GameState): void {
    switch (h.kind) {
      case 'pickup':
        if (isPickedUp(state, this.room.id, h.id)) return;
        if (h.hiddenUntilFlag && !getFlag(state, h.hiddenUntilFlag)) return;
        this.addPickup(h);
        break;
      case 'backpack':
        if (getFlag(state, FLAGS.hasBackpack)) return;
        this.addBackpack(h);
        break;
      case 'container':
        this.addContainer(h);
        break;
      case 'decoration':
        this.addDecoration(h);
        break;
      case 'talk': {
        const z = this.zone(h.zone);
        this.hover(z, () => 'talk');
        z.on('pointerdown', () => void this.interact(h.walkTo, () => this.talk(h.id)));
        break;
      }
    }
  }

  private addPickup(h: PickupHotspot): void {
    if (h.hidden) {
      this.hiddenPickups.set(h.id, h.zone);
    } else {
      const img = this.add.image(h.zone.x + h.zone.w / 2, h.zone.y + h.zone.h / 2, `item_${h.item}`).setDepth(h.zone.y + h.zone.h);
      this.roomObjects.push(img);
      this.pickupSprites.set(h.id, img);
    }
    const z = this.zone(h.zone);
    this.hover(z, () => 'hand');
    z.on('pointerdown', () => void this.interact(h.walkTo, () => this.pickUp(h, z)));
  }

  private addBackpack(h: Extract<Hotspot, { kind: 'backpack' }>): void {
    const img = this.add.image(h.zone.x + h.zone.w / 2, h.zone.y + h.zone.h / 2, 'backpack').setDepth(h.zone.y + h.zone.h);
    this.roomObjects.push(img);
    this.pickupSprites.set(h.id, img);
    const z = this.zone(h.zone);
    this.hover(z, () => 'hand');
    z.on('pointerdown', () =>
      void this.interact(h.walkTo, async () => {
        if (getFlag(store.get(), FLAGS.hasBackpack)) return;
        this.hints.reset();
        img.destroy();
        this.pickupSprites.delete(h.id);
        this.removeZone(z);
        store.update((s) => setFlag(s, FLAGS.hasBackpack));
        playSfx('success');
        await this.sayTheo('My backpack! Now I can carry things with me.');
      }),
    );
  }

  private addContainer(h: ContainerHotspot): void {
    const z = this.zone(h.zone);
    this.hover(z, () => 'hand');
    z.on('pointerdown', () =>
      void this.interact(h.walkTo, async () => {
        this.hints.reset();
        await this.breakfast.openContainer(h);
      }),
    );
  }

  private addDecoration(h: DecorationHotspot): void {
    const z = this.zone(h.zone);
    this.hover(z, () => 'look');
    const flash = this.add.rectangle(h.zone.x, h.zone.y, h.zone.w, h.zone.h, 0xffffff, 0).setOrigin(0).setDepth(1);
    this.roomObjects.push(flash);
    z.on('pointerdown', () => {
      if (this.busy) return;
      unlockAudio();
      playSfx(h.sfx ?? 'click');
      this.tweens.add({ targets: flash, fillAlpha: 0.45, duration: 80, yoyo: true, repeat: 1 });
      if (h.lines?.length) void this.sayTheo(Phaser.Utils.Array.GetRandom(h.lines));
    });
  }

  // ---------- Interactions ----------

  /** Walks Theo to `walkTo` (if given) then runs `action`, blocking other interactions meanwhile. */
  private async interact(walkTo: Pt | undefined, action: () => Promise<void> | void): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    unlockAudio();
    this.dialogue.clear();
    try {
      if (walkTo) await this.theo.walkPath(findPath(this.walkMap, this.theo, walkTo));
      await action();
    } finally {
      this.busy = false;
    }
  }

  private async pickUp(h: PickupHotspot, zone: Phaser.GameObjects.Zone): Promise<void> {
    if (isPickedUp(store.get(), this.room.id, h.id)) return;
    if (!evaluate(h.condition, store.get())) {
      playSfx('locked');
      await this.sayTheo(h.refusalComment ?? "I can't take that yet.");
      return;
    }
    this.hints.reset();
    const img = this.pickupSprites.get(h.id);
    if (img) await this.popImage(img);
    else await this.popItem(h.item, h.zone.x + h.zone.w / 2, h.zone.y + h.zone.h / 2);
    store.update((s) => {
      addItem(s, h.item);
      markPickedUp(s, this.room.id, h.id);
    });
    this.pickupSprites.delete(h.id);
    this.hiddenPickups.delete(h.id);
    this.removeZone(zone);
    playSfx('pickup');
    await this.sayTheo(h.foundComment ?? `Got the ${ITEMS[h.item].name.toLowerCase()}!`);
  }

  private async talk(id: string): Promise<void> {
    if (id === 'lucy' && this.room.id === 'kitchen') {
      this.lucy?.face(this.theo.x - this.lucy.x);
      await this.breakfast.talkToLucy();
    }
  }

  private async useExit(exit: Exit): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    unlockAudio();
    this.dialogue.clear();
    try {
      if (!evaluate(exit.condition, store.get())) {
        // Locked: no walking over, just a glance that way and the excuse.
        this.theo.face(exit.walkTo.x - this.theo.x);
        playSfx('locked');
        await this.sayTheo(exit.lockedComment ?? "I can't go that way yet.");
        return;
      }
      await this.moveParty(exit.walkTo);
      this.hints.stop();
      this.hoverKind = 'default';
      await this.fadeOut();
      const from = this.room.id;
      store.update((s) => {
        s.previousRoom = from;
        s.currentRoom = exit.to;
      });
      this.clearRoom();
      this.room = getRoom(exit.to);
      this.buildRoom();
      const back = findExit(this.room.id, from);
      const spawn = back?.walkTo ?? this.room.restPoint;
      this.theo.setPosition(spawn.x, spawn.y);
      if (this.lucy) {
        // Lucy starts behind Theo relative to the direction they will walk in.
        const dir = Math.sign(this.room.restPoint.x - spawn.x) || 1;
        this.lucy.setPosition(Phaser.Math.Clamp(spawn.x - dir * LUCY_FOLLOW_GAP, 16, 624), spawn.y + LUCY_FOLLOW_DY);
      }
      void this.fade.in(FADE_MS);
      this.busy = false;
      await this.enterRoom(true);
    } finally {
      this.busy = false;
    }
  }

  private fadeOut(): Promise<void> {
    return this.fade.out(FADE_MS);
  }

  // ---------- Presentation helpers used by controllers ----------

  sayTheo(text: string): Promise<void> {
    return this.dialogue.say(text, this.theo.x, this.theo.y - this.theo.sprite.displayHeight);
  }

  sayLucy(text: string): Promise<void> {
    const who = this.lucy ?? this.theo;
    return this.dialogue.say(text, who.x, who.y - who.sprite.displayHeight, { fill: 0xffe3f0 });
  }

  /** Marks a container as opened. No lasting overlay is drawn; a quick flash gives the feedback. */
  showContainerOpen(id: string, silent = false): void {
    if (this.openedContainers.has(id)) return;
    this.openedContainers.add(id);
    if (silent) return;
    const c = this.room.hotspots.find((h): h is ContainerHotspot => h.kind === 'container' && h.id === id);
    if (!c) return;
    const flash = this.add.rectangle(c.zone.x, c.zone.y, c.zone.w, c.zone.h, 0xffffff, 0.5).setOrigin(0).setDepth(1);
    this.roomObjects.push(flash);
    this.tweens.add({ targets: flash, fillAlpha: 0, duration: 220, onComplete: () => flash.destroy() });
  }

  /** Shows an item rising out of a container and flying to the backpack. */
  async popItem(item: ItemId, x: number, y: number): Promise<void> {
    const img = this.add.image(x, y, `item_${item}`).setDepth(900).setScale(0.5);
    await new Promise<void>((resolve) => {
      this.tweens.add({ targets: img, y: y - 30, scale: 1.4, duration: 250, ease: 'Back.easeOut', onComplete: () => resolve() });
    });
    await this.popImage(img);
  }

  private popImage(img: Phaser.GameObjects.Image): Promise<void> {
    return new Promise((resolve) => {
      this.tweens.add({
        targets: img,
        x: 40,
        y: SCENE_HEIGHT + 40,
        scale: 0.3,
        alpha: 0.6,
        duration: 320,
        ease: 'Quad.easeIn',
        onComplete: () => {
          img.destroy();
          resolve();
        },
      });
    });
  }

  /**
   * Glints the things the player still needs, each at a random spot on the object so the
   * sparkle never lands in the same place twice. With `speak`, Theo also says a hint.
   */
  private showHints(speak: boolean): void {
    const state = store.get();
    const targets: Rect[] = [];
    for (const [, img] of this.pickupSprites) {
      targets.push({ x: img.x - img.displayWidth / 2, y: img.y - img.displayHeight / 2, w: img.displayWidth, h: img.displayHeight });
    }
    for (const [, zone] of this.hiddenPickups) targets.push(zone);
    if (this.room.id === 'kitchen' && !getFlag(state, FLAGS.breakfastDone)) {
      const b = this.breakfast.ensureState();
      for (const h of this.room.hotspots) {
        if (h.kind === 'container' && b.placements[h.id]?.type === 'item' && !isPickedUp(state, 'kitchen', h.id)) {
          targets.push(h.zone);
        }
      }
    }
    for (const t of targets) {
      const inset = 4;
      const x = Phaser.Math.Between(t.x + inset, Math.max(t.x + inset, t.x + t.w - inset));
      const y = Phaser.Math.Between(t.y + inset, Math.max(t.y + inset, t.y + t.h - inset));
      const g = this.add.image(x, y, 'glint').setDepth(950).setScale(0);
      this.roomObjects.push(g);
      this.tweens.add({ targets: g, scale: 1.3, angle: 90, duration: 350, yoyo: true, repeat: 3, onComplete: () => g.destroy() });
    }
    if (!speak) return;
    const line = hintLine(this.room, state);
    if (line && !this.busy) void this.sayTheo(line);
  }
}
