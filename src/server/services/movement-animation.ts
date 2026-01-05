import 'server-only';

/**
 * エージェントの滑らかな移動アニメーションを管理
 * 
 * 瞬間移動ではなく、位置を少しずつ更新する
 */

interface MovementTask {
  agentId: string;
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
  startTime: number;
  duration: number; // ミリ秒
}

const activeMov ements: Map<string, MovementTask> = new Map();

/**
 * エージェントを目的地まで滑らかに移動させる
 * 
 * @param agentId エージェントID
 * @param from 開始位置
 * @param to 目的地
 * @param duration 移動時間（ミリ秒）
 * @param onUpdate 位置更新コールバック
 */
export function startSmoothMovement(
  agentId: string,
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  duration: number,
  onUpdate: (position: { lat: number; lng: number }) => void
): void {
  const movement: MovementTask = {
    agentId,
    from,
    to,
    startTime: Date.now(),
    duration,
  };

  activeMovements.set(agentId, movement);

  // アニメーションループ
  const animate = () => {
    const elapsed = Date.now() - movement.startTime;
    const progress = Math.min(elapsed / movement.duration, 1.0);

    // Easing function (easeInOutCubic)
    const eased =
      progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

    // 現在位置を計算
    const currentLat = movement.from.lat + (movement.to.lat - movement.from.lat) * eased;
    const currentLng = movement.from.lng + (movement.to.lng - movement.from.lng) * eased;

    onUpdate({ lat: currentLat, lng: currentLng });

    // まだ移動中なら継続
    if (progress < 1.0) {
      setTimeout(animate, 50); // 20 FPS
    } else {
      activeMovements.delete(agentId);
    }
  };

  animate();
}

/**
 * エージェントの移動を停止
 */
export function stopMovement(agentId: string): void {
  activeMovements.delete(agentId);
}

/**
 * 全ての移動を停止
 */
export function stopAllMovements(): void {
  activeMovements.clear();
}

