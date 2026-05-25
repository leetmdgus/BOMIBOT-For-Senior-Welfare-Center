import { getClientSession } from "@/lib/auth/session"

/** @deprecated useAuth() 또는 getClientSession() 사용 */
export function getCurrentUser() {
  const session = getClientSession()
  if (!session) {
    return {
      name: "게스트",
      role: "",
      department: "",
    }
  }

  return {
    name: session.name,
    role: session.role,
    department: session.department,
    profileImage: session.profileImage,
  }
}

/** @deprecated getCurrentUser() 사용 */
export const CURRENT_USER = {
  name: "이승현",
  role: "사회복지사",
  department: "운영총괄",
  profileImage: "/이승현_증명사진.jpg",
} as const
