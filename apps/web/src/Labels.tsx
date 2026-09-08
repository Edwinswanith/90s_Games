import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
export function Label({
  text,
  position = [0, 0, 0],
  width = 2,
  color = '#152347',
  background = '#FFF4DD',
  height = 0.45,
}: {
  text: string;
  position?: [number, number, number];
  width?: number;
  color?: string;
  background?: string;
  height?: number;
}) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 112;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = background;
    ctx.beginPath();
    ctx.roundRect(3, 5, 506, 102, 24);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let size = 44;
    do {
      ctx.font = `700 ${size--}px "Nunito Sans", "Noto Sans Tamil", sans-serif`;
    } while (ctx.measureText(text).width > 460 && size > 15);
    ctx.fillText(text, 256, 58);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [text, color, background]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <sprite position={position} scale={[width, height, 1]}>
      <spriteMaterial map={texture} transparent depthTest={false} toneMapped={false} />
    </sprite>
  );
}
