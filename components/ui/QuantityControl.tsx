// components/cart/QuantityControl.tsx
"use client";

import { useCallback } from "react";

type Props = {
  value: number;
  min?: number;
  max?: number;
  onChange: (next: number) => void;
  disabled?: boolean;
};

export default function QuantityControl({
  value,
  min = 1,
  max = 9999,
  onChange,
  disabled,
}: Props) {
  const clamp = useCallback(
    (n: number) => Math.min(max, Math.max(min, n)),
    [min, max]
  );

  const dec = () => !disabled && onChange(clamp(value - 1));
  const inc = () => !disabled && onChange(clamp(value + 1));

  return (
    <div
      className="
        inline-flex items-center justify-center gap-2
        rounded-xl border px-2 py-1
        sm:gap-3 sm:px-3 sm:py-2
        bg-white
      "
      // 画像などの絶対配置がかぶっても押せるように
      style={{ touchAction: "manipulation" }}
    >
      <button
        type="button"
        onClick={dec}
        disabled={disabled || value <= min}
        className="
          inline-flex items-center justify-center
          select-none
          rounded-lg border
          min-w-[44px] min-h-[44px]    /* モバイルHIG準拠 */
          text-xl leading-none
          disabled:opacity-40 disabled:cursor-not-allowed
          active:scale-[0.98]
        "
        aria-label="decrease quantity"
      >
        −
      </button>

      <input
        type="tel"            /* iOSで扱いやすい */
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        onInput={(e) => {
          const v = (e.target as HTMLInputElement).value.replace(/\D/g, "");
          if (v === "") return;
          onChange(clamp(Number(v)));
        }}
        className="
          w-[64px] text-center
          border rounded-lg py-2
          text-base
        "
        aria-label="quantity"
      />

      <button
        type="button"
        onClick={inc}
        disabled={disabled || value >= max}
        className="
          inline-flex items-center justify-center
          select-none
          rounded-lg border
          min-w-[44px] min-h-[44px]
          text-xl leading-none
          disabled:opacity-40 disabled:cursor-not-allowed
          active:scale-[0.98]
        "
        aria-label="increase quantity"
      >
        ＋
      </button>
    </div>
  );
}
