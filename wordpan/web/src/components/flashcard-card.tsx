import { useState } from "react";
import { cn } from "@/lib/utils";

interface FlashcardCardProps {
  front: string;
  back: string;
  isFlipped?: boolean;
  onFlip?: (flipped: boolean) => void;
  className?: string;
}

export function FlashcardCard({
  front,
  back,
  isFlipped: controlledFlipped,
  onFlip,
  className,
}: FlashcardCardProps) {
  const [isFlipped, setIsFlipped] = useState(controlledFlipped ?? false);

  const handleFlip = () => {
    const newFlipped = !isFlipped;
    setIsFlipped(newFlipped);
    onFlip?.(newFlipped);
  };

  return (
    <div
      className={cn(
        "relative w-full h-64 cursor-pointer perspective",
        className
      )}
      onClick={handleFlip}
      style={{
        perspective: "1000px",
      }}
    >
      {/* Card container with 3D perspective */}
      <div
        className="relative w-full h-full transition-transform duration-500"
        style={{
          transformStyle: "preserve-3d",
          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* Front of card */}
        <div
          className={cn(
            "absolute w-full h-full flex items-center justify-center rounded-lg border-2 border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 p-6 text-center",
            "shadow-md hover:shadow-lg transition-shadow"
          )}
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
          }}
        >
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm font-medium text-muted-foreground">Front</p>
            <p className="text-2xl font-bold text-foreground break-words">
              {front}
            </p>
          </div>
        </div>

        {/* Back of card */}
        <div
          className={cn(
            "absolute w-full h-full flex items-center justify-center rounded-lg border-2 border-secondary/20 bg-gradient-to-br from-secondary/10 to-secondary/5 p-6 text-center",
            "shadow-md hover:shadow-lg transition-shadow"
          )}
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm font-medium text-muted-foreground">Back</p>
            <p className="text-lg text-foreground break-words">
              {back}
            </p>
          </div>
        </div>
      </div>

      {/* Click hint */}
      <div className="absolute bottom-2 right-2 text-xs text-muted-foreground pointer-events-none">
        Click to flip
      </div>
    </div>
  );
}
