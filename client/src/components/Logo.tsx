import { Mic } from "lucide-react";

export default function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const box = size === "lg" ? "h-11 w-11" : size === "sm" ? "h-8 w-8" : "h-9 w-9";
  const icon = size === "lg" ? 22 : size === "sm" ? 15 : 18;
  const text = size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-xl";

  return (
    <div className="flex items-center gap-2.5">
      <div
        className={`${box} flex items-center justify-center rounded-xl bg-linear-to-br from-blue-500 to-violet-500 text-white shadow-lg shadow-blue-600/30`}
      >
        <Mic size={icon} />
      </div>
      <span className={`${text} font-bold tracking-tight text-fg`}>
        PrepMentor
      </span>
    </div>
  );
}
