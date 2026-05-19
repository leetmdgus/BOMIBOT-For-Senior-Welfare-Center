import { Department } from "@/services/organization.types"

export const departmentsData: Department[] = [
  {
    id: "all",
    name: "전체 직원",
    count: 30,
    employees: [],
  },
  {
    id: "management",
    name: "운영총괄",
    count: 3,
    employees: [
      {
        id: "emp1",
        name: "최기원",
        role: "관장",
        position: "관장",
        department: "운영총괄",
        email: "choi@welfare.org",
        phone: "010-1234-5678",
        joinDate: "2020-03-15",
        tenure: "6년 2개월",
        lastLogin: "2026-05-11 09:30",
      },
    ],
  },
]