import Image from "next/image";
import { BurgerMark } from "@/components/brand/burger-mark";

type ProductVisualProps = {
  imageUrl: string | null;
  alt: string;
  priority?: boolean;
  sizes: string;
  className?: string;
  twinkle?: boolean;
};

/**
 * Foto real del producto si el administrador la subió; si no, la hamburguesa del logo
 * como ilustración provisional (nunca se presenta como fotografía).
 * Se reemplaza en el panel: Productos → editar → Foto.
 */
export function ProductVisual({ imageUrl, alt, priority, sizes, className, twinkle }: ProductVisualProps) {
  if (imageUrl) {
    return (
      <div className={`relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-room-2 ${className ?? ""}`}>
        <Image src={imageUrl} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" />
      </div>
    );
  }
  return (
    <div className={`grid aspect-square place-items-center ${className ?? ""}`}>
      <BurgerMark className="h-auto w-[94%] text-mustard" twinkle={twinkle} title={alt ? `Ilustración: ${alt}` : undefined} />
    </div>
  );
}
