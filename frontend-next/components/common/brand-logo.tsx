import Image from "next/image"
import { cn } from "@/lib/utils"
import { BRAND_LOGO_SRC } from "@/lib/constants/brand"

const sizeStyles = {
  /** 사이드바 접힘 */
  sm: {
    wrap: "rounded-md px-1 py-0.5",
    img: "h-4 w-auto max-w-[2.75rem]",
    width: 44,
    height: 16,
  },
  /** 사이드바 펼침, 설문 헤더 */
  md: {
    wrap: "rounded-md px-1.5 py-1",
    img: "h-6 w-auto max-w-[5.5rem]",
    width: 88,
    height: 24,
  },
  /** 강조 영역 */
  lg: {
    wrap: "rounded-lg px-2 py-1.5",
    img: "h-8 w-auto max-w-[7rem]",
    width: 112,
    height: 32,
  },
  /** 로그인·랜딩 */
  hero: {
    wrap: "rounded-lg px-3 py-2 sm:px-4 sm:py-2.5",
    img: "h-10 w-auto max-w-[min(100%,9rem)] sm:h-11",
    width: 144,
    height: 44,
  },
} as const

export type BrandLogoSize = keyof typeof sizeStyles

type BrandLogoProps = {
  size?: BrandLogoSize
  className?: string
  priority?: boolean
}

/** BOMI 메인 로고 */
export function BrandLogo({
  size = "md",
  className,
  priority = false,
}: BrandLogoProps) {
  const styles = sizeStyles[size]

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center",
        styles.wrap,
        className,
      )}
    >
      <Image
        src={BRAND_LOGO_SRC}
        alt="BOMI"
        width={styles.width}
        height={styles.height}
        className={cn("max-w-full object-contain object-center", styles.img)}
        style={{ width: "auto", height: "auto" }}
        priority={priority}
      />
    </span>
  )
}
